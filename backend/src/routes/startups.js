const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { researchStartup } = require('../services/searchService');
const companyImport = require('../services/companyImport');

const prisma = new PrismaClient();
const router = express.Router();

// GET /api/startups - List with filters & pagination
router.get('/', async (req, res, next) => {
  try {
    const querySchema = z.object({
      q: z.string().optional(),
      industry: z.string().optional(),
      country: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      sort: z.enum(['lifetime', 'funding', 'users', 'name']).optional().default('name'),
      order: z.enum(['asc', 'desc']).optional().default('asc'),
      page: z.coerce.number().int().min(1).optional().default(1),
      limit: z.coerce.number().int().min(1).max(100).optional().default(24),
    });

    const params = querySchema.parse(req.query);
    const skip = (params.page - 1) * params.limit;

    const where = {};
    if (params.status) {
      where.status = params.status;
    } else {
      where.status = 'failed';
    }

    if (params.industry) {
      const words = params.industry.split(/[\/\s]+/).filter(w => w.length > 2);
      if (words.length > 0) {
        where.OR = [
          ...(where.OR || []),
          ...words.map(w => ({ industry: { contains: w, mode: 'insensitive' } }))
        ];
      }
    }

    if (params.country) {
      where.country = { contains: params.country, mode: 'insensitive' };
    }

    if (params.category) {
      where.failureReasons = { some: { category: { contains: params.category, mode: 'insensitive' } } };
    }

    if (params.q) {
      where.OR = [
        ...(where.OR || []),
        { name: { contains: params.q, mode: 'insensitive' } },
        { summary: { contains: params.q, mode: 'insensitive' } },
        { industry: { contains: params.q, mode: 'insensitive' } },
      ];
    }

    const orderByMap = {
      lifetime: { lifetimeMonths: params.order },
      funding: { fundingInr: params.order },
      users: { peakUsers: params.order },
      name: { name: params.order },
    };

    const [data, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: orderByMap[params.sort] || { name: 'asc' },
        include: {
          failureReasons: { where: { isPrimary: true }, take: 1 },
          _count: { select: { timelineEvents: true } },
        },
      }),
      prisma.company.count({ where }),
    ]);

    res.json({
      data: data.map(s => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        status: s.status,
        industry: s.industry,
        country: s.country,
        foundingYear: s.foundingYear,
        shutdownYear: s.shutdownYear,
        fundingInr: s.fundingInr?.toString(),
        fundingUsd: s.fundingUsd?.toString(),
        peakUsers: s.peakUsers,
        lifetimeMonths: s.lifetimeMonths,
        teamSize: s.teamSize,
        summary: s.summary,
        logoUrl: s.logoUrl,
        topFailureReason: s.failureReasons[0]?.category || null,
        timelineEventsCount: s._count.timelineEvents,
      })),
      total,
      page: params.page,
      limit: params.limit,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', code: 'VALIDATION_ERROR', details: err.errors });
    }
    next(err);
  }
});

// GET /api/startups/:slug - Full postmortem data (auto-enriches from SEC/web if not found)
router.get('/:slug', async (req, res, next) => {
  try {
    let startup = await prisma.company.findUnique({
      where: { slug: req.params.slug },
      include: {
        failureReasons: { orderBy: { severityScore: 'desc' } },
        timelineEvents: { orderBy: { eventDate: 'asc' } },
        metricsSnapshots: { orderBy: { recordedMonth: 'asc' } },
        aiAnalyses: true,
        founders: true,
        articles: true,
        lessons: true,
      },
    });

    // Auto-enrich: if the company doesn't exist, trigger background import
    // and return a 202 Accepted with enriching status so the frontend can poll.
    if (!startup) {
      // Fallback: check if there is a completed import job for this slug/query
      const dedupeKey = req.params.slug.toLowerCase().trim();
      const job = await prisma.companyImportJob.findFirst({
        where: {
          OR: [
            { dedupeKey },
            { query: { equals: req.params.slug, mode: 'insensitive' } }
          ]
        },
        include: {
          company: {
            include: {
              failureReasons: { orderBy: { severityScore: 'desc' } },
              timelineEvents: { orderBy: { eventDate: 'asc' } },
              metricsSnapshots: { orderBy: { recordedMonth: 'asc' } },
              aiAnalyses: true,
              founders: true,
              articles: true,
              lessons: true,
            }
          }
        }
      });

      if (job && job.company && job.status === 'READY') {
        startup = job.company;
      } else if (job && (job.status === 'PROCESSING' || job.status === 'UPDATING')) {
        return res.status(202).json({
          enriching: true,
          slug: req.params.slug,
          message: 'Company import is already processing. Poll again soon.',
          code: 'ENRICHING',
        });
      } else {
        // Fire-and-forget import so the request doesn't time out
        companyImport.search(req.params.slug).catch(err =>
          console.warn(`[Auto-enrich] background import failed for "${req.params.slug}":`, err.message)
        );

        return res.status(202).json({
          enriching: true,
          slug: req.params.slug,
          message: 'Company not found — enrichment pipeline started. Poll this endpoint again in a few seconds.',
          code: 'ENRICHING',
        });
      }
    }

    // If company exists but has very sparse data (recently imported with no AI analysis),
    // kick off a background re-enrichment to fill gaps — respond immediately with what we have.
    const isDataSparse =
      !startup.aiAnalyses?.length &&
      !startup.timelineEvents?.length &&
      !startup.lessons?.length;

    if (isDataSparse) {
      companyImport.search(startup.name).catch(() => {/* best-effort */});
    }

    res.json({
      ...startup,
      fundingInr: startup.fundingInr?.toString(),
      fundingUsd: startup.fundingUsd?.toString(),
      metricsSnapshots: startup.metricsSnapshots.map(m => ({
        ...m,
        revenueInr: m.revenueInr?.toString(),
        revenueUsd: m.revenueUsd?.toString(),
        mrrInr: m.mrrInr?.toString(),
        mrrUsd: m.mrrUsd?.toString(),
        burnRateInr: m.burnRateInr?.toString(),
        burnRateUsd: m.burnRateUsd?.toString(),
        churnRate: m.churnRate?.toString(),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/startups/:slug/similar - Similar startups
router.get('/:slug/similar', async (req, res, next) => {
  try {
    const startup = await prisma.company.findUnique({
      where: { slug: req.params.slug },
      include: {
        failureReasons: { where: { isPrimary: true } },
      },
    });

    if (!startup) {
      return res.status(404).json({ error: 'Startup not found', code: 'NOT_FOUND' });
    }

    const primaryFailure = startup.failureReasons[0]?.category;
    const similar = await prisma.company.findMany({
      where: {
        id: { not: startup.id },
        OR: [
          { industry: startup.industry },
          ...(primaryFailure ? [{ failureReasons: { some: { category: primaryFailure } } }] : []),
        ],
      },
      include: {
        failureReasons: { where: { isPrimary: true }, take: 1 },
      },
      take: 5,
    });

    const results = similar.map(s => {
      let score = 0;
      if (s.industry === startup.industry) score += 0.4;
      if (s.failureReasons[0]?.category === primaryFailure) score += 0.3;
      score += Math.random() * 0.2;
      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        industry: s.industry,
        status: s.status,
        summary: s.summary,
        logoUrl: s.logoUrl,
        similarityScore: Math.min(Math.round(score * 100) / 100, 1),
        keyLesson: s.failureReasons[0]?.description?.slice(0, 120) || '',
      };
    });

    results.sort((a, b) => b.similarityScore - a.similarityScore);
    res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/startups/:slug/external-research - Web research and citations
router.get('/:slug/external-research', async (req, res, next) => {
  try {
    const startup = await prisma.company.findUnique({
      where: { slug: req.params.slug },
    });

    if (!startup) {
      return res.status(404).json({ error: 'Startup not found', code: 'NOT_FOUND' });
    }

    const sources = await researchStartup(startup.name);
    res.json({ sources });
  } catch (err) {
    console.error('External research failed:', err);
    res.json({ sources: [] }); // Graceful fallback to empty sources
  }
});

module.exports = router;
