import seedData from '../data/seedData.json';
export { fetchFirestoreStartups, fetchFirestoreStartupBySlug } from './firebaseData.js';

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFundingAmount(fundingStr) {
  if (!fundingStr) return 50000000;
  const clean = String(fundingStr).replace(/[^0-9.]/g, '');
  const num = parseFloat(clean) || 50;
  if (fundingStr.includes('B')) return num * 1000000000 * 80;
  if (fundingStr.includes('M')) return num * 1000000 * 80;
  if (fundingStr.includes('k') || fundingStr.includes('K')) return num * 1000 * 80;
  return num * 80;
}

// Map 413 seed.json companies to normalized mock startup objects
const normalizedSeedStartups = (seedData || []).map((item, idx) => {
  const name = item.name || `Startup ${idx + 1}`;
  const slug = slugify(name);
  const foundingYear = item.yearFounded || 2015;
  const shutdownYear = item.yearClosed || 2023;
  const lifetimeMonths = Math.max(12, (shutdownYear - foundingYear) * 12);
  const failureReasonsList = Array.isArray(item.failureReasons)
    ? item.failureReasons
    : [item.failureCategory || 'Strategic Execution'];

  const milestones = Array.isArray(item.milestones)
    ? item.milestones.map((m, i) => {
        const parts = String(m).split(':');
        const year = parseInt(parts[0]) || foundingYear + i;
        const title = parts.slice(1).join(':').trim() || String(m);
        return { id: i + 1, title, year };
      })
    : [
        { id: 1, title: `Founded in ${item.city || item.country || 'Silicon Valley'}`, year: foundingYear },
        { id: 2, title: `Raised ${item.funding || 'Venture Funding'}`, year: foundingYear + 2 },
        { id: 3, title: `Ceased Operations`, year: shutdownYear }
      ];

  const failureReasons = failureReasonsList.map((reason, i) => ({
    id: i + 1,
    category: item.failureCategory || 'Strategy',
    description: typeof reason === 'string' ? reason : reason.description || 'Execution breakdown'
  }));

  const keyMistakes = Array.isArray(item.keyMistakes) ? item.keyMistakes : failureReasonsList;

  return {
    id: 1000 + idx,
    slug,
    name,
    industry: item.industry || 'Tech',
    status: 'failed',
    summary: item.productDescription || item.businessModel || `${name} was a ${item.industry || 'technology'} startup that ceased operations in ${shutdownYear}.`,
    foundingYear,
    shutdownYear,
    lifetimeMonths,
    fundingInr: parseFundingAmount(item.funding),
    peakUsers: item.employees ? parseInt(item.employees) * 1000 : 50000,
    topFailureReason: (item.failureCategory || 'unit_economics').toLowerCase().replace(/[^a-z0-9]/g, '_'),
    domain: `${slug}.com`,
    tags: [item.industry, item.failureCategory, item.country].filter(Boolean),
    timelineEvents: milestones,
    failureReasons: failureReasons,
    caseStudy: {
      originStory: `${name} was founded in ${foundingYear} in ${item.city || item.country || 'USA'}${Array.isArray(item.founders) && item.founders.length ? ` by ${item.founders.join(', ')}` : typeof item.founders === 'string' ? ` by ${item.founders}` : ''}. The company set out to build ${item.productDescription || 'an innovative product in ' + (item.industry || 'tech')}.`,
      marketProblem: `The company targeted ${item.targetCustomers || 'enterprise and consumer markets'} with a business model based on ${item.businessModel || 'recurring software and services'}.`,
      businessModel: item.businessModel || `Subscription & Direct-to-Consumer services in ${item.industry || 'Technology'}.`,
      earlyGrowth: `During initial scaling, ${name} raised ${item.funding || 'significant funding'} from investors including ${Array.isArray(item.investors) ? item.investors.join(', ') : typeof item.investors === 'string' ? item.investors : 'Venture Capital Funds'}.`,
      fundingHistory: `Total funding raised: ${item.funding || 'Undisclosed'} across multiple seed and venture rounds.`,
      scalingPhase: `At peak operations, ${name} employed ${item.employees || 'hundreds of team members'} and expanded aggressively across key regional markets.`,
      warningSigns: `Key friction emerged around ${item.failureCategory || 'business model execution'}.`,
      strategicMistakes: keyMistakes.map((m, i) => `${i + 1}. **${typeof m === 'string' ? m : m.description || JSON.stringify(m)}**`).join('\n'),
      criticalDecisions: `The most critical breakdown occurred in scaling before product-market fit was fully secured.`,
      collapseSequence: `In ${shutdownYear}, after exploring strategic alternatives, ${name} officially ceased operations. ${item.timeline || ''}`,
      whyFailed: `Primary failure root causes: ${failureReasonsList.join('. ')}.`,
      founderLessons: `Key takeaway for founders: Validate unit economics and market demand before scaling overhead.`,
      keyTakeaways: keyMistakes.length > 0 ? keyMistakes : [
        'Validate product-market fit before expanding operations.',
        'Keep tight control over capital burn rate.',
        'Maintain direct customer feedback loops.'
      ]
    }
  };
});

// Mock external sources generator
const generateMockExternalSources = (startupName) => {
  const mockPublishers = [
    'techcrunch.com',
    'bloomberg.com',
    'wired.com',
    'forbes.com',
    'businessinsider.com',
    'wsj.com',
    'nytimes.com',
    'cnbc.com'
  ];
  
  const mockTitles = [
    `${startupName}: The Rise and Fall of a Promising Startup`,
    `What Went Wrong at ${startupName}? A Post-Mortem`,
    `${startupName} Raises $XXM in Series Funding`,
    `${startupName} Shuts Down After Years of Struggle`,
    `Lessons from ${startupName}'s Spectacular Failure`,
    `Founder of ${startupName} Speaks Out About Closure`,
    `${startupName}'s Market Journey: From Hype to Collapse`
  ];
  
  return mockTitles.slice(0, 5).map((title, i) => ({
    title,
    publisher: mockPublishers[i % mockPublishers.length],
    date: `${2020 + i % 5}-0${1 + i % 9}-0${1 + i % 28}`,
    summary: `This article provides insights into ${startupName}'s journey, covering key milestones, challenges, and lessons learned from their failure. It includes interviews with former employees and industry experts.`,
    url: `https://${mockPublishers[i % mockPublishers.length]}/${startupName.toLowerCase().replace(/\s+/g, '-')}-article-${i + 1}`
  }));
};

// Helper function to generate AI web intelligence report for missing startups
const generateWebIntelligenceReport = (slug, name) => {
  const industryMap = {
    'unacademy': 'EdTech',
    'byjus': 'EdTech',
    'ola': 'Mobility',
    'swiggy': 'Food Delivery',
    'zepto': 'Quick Commerce',
    'paytm': 'FinTech',
    'phonepe': 'FinTech',
    'oyo': 'Hospitality',
    'zomato': 'Food Delivery',
    'flipkart': 'E-Commerce'
  };
  
  const industry = industryMap[slug] || 'Tech';
  
  const tags = [
    'AI Generated',
    'Web Intelligence',
    '2020s',
    industry
  ];
  
  const timelineEvents = [
    { id: 1, title: 'Founded', year: 2015 },
    { id: 2, title: 'Raised Series A', year: 2017 },
    { id: 3, title: 'Expanded to major cities', year: 2019 },
    { id: 4, title: 'Faced regulatory challenges', year: 2021 },
    { id: 5, title: 'Downsizing and restructuring', year: 2023 }
  ];
  
  const failureReasons = [
    { id: 1, category: 'Unit Economics', description: 'High customer acquisition cost and low LTV made profitability elusive.' },
    { id: 2, category: 'Competition', description: 'Intense competition from deep-pocketed players squeezed margins.' },
    { id: 3, category: 'Regulatory', description: 'Changing regulatory landscape created uncertainty.' },
    { id: 4, category: 'Cash Burn', description: 'Aggressive expansion led to unsustainable cash burn.' }
  ];
  
  return {
    id: 999,
    slug,
    name,
    industry,
    status: 'analyzed',
    summary: `${name} is a ${industry} company that has been analyzed using web intelligence sources. This AI-generated report provides insights into its business model, challenges, and key learnings.`,
    foundingYear: 2015,
    shutdownYear: null,
    lifetimeMonths: 108,
    fundingInr: 50000000000,
    peakUsers: 1000000,
    topFailureReason: 'unit_economics',
    domain: `${slug}.com`,
    tags,
    timelineEvents,
    failureReasons,
    caseStudy: {
      originStory: `In 2015, inspired by growing interest in ${industry.toLowerCase()}, the founders set out to build ${name}.`,
      marketProblem: `The market was large but highly competitive, with established players dominating key segments.`,
      businessModel: `Initially, the company focused on ${industry.toLowerCase()} solutions, with plans to monetize over time.`,
      earlyGrowth: `Early traction was strong, with user numbers growing rapidly in the first two years.`,
      fundingHistory: `Over time, ${name} raised over $4.5B from leading investors.`,
      scalingPhase: `In 2019, they began aggressive expansion, entering multiple new markets simultaneously.`,
      warningSigns: `By 2021, there were clear signs of trouble, including rising costs and slowing growth.`,
      strategicMistakes: `Key mistakes included premature scaling, insufficient focus on unit economics, and underestimating competition.`,
      criticalDecisions: `The most consequential decisions included prioritizing growth over profitability from the outset, expanding into too many markets at once without validating product-market fit in each, and failing to heed early warnings from the data and team members.`,
      collapseSequence: `The company tried to pivot in 2023, but it was too late — they eventually downsized significantly.`,
      whyFailed: `Ultimately, ${name} failed because of a combination of unsustainable unit economics and a lack of clear product-market fit in their core market.`,
      founderLessons: `The biggest lesson was to validate product-market fit before scaling, and to always prioritize unit economics over growth at all costs.`,
      keyTakeaways: [
        'Validate before scaling',
        'Prioritize unit economics',
        'Focus on core value',
        'Watch cash runway'
      ]
    },
    isAiGenerated: true
  };
};

// Mock API data for hackathon demo mode — with FULL Harvard Business Review style case studies!
const initialMockStartups = [
  {
    id: 1,
    slug: 'juicero',
    name: 'Juicero',
    industry: 'Consumer Hardware',
    status: 'failed',
    summary: 'A $400 Wi-Fi enabled juicer that squeezed pre-packaged juice bags — until a viral video showed users could squeeze the bags by hand for the same result.',
    foundingYear: 2013,
    shutdownYear: 2017,
    lifetimeMonths: 48,
    fundingInr: 10300000000,
    peakUsers: 100000,
    topFailureReason: 'unit_economics',
    domain: 'juicero.com',
    tags: ['Hardware', 'Consumer', 'Unit Economics', 'Viral Failure'],
    timelineEvents: [
      { id: 1, title: 'Founded by Doug Evans', year: 2013 },
      { id: 2, title: 'Raised $120M from Kleiner Perkins & Google Ventures', year: 2015 },
      { id: 3, title: 'Launched with $400 juicer and $5-7 juice bags', year: 2016 },
      { id: 4, title: 'Bloomberg viral video shows hand-squeezing works', year: 2017 },
      { id: 5, title: 'Shuts down operations, offers refunds', year: 2017 }
    ],
    failureReasons: [
      { id: 1, category: 'Unit Economics', description: 'Over-engineered $400 juicer for a problem users could solve with their hands.' },
      { id: 2, category: 'Product', description: 'No real value add over just squeezing the pre-packaged bags.' },
      { id: 3, category: 'Marketing', description: 'Positioned as a luxury IoT product for a problem no one had.' }
    ],
    caseStudy: {
      originStory: `In 2013, Doug Evans, a former organic juice bar owner, founded Juicero with a bold vision: to bring fresh-pressed organic juice to every home kitchen, conveniently and hygienically. His background in the juice industry made him convinced that consumers craved high-quality, cold-pressed juice at home — without the hassle of juicing themselves. Evans set out to build a "Keurig for juice" — an elegant Wi-Fi-connected appliance that would squeeze proprietary, pre-packaged produce bags. The pitch? Perfectly pressed juice every time, with minimal effort.`,
      marketProblem: `Evans observed that while consumers loved fresh cold-pressed juice, it was often too expensive ($8-12 per bottle) and too inconvenient to make at home. Traditional juicers were messy, time-consuming, and a hassle to clean. Supermarkets only carried a limited selection, and fresh juice spoiled quickly. The problem seemed ripe for a tech-enabled solution.`,
      businessModel: `Juicero's model was classic razor-and-blades: sell the $400 (later reduced to $200) "Press" at a loss, then make money on recurring sales of the $5-7 pre-packaged produce bags, which had a 7-day shelf life. The Wi-Fi-connected device would even validate that the bags were fresh, authentic, and not expired before squeezing — an IoT flourish that added complexity but little user value.`,
      earlyGrowth: `The company launched with significant fanfare in 2016, raising over $120M from top-tier investors like Kleiner Perkins Caufield & Byers, Google Ventures, and First Round Capital. The product was featured in major tech publications, and early adopters praised its sleek design and quality. At launch, Juicero sold out of its first production run, and retailers like Williams Sonoma carried the device. For a brief moment, it looked like Juicero might become the next big kitchen gadget.`,
      fundingHistory: `2013: $4.4M seed round led by First Round Capital.
2014-2015: Series A and B rounds totaling $120M from Kleiner Perkins, Google Ventures, and others, valuing the company at $270M.
2016: Further investment as launch neared.
Total raised: ~$120M (over $1000 per customer at peak).`,
      scalingPhase: `Flush with cash, Juicero invested heavily in engineering and operations. The Press itself was a marvel of over-engineering: 400 custom parts, over-engineered to squeeze with 8,000 pounds of force — far more than needed for the soft produce bags. The company built its own produce supply chain, manufacturing facilities, and distribution network, scaling rapidly in anticipation of mass demand.`,
      warningSigns: `Red flags appeared early: sales were slower than projected, and retention was low — many users bought the device but didn't repurchase the bags often enough to be profitable. Unit economics were ugly: each customer was losing money upfront, and the recurring revenue wasn't making up for it. But the biggest warning sign came from within the company: some employees admitted privately that they could squeeze the produce bags by hand and get almost the same amount of juice as the $400 device. Still, leadership pressed on.`,
      strategicMistakes: `1. **Over-engineering the product**: The Press was far more complex and expensive than it needed to be, solving a problem users didn't have.
2. **Skipping basic validation**: No one stopped to ask if users actually needed a Wi-Fi-enabled juicer — or if they could just squeeze the bags by hand.
3. **Ignoring unit economics**: The company prioritized growth over profitability, assuming scale would fix everything.
4. **Vulnerable "razor-and-blades" model**: Competitors could (and did) copy the produce bag format, and the device itself was easy to bypass.`,
      collapseSequence: `The beginning of the end came in April 2017, when Bloomberg published a video showing two Juicero employees squeezing a produce bag by hand — and getting nearly the same amount of juice as the $400 Press. The video went viral, quickly becoming a symbol of tech excess. Sales plummeted. Juicero scrambled to respond, offering refunds, reducing the Press price to $200, and emphasizing hygiene benefits — but it was too late. In September 2017, just 18 months after launch, Juicero announced it was suspending operations and refunding all customers who had bought the device in the prior 90 days.`,
      whyFailed: `Juicero failed because it solved a problem no one had, with a solution no one needed. The core issue wasn't just that users could squeeze the bags by hand — it's that the entire product was based on flawed assumptions about user needs. The company raised too much money too quickly, over-engineered the product, and ignored basic market validation. There was no real product-market fit, and the unit economics never came close to making sense.`,
      founderLessons: `Doug Evans later admitted: "I overcomplicated it. I fell in love with the technology instead of focusing on what the customer actually needed." The biggest lesson, he said, was to validate, validate, validate: "Talk to 100 customers before you build anything. Then listen to them." He also warned founders: "Don't let investors' money make you stupid. Just because you can raise $100M doesn't mean you should spend it all on a product no one wants."`,
      keyTakeaways: [
        "Always validate the problem exists before building a solution.",
        "Just because you CAN build a complex product doesn't mean you SHOULD.",
        "Beware of the razor-and-blades model if the 'razor' is unnecessary.",
        "Watch unit economics like a hawk — scale kills more startups than it saves.",
        "Viral attention isn't always positive — make sure your product can stand up to scrutiny."
      ]
    }
  },
  {
    id: 2,
    slug: 'theranos',
    name: 'Theranos',
    industry: 'Health Tech',
    status: 'failed',
    summary: 'Claimed to revolutionize blood testing with a single drop of blood — but it was all a massive fraud that landed Elizabeth Holmes in prison.',
    foundingYear: 2003,
    shutdownYear: 2018,
    lifetimeMonths: 180,
    fundingInr: 70000000000,
    peakUsers: 500000,
    topFailureReason: 'product',
    domain: 'theranos.com',
    tags: ['Health Tech', 'Fraud', 'Biotech', 'Silicon Valley'],
    timelineEvents: [
      { id: 1, title: 'Founded by 19-year-old Elizabeth Holmes', year: 2003 },
      { id: 2, title: 'Partners with Walgreens for in-store testing', year: 2013 },
      { id: 3, title: 'Valued at $9 billion', year: 2014 },
      { id: 4, title: 'John Carreyrou publishes WSJ expose', year: 2015 },
      { id: 5, title: 'SEC charges Holmes with fraud, company dissolves', year: 2018 }
    ],
    failureReasons: [
      { id: 1, category: 'Fraud', description: 'Falsified test results and actively misled investors and customers.' },
      { id: 2, category: 'Product', description: 'The "Edison" device never actually worked as claimed.' },
      { id: 3, category: 'Governance', description: 'Toxic culture that silenced dissent and prioritized hype over truth.' }
    ],
    caseStudy: {
      originStory: `In 2003, 19-year-old Stanford sophomore Elizabeth Holmes dropped out of school to found Theranos, inspired by her fear of needles and a desire to democratize healthcare. Her vision? A small, portable device called the Edison that could run hundreds of tests from just a single drop of blood, at a fraction of the cost of traditional labs. Holmes, who cited Steve Jobs as a hero, dressed in black turtlenecks and spoke in a deep, deliberate voice — cultivating the image of a visionary tech founder.`,
      marketProblem: `Traditional blood tests were painful, expensive, and inconvenient. Patients had to visit labs, have large vials of blood drawn, and wait days for results. Holmes argued that her technology would allow people to test their blood at home or at local pharmacies, catching diseases early and making healthcare more accessible. It was a compelling vision — if it could be made to work.`,
      businessModel: `Theranos planned to partner with major retailers like Walgreens and Safeway to place Edison devices in their stores, making blood testing as easy as picking up a prescription. They would charge a fraction of traditional lab prices, making money on volume while saving patients time and money. The company also pursued partnerships with pharmaceutical companies for drug development and clinical trials.`,
      earlyGrowth: `Holmes was a master fundraiser, convincing some of the biggest names in Silicon Valley and politics to invest. By 2014, Theranos had raised over $700 million, valuing the company at $9 billion and making Holmes a billionaire on paper. She graced magazine covers, spoke at TED talks, and rubbed shoulders with presidents and billionaires. The company announced partnerships with Walgreens and Safeway, promising to revolutionize healthcare.`,
      fundingHistory: `2003: $6M seed round from Tim Draper.
2004-2010: Series A, B, C, D rounds — total over $100M, from investors including Larry Ellison, Rupert Murdoch, and Betsy DeVos.
2014: Final private round valuing company at $9B.
Total raised: ~$700M.`,
      scalingPhase: `As Theranos raised more money, it doubled down on its claims — even as internal tests showed the Edison device didn't work. The company used commercially available machines from third parties to run most tests, while only using the Edison for a small fraction of tests (often with diluted blood samples to make the small volume work). It built out a massive lab in Newark, California, and prepared to launch nationwide. Whistleblowers inside the company warned about the problems but were ignored or silenced.`,
      warningSigns: `For years, there were red flags: Theranos was highly secretive, never published peer-reviewed research, and refused to let independent experts validate its technology. Former employees described a toxic culture where dissent was not tolerated. Holmes' claims about the device's capabilities grew more and more outlandish. But the hype was deafening — and the money kept flowing in.`,
      strategicMistakes: `1. **Prioritizing hype over truth**: Theranos created a cult of personality around Holmes and prioritized marketing and fundraising over building a working product.
2. **Ignoring the science**: The physics of running hundreds of tests from a single drop of blood is extremely challenging — and Theranos never solved it.
3. **Creating a culture of fear**: Employees who raised concerns were fired or marginalized, allowing fraud to continue unchecked.
4. **Misleading partners and investors**: The company actively deceived Walgreens, Safeway, and its investors about the technology's capabilities.`,
      collapseSequence: `The beginning of the end came in October 2015, when Wall Street Journal reporter John Carreyrou published a bombshell exposé revealing that Theranos's technology didn't work, that the company was using third-party machines for most tests, and that it was lying to investors and patients. Over the next three years, the house of cards collapsed: Walgreens terminated its partnership, lawsuits piled up, the SEC charged Holmes and Theranos president Sunny Balwani with massive fraud, and the company was forced to shut down. In 2018, Theranos officially dissolved. Holmes was later convicted of fraud and sentenced to 11 years in prison.`,
      whyFailed: `Theranos failed because it was built on a foundation of lies. The technology never worked, and instead of admitting that and pivoting or shutting down, the company doubled down on deception, lying to investors, partners, patients, and the public. The culture of fear and secrecy prevented anyone from speaking up until it was too late, and the charismatic Holmes was able to convince even sophisticated investors to ignore the red flags.`,
      founderLessons: `While Holmes has never expressed true remorse, the lessons from Theranos are clear: "Vision without execution is hallucination" — but vision without integrity is fraud. Founders must be transparent, admit mistakes, and build cultures where dissent is encouraged, not punished. Most importantly: never lie to your customers or your investors — the truth always comes out eventually.`,
      keyTakeaways: [
        "If you're building in a regulated industry like healthcare, transparency is non-negotiable.",
        "Cultivate a culture where employees feel safe raising concerns — whistleblowers are your friends, not your enemies.",
        "Don't let the 'fake it till you make it' mindset turn into fraud.",
        "Investors: don't get caught up in hype — demand proof and independent validation.",
        "If your product doesn't work, don't cover it up — pivot, iterate, or shut down gracefully."
      ]
    }
  },
  {
    id: 3,
    slug: 'wework',
    name: 'WeWork',
    industry: 'Real Estate',
    status: 'failed',
    summary: 'Co-working giant valued at $47 billion at its peak, but its IPO collapsed in spectacular fashion, exposing massive losses and questionable governance.',
    foundingYear: 2010,
    shutdownYear: 2019,
    lifetimeMonths: 108,
    fundingInr: 90000000000,
    peakUsers: 600000,
    topFailureReason: 'cashflow',
    domain: 'wework.com',
    tags: ['Real Estate', 'Co-working', 'IPO Failure', 'Governance'],
    timelineEvents: [
      { id: 1, title: 'Founded by Adam Neumann & Miguel McKelvey', year: 2010 },
      { id: 2, title: 'SoftBank leads $4.4B funding round', year: 2017 },
      { id: 3, title: 'Valued at $47 billion', year: 2019 },
      { id: 4, title: 'S-1 filing reveals massive losses and red flags', year: 2019 },
      { id: 5, title: 'Neumann ousted, IPO withdrawn, company collapses', year: 2019 }
    ],
    failureReasons: [
      { id: 1, category: 'Governance', description: 'Toxic, cult-like culture with extensive self-dealing by founder Adam Neumann.' },
      { id: 2, category: 'Valuation', description: 'Unrealistic valuation based on flawed "tech company" metrics for a real estate business.' },
      { id: 3, category: 'Financials', description: 'Burning through billions in cash with no path to profitability.' }
    ],
    caseStudy: {
      originStory: `In 2010, Israeli entrepreneur Adam Neumann and his partner Miguel McKelvey opened the first WeWork space in SoHo, New York. The idea was simple: rent out desks and offices in shared, community-focused spaces to startups and freelancers, creating a "we work" culture of collaboration. Neumann, a charismatic and visionary leader, dreamed bigger: he wanted WeWork to be not just a real estate company, but a "physical social network" that would change how people worked and lived — eventually branching out into WeLive (co-living), WeGrow (school), and beyond.`,
      marketProblem: `Traditional office space was inflexible, expensive, and often isolating for freelancers and startups. Long leases, high upfront costs, and lack of community were pain points for many small businesses and independent workers. WeWork promised flexibility, community, and a cool, trendy workspace — all on a month-to-month basis.`,
      businessModel: `WeWork's model was straightforward: sign long-term leases (often 10-15 years) at low prices, renovate the space into cool, open-plan offices with free beer and coffee, then rent desks and offices at higher prices on short-term agreements. The company made money on the spread between its long-term lease costs and its short-term rental revenue. As it grew, WeWork started billing itself as a tech platform rather than a real estate company — justifying a much higher valuation.`,
      earlyGrowth: `WeWork grew like wildfire. By 2014, it had 15 locations across three cities. By 2016, it was in 12 countries. Neumann's charisma and grand vision attracted top investors, including Benchmark Capital and eventually SoftBank, which poured billions into the company. The culture was fast-paced, energetic, and more than a little chaotic — and Neumann made sure it was well-documented on social media.`,
      fundingHistory: `2012: $3.3M seed.
2013: $16M Series A.
2014: $355M Series C at $1.5B valuation.
2017: $4.4B SoftBank-led round at $20B valuation.
2019: Final investment values company at $47B.
Total raised: ~$12B.`,
      scalingPhase: `Flush with SoftBank's cash, WeWork expanded aggressively. It opened hundreds of new locations, branched out into new ventures (WeLive, WeGrow, WeWork Labs), and Neumann made increasingly outlandish claims — including that WeWork would eventually solve world hunger. Meanwhile, losses mounted: in 2018 alone, WeWork lost $1.9 billion on revenue of $1.8 billion. But Neumann and SoftBank's Masayoshi Son pushed for faster growth, believing that scale would eventually fix everything.`,
      warningSigns: `Red flags were everywhere, but investors ignored them:
- Massive and growing losses.
- Questionable self-dealing (Neumann owned buildings he leased back to WeWork, sold the "We" trademark to the company, etc.).
- A cult of personality around Neumann.
- Unclear path to profitability.
- A bizarre S-1 filing with tone-deaf language and red flags galore.`,
      strategicMistakes: `1. **Disingenuous positioning**: WeWork wasn't a tech company — it was a real estate company with high fixed costs — but it pretended to be a tech platform to justify a higher valuation.
2. **Growing at all costs**: The company prioritized growth over profitability, losing billions while opening locations too quickly.
3. **Toxic governance**: Neumann's extensive self-dealing and cult of personality made good decision-making nearly impossible.
4. **Mismatched liabilities**: Long-term lease liabilities combined with short-term revenue, exposing the company to massive risk in a downturn.`,
      collapseSequence: `In August 2019, WeWork filed its S-1 to go public — and the world got its first clear look at the company's finances and culture. The filing was a disaster: massive losses, bizarre language ("We dedicate this to the energy of We — greater than any one of us"), and extensive self-dealing by Neumann. Investors revolted, the IPO was withdrawn, and Neumann was forced out as CEO in September 2019. SoftBank eventually bailed out the company, but Neumann's vision was dead. WeWork eventually went public via SPAC in 2021 at a tiny fraction of its former valuation.`,
      whyFailed: `WeWork failed because it grew too fast, lost sight of its core business, and was led by a founder with unchecked power. The company's finances were unsustainable, its governance was a mess, and its valuation was completely disconnected from reality. The "growth at all costs" mentality that worked for many software startups was a disaster for a capital-intensive real estate business.`,
      founderLessons: `Neumann later admitted: "I got caught up in the hype and the valuation and lost sight of the basics: building a profitable, sustainable business." The lessons from WeWork are simple: know what business you're actually in, prioritize sustainable growth over growth at all costs, and never let a cult of personality override good governance and common sense.`,
      keyTakeaways: [
        "You can't fake unit economics forever — especially in capital-intensive businesses.",
        "Know what business you're in — WeWork was real estate, not tech.",
        "Governance matters — even for 'cool' startups.",
        "Beware of the 'growth at all costs' mindset — it works for software, not for everything.",
        "If your S-1 makes people laugh, you're doing something wrong."
      ]
    }
  },
  {
    id: 4,
    slug: 'quibi',
    name: 'Quibi',
    industry: 'Media / Entertainment',
    status: 'failed',
    summary: 'Short-form video platform for "quick bites" on the go — launched at the start of the COVID-19 pandemic and shut down 6 months later.',
    foundingYear: 2018,
    shutdownYear: 2020,
    lifetimeMonths: 24,
    fundingInr: 14000000000,
    peakUsers: 500000,
    topFailureReason: 'pmf',
    domain: 'quibi.com',
    tags: ['Media', 'Short-form Video', 'PMF', 'Timing', 'COVID'],
    timelineEvents: [
      { id: 1, title: 'Founded by Meg Whitman & Jeffrey Katzenberg', year: 2018 },
      { id: 2, title: 'Raises $1.75 billion from major studios and investors', year: 2018-2020 },
      { id: 3, title: 'Launches April 2020 — right as COVID lockdowns start', year: 2020 },
      { id: 4, title: 'Downloads plummet after free trial ends', year: 2020 },
      { id: 5, title: 'Shuts down October 2020, returns $350M to investors', year: 2020 }
    ],
    failureReasons: [
      { id: 1, category: 'PMF', description: 'No clear product-market fit despite massive budget and star power.' },
      { id: 2, category: 'Timing', description: 'Launched during COVID lockdowns when no one was commuting — its core use case.' },
      { id: 3, category: 'Product', description: 'Vertical-only "quick bites" didn\'t fit user habits, no sharing, no casting to TV.' }
    ],
    caseStudy: {
      originStory: `Quibi was the brainchild of two Hollywood legends: Jeffrey Katzenberg (Disney studio chief, DreamWorks Animation founder) and Meg Whitman (former eBay and HP CEO). Their vision? A premium short-form video platform for "quick bites" of 5-10 minute content, designed for people on the go — watching during their commute, waiting in line, or on their lunch break. Unlike YouTube or TikTok, Quibi would feature high-budget, Hollywood-quality content from A-list stars — all optimized for mobile viewing in both portrait and landscape. Katzenberg called it "the next generation of television."`,
      marketProblem: `Katzenberg and Whitman saw a gap: people loved short-form video (TikTok was already growing fast), but there was no premium, Hollywood-quality option. YouTube was mostly user-generated, TikTok was for memes and trends, Netflix and Hulu were for long-form — Quibi would fill the gap with high-quality, short, snackable content for busy, on-the-go users. The problem seemed obvious, the solution compelling.`,
      businessModel: `Quibi's model was subscription-only: $4.99 per month with ads, $7.99 without. The company spent over $1 billion on content, greenlighting hundreds of shows from top directors and A-list stars like Steven Spielberg, Guillermo del Toro, Reese Witherspoon, and Kevin Hart. The plan: launch with a massive library of exclusive content, attract millions of subscribers, and become the next Netflix — but for short-form.`,
      earlyGrowth: `Even before launch, Quibi was a sensation — but mostly in Silicon Valley and Hollywood. The company raised $1.75 billion from every major Hollywood studio, major tech investors, and even Walmart. It was featured in every major publication, with the hype sky-high. Then, in March 2020, the COVID-19 pandemic hit — and everything changed.`,
      fundingHistory: `2018: $1B seed from Disney, Fox, Sony, WarnerMedia, Viacom, and tech investors.
2020: Additional $750M before launch.
Total raised: $1.75B — in under two years.`,
      scalingPhase: `On April 6, 2020 — just as the world was locking down — Quibi launched with 50 shows available on day one. Initial downloads were strong, driven by curiosity and a 90-day free trial. But almost immediately, retention dropped off a cliff. Most users watched a few shows, then didn't come back. Compounding the problem: no one was commuting anymore — Quibi's entire use case had disappeared overnight. The app didn't allow casting to TVs (a feature added months later, too late), didn't allow sharing clips to social media, and was only available on mobile — all choices that backfired spectacularly in the pandemic.`,
      warningSigns: `Even before launch, there were signs:
- The "commuting" use case was risky even before COVID.
- Quibi was launching into an increasingly crowded streaming space (Disney+, Apple TV+, HBO Max all launched around the same time).
- The app's restrictions (no casting, no sharing) felt anti-user.
But with so much money and star power, the company pressed on.`,
      strategicMistakes: `1. **Building for a use case that vanished**: Quibi was designed for commuting — then COVID hit and no one was commuting.
2. **Ignoring user behavior**: People were already watching TikTok, YouTube, and Netflix on their phones — Quibi didn't offer enough new value.
3. **Anti-user features**: No casting, no sharing, overcomplicated "Turnstyle" tech — the app made it harder, not easier, to watch content.
4. **Too much, too fast**: Spending $1 billion on content before finding product-market fit was a massive risk that didn't pay off.`,
      collapseSequence: `After initial launch buzz, Quibi's numbers cratered. Only about 8% of free-trial users converted to paid subscriptions — a disastrous conversion rate. By July, the company was scrambling to pivot: it added casting, allowed sharing, and begged users to give it another chance. But it was too late. In October 2020, just six months after launch, Quibi announced it was shutting down and returning $350 million to investors — an unprecedented move that shocked Silicon Valley and Hollywood. The content was later sold to Roku for just $100 million — a tiny fraction of its cost.`,
      whyFailed: `Quibi failed because it never found product-market fit. The company built for a use case that vanished, ignored user behavior, and offered a product that was worse in many ways than existing options like TikTok and YouTube. For all its star power and massive budget, it never solved a real problem for users — or gave them a reason to pay for another subscription.`,
      founderLessons: `Katzenberg later attributed 90% of Quibi's failure to COVID — but admitted: "We could have done a better job listening to users." The lessons from Quibi are clear: always validate your use case with users, never build for a specific moment in time that could disappear, and never underestimate incumbents and user habits. Most importantly: a big budget and big names don't guarantee success — you still have to build something people want.`,
      keyTakeaways: [
        "Timing is everything — and COVID was a worst-case scenario for Quibi.",
        "Validate your use case — don't assume you know how users will behave.",
        "Don't ignore existing user habits — people are already watching video on their phones.",
        "A big budget doesn't solve product-market fit problems.",
        "If you're launching a subscription service, make sure your conversion rate doesn't look like Quibi's."
      ]
    }
  }
];

// Add all the requested startups!
const additionalStartups = [
  {
    id: 5,
    slug: 'webvan',
    name: 'Webvan',
    industry: 'E-commerce',
    status: 'failed',
    summary: 'Iconic dot-com bubble grocery delivery service that burned through $800 million and shut down in 2001.',
    foundingYear: 1996,
    shutdownYear: 2001,
    lifetimeMonths: 60,
    fundingInr: 60000000000,
    peakUsers: 750000,
    topFailureReason: 'unit_economics',
    domain: 'webvan.com',
    tags: ['Dot-com Bubble', 'Grocery', 'Logistics', 'Unit Economics'],
    timelineEvents: [
      { id: 1, title: 'Founded by Louis Borders (Borders Books)', year: 1996 },
      { id: 2, title: 'IPO at $8 billion valuation', year: 1999 },
      { id: 3, title: 'Builds $40 million automated warehouse', year: 2000 },
      { id: 4, title: 'Expands to 10 cities simultaneously', year: 2000 },
      { id: 5, title: 'Shuts down, lays off 2000 employees', year: 2001 }
    ],
    failureReasons: [
      { id: 1, category: 'Unit Economics', description: 'Grocery delivery unit economics are brutal — Webvan never came close to making them work.' },
      { id: 2, category: 'Premature Scaling', description: 'Expanded to 10 cities before proving unit economics in one.' },
      { id: 3, category: 'Over-investment', description: 'Built $40 million automated warehouses before knowing demand.' }
    ],
    caseStudy: {
      originStory: `Webvan was founded in 1996 by Louis Borders, co-founder of Borders Books — a man who knew a thing or two about revolutionizing retail. His vision was simple but ambitious: deliver fresh groceries to customers' doors within a 30-minute window, using a network of highly automated warehouses and delivery vans. It was a radical idea in the early days of the internet, and investors poured money in.`,
      marketProblem: `Grocery shopping was (and still is) a chore. People hate spending time wandering aisles, waiting in line, and carrying heavy bags. Webvan promised to eliminate all of that — groceries delivered fresh, on-demand, to your door. The problem was massive, the opportunity seemed enormous.`,
      businessModel: `Webvan planned to make money on grocery sales plus delivery fees, with massive scale driving down costs. The company believed that its automated warehouses and sophisticated logistics would allow it to deliver groceries more efficiently than traditional supermarkets — and eventually undercut them on price too.`,
      earlyGrowth: `Webvan launched in the Bay Area in 1999 to tremendous buzz. Orders poured in, and customers loved the convenience. The company IPO'd later that year at an $8 billion valuation, raising $400 million in the process. It seemed like Webvan was destined to become the Amazon of groceries.`,
      fundingHistory: `1997: $10M Series A.
1998: $50M Series B.
1999: $400M IPO.
2000: $350M debt financing.
Total raised: ~$800M.`,
      scalingPhase: `Flush with IPO cash, Webvan went all in. It built a $40 million automated warehouse in Oakland, with plans for 26 more across the country. It expanded to 10 cities simultaneously, including Seattle, Chicago, and Atlanta. It bought a fleet of delivery vans, hired thousands of employees, and spent millions on marketing. The company was in a hurry to capture market share — and to spend its massive war chest.`,
      warningSigns: `But trouble was brewing. The unit economics were disastrous: Webvan was losing $130 on every order. The automated warehouses were over-engineered and unreliable. The 10-city expansion was stretching resources thin. And most importantly, many customers just weren't willing to pay delivery fees for groceries — especially when they were already paying a premium over supermarket prices.`,
      strategicMistakes: `1. **Premature scaling**: Expanding to 10 cities before proving profitability in one was suicidal.
2. **Ignoring unit economics**: Losing money on every order but trying to make it up in volume is a fool's errand.
3. **Over-engineering**: The automated warehouses were cool, but they were expensive and unnecessary for the demand they actually had.
4. **Misunderstanding customer willingness to pay**: Customers wanted convenience, but not at any price — and delivery fees added up fast.`,
      collapseSequence: `In 2001, as the dot-com bubble burst, Webvan ran out of runway. The company had burned through $800 million in just five years, and there was no end in sight to the losses. In June 2001, Webvan announced it was shutting down immediately, laying off 2,000 employees and liquidating its assets. It was one of the biggest, most spectacular failures of the dot-com era.`,
      whyFailed: `Webvan failed because it scaled too fast, ignored basic unit economics, and over-invested in infrastructure before proving demand. The company believed that "growth fixes everything" — but in a capital-intensive business with brutal unit economics, growth just made the losses bigger. Webvan was ahead of its time — but it was too early, too aggressive, and too bad at math.`,
      founderLessons: `Louis Borders later said: "We tried to do too much too soon. We should have focused on one city, figured out how to make money there, then expanded slowly." The biggest lesson from Webvan is one that every founder should know by heart: **get your unit economics right BEFORE you scale.** Growth is not a strategy for fixing bad economics — it just amplifies them.`,
      keyTakeaways: [
        "Unit economics are everything — especially in capital-intensive businesses.",
        "Scale only after you have a profitable, repeatable model.",
        "Don't build infrastructure for 10x demand before you have 1x demand.",
        "Just because something should work in theory doesn't mean it will work in practice.",
        "Timing matters — Webvan was 20 years ahead of its time (Instacart later proved the model)."
      ]
    }
  },
  {
    id: 6,
    slug: 'moviepass',
    name: 'MoviePass',
    industry: 'Entertainment',
    status: 'failed',
    summary: 'Movie subscription service that let users see a movie a day for $9.99 — a great deal for customers, a financial disaster for the company.',
    foundingYear: 2011,
    shutdownYear: 2020,
    lifetimeMonths: 108,
    fundingInr: 65000000000,
    peakUsers: 3000000,
    topFailureReason: 'unit_economics',
    domain: 'moviepass.com',
    tags: ['Entertainment', 'Subscription', 'Unit Economics', 'Growth Hacks'],
    timelineEvents: [
      { id: 1, title: 'Founded by Stacy Spikes and Hamet Watt', year: 2011 },
      { id: 2, title: 'HMNY acquires majority stake, Mitch Lowe becomes CEO', year: 2017 },
      { id: 3, title: 'Launches $9.99/month "one movie a day" plan', year: 2017 },
      { id: 4, title: 'Grows to 3 million users — but loses money on every one', year: 2018 },
      { id: 5, title: 'Service deteriorates, users flee, company shuts down', year: 2020 }
    ],
    failureReasons: [
      { id: 1, category: 'Unit Economics', description: 'The $9.99 plan lost money on almost every user — the more users they had, the more money they lost.' },
      { id: 2, category: 'Business Model', description: 'No sustainable path to profitability — relied on "data monetization" that never materialized.' },
      { id: 3, category: 'Trust', description: 'Constant changes, price hikes, and restrictions eroded user trust.' }
    ],
    caseStudy: {
      originStory: `MoviePass was founded in 2011 by Stacy Spikes and Hamet Watt, with a simple pitch: pay a monthly subscription, see movies in theaters as much as you want. But early iterations were limited and expensive. It wasn't until 2017, when Helios & Matheson Analytics (HMNY) acquired a majority stake and former Netflix and Redbox executive Mitch Lowe became CEO, that MoviePass became a household name — for better and for worse.`,
      marketProblem: `Movie tickets were getting more and more expensive, and theater attendance was declining. MoviePass believed that a subscription model would get people back to theaters — and that it could eventually monetize that audience in other ways (data, advertising, concessions, etc.). The problem was, the price they chose to achieve that growth was completely unsustainable.`,
      businessModel: `MoviePass paid theaters full price for every ticket its users bought — $8-15 on average. But it charged users only $9.99 a month for unlimited movies. The plan was simple in theory, insane in practice: lose money on every user, but make it up on "data monetization" and partnerships with theaters and studios — revenue streams that never actually materialized at scale.`,
      earlyGrowth: `The $9.99/month plan was a viral sensation. MoviePass grew from 20,000 subscribers to over 3 million in less than a year. It was a cultural phenomenon — everyone was talking about MoviePass, and everyone wanted in. But every new subscriber meant more money lost. HMNY's stock skyrocketed — then crashed hard as reality set in.`,
      fundingHistory: `2011-2016: Early rounds, ~$60M total.
2017-2018: HMNY pours in hundreds of millions as MoviePass grows.
2018-2019: More desperate funding, diluting existing shareholders massively.
Total raised: ~$650M (almost all lost).`,
      scalingPhase: `As MoviePass grew, the losses piled up. At its peak, the company was losing $20-25 million a month. It tried desperate hacks to save money: surge pricing, blackouts for popular movies, limiting users to only bad movies, forcing users to take photos of their ticket stubs — anything to reduce the number of tickets it had to pay for. These moves infuriated users, who started leaving in droves.`,
      warningSigns: `The warning signs were obvious from day one: if your core product loses money on every single customer, you don't have a business — you have a charity. MoviePass' "data monetization" plans were vague at best, and theaters showed no interest in sharing revenue with them. But the growth was intoxicating, and the company pressed on.`,
      strategicMistakes: `1. **Unsustainable pricing**: $9.99 for unlimited movies was never going to work — MoviePass was paying more for tickets than it was making in revenue.
2. **No path to profitability**: Data monetization and partnerships never materialized — the company never had a real Plan B.
3. **Eroding user trust**: Constant changes, restrictions, and bait-and-switch tactics turned customers against the company.
4. **Desperate hacks instead of real solutions**: Instead of fixing the business model, MoviePass tried to manipulate users into seeing fewer movies.`,
      collapseSequence: `By 2019, MoviePass was a shadow of its former self. The service was unreliable, users were leaving, and the company was running out of money. In September 2019, MoviePass suddenly shut down without warning, leaving millions of subscribers stranded. HMNY declared bankruptcy in 2020, and MoviePass was no more — though it made a surprise (and still questionable) comeback in 2023.`,
      whyFailed: `MoviePass failed because its core business model was mathematically unsustainable. The company lost money on every single customer, and it never found a way to make up those losses. The "growth at all costs" mindset that worked for software companies was catastrophic for MoviePass, which had real marginal costs for every user. The company prioritized short-term hype over long-term sustainability — and paid the price.`,
      founderLessons: `Mitch Lowe later admitted: "We grew too fast, and we didn't have a plan to make money." The lessons are clear: know your unit economics inside and out, have a real path to profitability before you scale, and remember that growth without a business model is just a vanity metric — and an expensive one at that.`,
      keyTakeaways: [
        "If you lose money on every customer, you can't make it up in volume.",
        "Make sure your business model is mathematically sustainable — no exceptions.",
        "Growth at all costs is a terrible strategy if your core economics don't work.",
        "User trust is hard to gain and easy to lose — don't waste it with bait-and-switch tactics.",
        "If your only plan to make money is 'data monetization,' you probably don't have a real plan."
      ]
    }
  }
];

const combinedStartupMap = new Map();
// 1. Add all 413 normalized companies from seed.json
normalizedSeedStartups.forEach(st => combinedStartupMap.set(st.slug, st));
// 2. Add detailed initial and additional mock startups (overwriting with rich detailed case studies if matched)
initialMockStartups.forEach(st => combinedStartupMap.set(st.slug, st));
additionalStartups.forEach(st => combinedStartupMap.set(st.slug, st));

export const mockStartups = Array.from(combinedStartupMap.values());

// Export function to get startup by slug with fallback
export const getStartupBySlug = (slug) => {
  let startup = mockStartups.find(s => s.slug === slug);
  if (startup) return startup;
  
  // If not found, generate AI web intelligence report
  const nameMap = {
    'unacademy': 'Unacademy',
    'byjus': 'Byju\'s',
    'ola': 'Ola',
    'swiggy': 'Swiggy',
    'zepto': 'Zepto',
    'paytm': 'Paytm',
    'phonepe': 'PhonePe',
    'oyo': 'Oyo',
    'zomato': 'Zomato',
    'flipkart': 'Flipkart',
    'fab': 'Fab',
    'parse': 'Parse',
    'airware': 'Airware',
    'jawbone': 'Jawbone',
    'aereo': 'Aereo',
    'betterplace': 'Better Place',
    'beepi': 'Beepi',
    'homejoy': 'Homejoy',
    'secret': 'Secret'
  };
  const name = nameMap[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
  return generateWebIntelligenceReport(slug, name);
};

function getDomainPrecedents(ideaStr, industryStr) {
  const text = `${ideaStr} ${industryStr}`.toLowerCase();

  // 1. Dev / Code / SaaS / Software / AI / Infrastructure
  if (/code|developer|saas|software|ai|api|platform|cloud|dev|optimizer|optimiser|automation|tool|infrastructure/i.test(text)) {
    return [
      { name: 'Kite', industry: 'AI Dev Tools', funding: '$17M', deathYear: 2021, trapPattern: 'Free Tier Monetization Churn', similarityScore: 92, summary: 'AI code completion engine failed after failing to convert free developer users to paid subscriptions before GitHub Copilot dominated.' },
      { name: 'Parse', industry: 'B2B SaaS / Dev Tools', funding: '$7M', deathYear: 2017, trapPattern: 'Platform Lock-In & Margin Squeeze', similarityScore: 86, summary: 'Backend-as-a-Service developer platform shut down after acquisition due to monetization bottlenecks and platform lock-in.' },
      { name: 'RethinkDB', industry: 'Developer Infrastructure', funding: '$12M', deathYear: 2016, trapPattern: 'Engineering Over-indexing / GTM Failure', similarityScore: 81, summary: 'Open-source developer database collapsed after prioritizing technical elegance over commercial go-to-market execution.' },
      { name: 'Engine Yard', industry: 'Cloud Platform / PaaS', funding: '$75M', deathYear: 2017, trapPattern: 'Cloud Provider Commoditization', similarityScore: 78, summary: 'PaaS pioneer struggled to defend pricing margins against native AWS developer tools.' }
    ];
  }

  // 2. FinTech / Payments / Banking / Crypto
  if (/fintech|finance|bank|pay|credit|crypto|token|web3|wallet|invest|loan|trading/i.test(text)) {
    return [
      { name: 'Fast', industry: 'FinTech', funding: '$124M', deathYear: 2022, trapPattern: 'Premature Burn vs Low Revenue', similarityScore: 94, summary: 'One-click checkout startup collapsed after burning $10M/month while generating under $50M in annual revenue.' },
      { name: 'Plastiq', industry: 'FinTech / Payments', funding: '$140M', deathYear: 2023, trapPattern: 'Processing Margin Collapse', similarityScore: 88, summary: 'Credit card payment aggregator filed for bankruptcy due to unsustainable processing fee margins and debt service.' },
      { name: 'Frank', industry: 'FinTech / Ed', funding: '$20M', deathYear: 2023, trapPattern: 'Audited Due-Diligence Failure', similarityScore: 82, summary: 'Financial aid planning platform collapsed after audit revealed fabricated active user accounts during acquisition.' },
      { name: 'Celsius Network', industry: 'Crypto / DeFi', funding: '$850M', deathYear: 2022, trapPattern: 'Unhedged Liquidity Freeze', similarityScore: 79, summary: 'Crypto yield platform collapsed due to unhedged liquidity risk and insolvency during market contraction.' }
    ];
  }

  // 3. EdTech / Education
  if (/edtech|education|learn|student|school|tutor|course|exam/i.test(text)) {
    return [
      { name: 'Byju\'s', industry: 'EdTech', funding: '$5.8B', deathYear: 2024, trapPattern: 'Over-leveraged Debt & Acquisition Overreach', similarityScore: 95, summary: 'India\'s edtech unicorn collapsed after debt-funded aggressive acquisitions, accounting delays, and auditor resignations.' },
      { name: 'AltSchool', industry: 'EdTech', funding: '$175M', deathYear: 2019, trapPattern: 'Physical Capex vs Software Margins', similarityScore: 87, summary: 'Tech-enabled micro-school network failed due to excessive physical operating overhead outstripping software revenue.' },
      { name: 'Knewton', industry: 'EdTech / Adaptive Learning', funding: '$180M', deathYear: 2019, trapPattern: 'Long Enterprise Sales Cycles', similarityScore: 83, summary: 'Adaptive learning engine failed to scale B2B publisher contracts before capital reserves depleted.' },
      { name: 'TutorGroup', industry: 'EdTech', funding: '$300M', deathYear: 2020, trapPattern: 'CAC Subsidization Trap', similarityScore: 77, summary: 'Online tutoring platform struggled with high customer acquisition costs and low long-term student retention.' }
    ];
  }

  // 4. Hardware / Robotics / Consumer IoT
  if (/hardware|device|iot|robot|wearable|camera|drone|car|ev|gadget/i.test(text)) {
    return [
      { name: 'Juicero', industry: 'Consumer Hardware', funding: '$120M', deathYear: 2017, trapPattern: 'Overengineered Value Proposition', similarityScore: 93, summary: 'Connected juice press collapsed after consumers discovered juice packs could be manually squeezed without the $400 machine.' },
      { name: 'Jawbone', industry: 'Wearables', funding: '$1.0B', deathYear: 2017, trapPattern: 'Hardware Defect & Incumbent Dominance', similarityScore: 89, summary: 'Pioneer in wearable fitness trackers failed due to high hardware defect rates and intense competition from Apple Watch.' },
      { name: 'Anki', industry: 'AI Robotics', funding: '$200M', deathYear: 2019, trapPattern: 'Bill of Materials vs Willingness-to-Pay', similarityScore: 84, summary: 'Consumer AI robotics company failed after hardware manufacturing costs exceeded consumer willingness to pay.' },
      { name: 'Pebble', industry: 'Smartwatches', funding: '$26M', deathYear: 2016, trapPattern: 'Supply Chain Cash Trap', similarityScore: 79, summary: 'Smartwatch pioneer failed due to supply chain delays and aggressive market expansion by platform incumbents.' }
    ];
  }

  // 5. Media / Streaming / Content / Social
  if (/media|video|stream|content|game|movie|music|social|show|entertainment/i.test(text)) {
    return [
      { name: 'Quibi', industry: 'Media / Streaming', funding: '$1.75B', deathYear: 2020, trapPattern: 'Platform & Timing Disconnect', similarityScore: 96, summary: 'Mobile short-form video streaming service collapsed due to lack of TV casting support and COVID commute shift.' },
      { name: 'Vessel', industry: 'Media Subscriptions', funding: '$134M', deathYear: 2016, trapPattern: 'Paywall Audience Friction', similarityScore: 88, summary: 'Early-access video platform failed to convert free YouTube audiences to paid recurring subscriptions.' },
      { name: 'Rdio', industry: 'Music Streaming', funding: '$125M', deathYear: 2015, trapPattern: 'Licensing Royalty Squeeze', similarityScore: 82, summary: 'Music streaming service failed due to high record label licensing fees and competition from Spotify\'s ad-supported tier.' },
      { name: 'Vine', industry: 'Social Video', funding: '$30M', deathYear: 2016, trapPattern: 'Creator Monetization Loss', similarityScore: 78, summary: 'Short-form video app collapsed after failing to monetize creators before Instagram and TikTok dominated.' }
    ];
  }

  // 6. Food / Quick Delivery / Logistics / E-Commerce
  if (/food|delivery|grocery|restaurant|meal|kitchen|logistics|quick|ecommerce|retail|shop/i.test(text)) {
    return [
      { name: 'Webvan', industry: 'Grocery Delivery', funding: '$800M', deathYear: 2001, trapPattern: 'Premature Infrastructure Scaling', similarityScore: 95, summary: 'Online grocery delivery pioneer collapsed after building expensive automated warehouses ahead of customer demand.' },
      { name: 'Munchery', industry: 'Food Delivery', funding: '$125M', deathYear: 2019, trapPattern: 'Negative Unit Fulfillment Margin', similarityScore: 89, summary: 'On-demand meal delivery startup failed due to negative unit margins on food prep and last-mile delivery.' },
      { name: 'SpoonRocket', industry: 'Speed Delivery', funding: '$13M', deathYear: 2016, trapPattern: 'Subsidized Delivery Burn', similarityScore: 83, summary: '10-minute meal delivery startup collapsed due to severe last-mile delivery subsidies.' },
      { name: 'Fab.com', industry: 'E-Commerce', funding: '$330M', deathYear: 2015, trapPattern: 'Core Product Positioning Pivot Failure', similarityScore: 79, summary: 'Flash-sale e-commerce unicorn collapsed after pivoting away from core curated design goods.' }
    ];
  }

  // 7. HealthTech / Medical
  if (/health|medical|bio|pharma|care|doctor|patient|wellness|healthtech/i.test(text)) {
    return [
      { name: 'Theranos', industry: 'HealthTech', funding: '$700M', deathYear: 2018, trapPattern: 'Unvalidated Tech & Regulatory Action', similarityScore: 97, summary: 'Blood-testing startup collapsed following federal fraud investigations and unvalidated technology claims.' },
      { name: 'Olive AI', industry: 'Healthcare Automation', funding: '$902M', deathYear: 2023, trapPattern: 'Unscalable Enterprise Custom Integration', similarityScore: 88, summary: 'Healthcare workflow automation startup collapsed due to unscalable custom hospital integration costs.' },
      { name: 'Outcome Health', industry: 'HealthTech Advertising', funding: '$500M', deathYear: 2019, trapPattern: 'Fraudulent Audit Exposure', similarityScore: 84, summary: 'Point-of-care health screen network collapsed after overcharging pharmaceutical advertisers.' },
      { name: 'Proteus Digital Health', industry: 'Digital Health', funding: '$500M', deathYear: 2020, trapPattern: 'Insurer Reimbursement Lockout', similarityScore: 78, summary: 'Smart pill startup failed to secure insurer reimbursement despite FDA clearance.' }
    ];
  }

  // Default SaaS / Dev Fallback
  return [
    { name: 'Kite', industry: 'AI Dev Tools', funding: '$17M', deathYear: 2021, trapPattern: 'Free Tier Monetization Churn', similarityScore: 92, summary: 'AI code completion tool failed after failing to convert free developer users to paid tier before Copilot dominated.' },
    { name: 'Parse', industry: 'B2B SaaS / Dev Infrastructure', funding: '$7M', deathYear: 2017, trapPattern: 'Monetization Bottleneck', similarityScore: 86, summary: 'Backend-as-a-Service developer platform shut down due to monetization bottlenecks.' },
    { name: 'Fast', industry: 'FinTech / SaaS', funding: '$124M', deathYear: 2022, trapPattern: 'High Burn vs Low Traction', similarityScore: 82, summary: 'Burned $10M/month with low revenue scaling, leading to sudden shutdown.' },
    { name: 'RethinkDB', industry: 'Developer Infrastructure', funding: '$12M', deathYear: 2016, trapPattern: 'Engineering over GTM execution', similarityScore: 78, summary: 'Prioritized technical features over commercial distribution and go-to-market execution.' }
  ];
}

export function generateDynamicRiskScan(data = {}) {
  const idea = (data.idea || 'Startup Idea').trim();
  const industry = (data.industry || 'Technology').trim();
  const audience = (data.audience || 'Target Users').trim();
  const revenueModel = (data.revenueModel || 'Subscription').trim();
  const teamSize = (data.teamSize || '1-5').trim();
  const followUp = (data.followUpQuestion || '').trim();

  // Dynamic hash helper for deterministic variety based on user input string
  let hash = 0;
  const str = `${idea.toLowerCase()}_${industry.toLowerCase()}_${revenueModel.toLowerCase()}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  // Compute dynamic scores
  const isHighRiskCategory = /delivery|crypto|web3|hardware|consumer|social|metaverse|quick|grocery|nft/i.test(str);
  const baseScore = isHighRiskCategory ? 78 : 55;
  const riskScore = Math.min(95, Math.max(35, baseScore + (posHash % 17) - 8));

  const cac = Math.min(95, Math.max(40, 60 + (posHash % 25)));
  const retention = Math.min(95, Math.max(35, 55 + ((posHash >> 2) % 30)));
  const monetization = Math.min(95, Math.max(30, 50 + ((posHash >> 4) % 35)));
  const competition = Math.min(95, Math.max(50, 65 + ((posHash >> 6) % 25)));
  const timing = Math.min(95, Math.max(30, 45 + ((posHash >> 8) % 40)));

  // Retrieve relevant domain precedents
  const relatedList = getDomainPrecedents(idea, industry);

  if (followUp) {
    return {
      riskScore,
      riskBreakdown: { customerAcquisition: cac, retention, monetization, competition, timing },
      primaryRisk: cac > competition ? 'Customer Acquisition Cost (CAC)' : 'Market Competition',
      similarStartups: relatedList.map(s => ({ name: s.name, similarity: 75 + (posHash % 20), keyLesson: s.summary })),
      recommendations: [
        { priority: 'high', action: `De-risk "${idea.slice(0, 30)}" with 20 pre-orders from ${audience}`, rationale: 'Pre-selling validates willingness-to-pay before custom engineering.' }
      ],
      suggestedPivots: [
        { type: 'Niche Segment Pivot', description: `Focus strictly on high-value ${audience} rather than mass market.`, historicalExample: 'Slack pivoted from gaming to enterprise communications.' }
      ],
      consultantBrief: `## FOLLOW-UP ASSESSMENT: ${followUp.toUpperCase()}

Regarding your follow-up inquiry on **"${idea}"**:

### Strategic Recommendation
1. **Focus on Unit Contribution Margin**: Ensure revenue per user exceeds fully burdened CAC + support costs.
2. **Day-30 Retention Benchmark**: Target >30% retention before ramping paid marketing.
3. **Pre-Sell Validation**: Secure non-refundable deposits from **${audience}** to prove commercial demand.`
    };
  }

  const formattedTeamScale = (teamSize || '').toLowerCase().includes('member') || (teamSize || '').toLowerCase().includes('team')
    ? teamSize
    : `${teamSize || '2'} Team Members`;

  const brief = `## FORENSIC AUDIT REPORT: ${idea.toUpperCase()}

Cross-referenced **"${idea}"** against **413 verified postmortems** in **${industry}**.

### 1. Headline Audit Profile: ${riskScore}/100 (${riskScore > 70 ? 'HIGH RISK' : riskScore > 50 ? 'MODERATE RISK' : 'LOW RISK'})
* **Target Segment**: ${audience}
* **Monetization Model**: ${revenueModel}
* **Team Scale**: ${formattedTeamScale}

### 2. Failure Vector Breakdown
* **Customer Acquisition (CAC)**: **${cac}% Risk** — High acquisition cost relative to customer lifetime value.
* **Cohort Retention**: **${retention}% Churn Risk** — Risk of steep drop-off after month 1.
* **Monetization & Unit Margin**: **${monetization}% Vulnerability** — Margin compression risk under scale.
* **Market Competition**: **${competition}% Threat** — Saturation by incumbent offerings.
* **Market Timing**: **${timing}% Sensitivity** — Macro market adoption readiness.

### 3. Strategic De-Risking Action Plan
* **Pre-Build Validation**: Conduct 30+ discovery interviews with target users (**${audience}**) asking about past workflow pain points and spending behavior.
* **Unit Economic Checkpoint**: Calculate true gross margin per customer before allocating capital to marketing.
* **Cohort Retention Moat**: Do not scale paid user acquisition until Day-30 retention exceeds 30%.`;

  return {
    riskScore,
    riskBreakdown: { customerAcquisition: cac, retention, monetization, competition, timing },
    primaryRisk: cac >= competition ? 'Customer Acquisition Cost (CAC)' : 'Market Competition',
    similarStartups: relatedList.map((s, idx) => {
      const simMatch = Math.min(97, Math.max(68, (s.similarityScore || 92) - (idx * 6) + (posHash % 3)));
      return {
        name: s.name,
        industry: s.industry || industry,
        funding: s.funding || '$15M',
        deathYear: s.deathYear || 2021,
        trapPattern: s.trapPattern || 'Market Timing & PMF Friction',
        similarity: simMatch,
        keyLesson: s.summary
      };
    }),
    recommendations: [
      { priority: 'high', action: `Validate ${audience} demand before building custom code`, rationale: 'Historical failures in this space mistook initial interest for willingness to pay.' },
      { priority: 'high', action: 'Lock in positive contribution margins on day 1', rationale: 'Venture funding cannot subsidize negative unit economics indefinitely.' },
      { priority: 'medium', action: 'Track Day-30 active user retention benchmark', rationale: 'Acquisition without retention accelerates total cash burn.' }
    ],
    suggestedPivots: [
      { type: 'Niche Segment Pivot', description: `Target a high-value sub-segment of ${audience} with immediate budget.`, historicalExample: 'Slack pivoted from a gaming platform to enterprise team communications.' },
      { type: 'Feature Focus Pivot', description: 'Strip non-essential features and double down on the single highest-frequency utility.', historicalExample: 'Instagram stripped check-in features to focus 100% on photo sharing.' }
    ],
    consultantBrief: brief
  };
}

export const mockRiskScan = generateDynamicRiskScan();

export function generateDynamicAiResearch(rawQuery = '', followUpQuestion = '') {
  const isFollowUp = Boolean(followUpQuestion && followUpQuestion.trim().length > 0);
  const lowerQuery = (rawQuery || '').toLowerCase().trim();
  const lowerFollowUp = (followUpQuestion || '').toLowerCase().trim();

  // -------------------------------------------------------------
  // Scenario A: Follow-up Question Handling (HIGHEST PRECEDENCE)
  // -------------------------------------------------------------
  if (isFollowUp) {
    // A1: Action Plan / Recommendations / Prevention
    if (lowerFollowUp.includes('recommend') || lowerFollowUp.includes('action') || lowerFollowUp.includes('plan') || lowerFollowUp.includes('avoid') || lowerFollowUp.includes('prevent') || lowerFollowUp.includes('give')) {
      return {
        aiSummary: `## FOUNDER DE-RISKING ACTION PLAN

Based on our failure database intelligence for **"${rawQuery}"**, here is the 4-step framework to de-risk your venture:

### Step 1: Pre-Build Validation (0 - 3 Months)
- Conduct 50+ qualitative customer interviews focusing on past user behavior, not future promises.
- Secure 20+ non-refundable deposits or LOIs before writing custom code.

### Step 2: Unit Margin Checkpoint (3 - 6 Months)
- Enforce strict Rule: **True Contribution Margin** \`[Revenue - COGS - Payment Fees - Support]\` MUST be positive on day 1.
- Do NOT subsidize CAC with venture funding if LTV/CAC < 3.0x.

### Step 3: Cohort Retention Guardrail (6 - 12 Months)
- Maintain day-30 user retention above **30%** before initiating paid customer acquisition campaigns.

### Step 4: Minimum 18-Month Runway Buffer
- Maintain a cash runway buffer of at least 18 months at all times to withstand macro market contraction.`,
        timeline: [
          { year: 'Phase 1', startup: 'Validation', event: '50 qualitative customer interviews & 20 pre-orders' },
          { year: 'Phase 2', startup: 'Unit Margins', event: 'Positive contribution margin achieved' },
          { year: 'Phase 3', startup: 'Cohort Retention', event: '30%+ Day-30 retention benchmark secured' }
        ],
        keyLessons: [
          { lesson: 'Validation Checkpoint', details: 'Never build before pre-selling to 20 paying customers.' },
          { lesson: 'Runway Guardrail', details: 'Freeze non-essential headcount when runway drops below 14 months.' }
        ],
        sources: ['wework', 'byjus', 'quibi'],
        relatedStartups: (seedData || []).slice(0, 4)
      };
    }

    // A2: Deep Dive / Explain deeper / Reasoning & Evidence
    if (lowerFollowUp.includes('deep') || lowerFollowUp.includes('depth') || lowerFollowUp.includes('reasoning') || lowerFollowUp.includes('evidence') || lowerFollowUp.includes('explain') || lowerFollowUp.includes('more')) {
      return {
        aiSummary: `## DEEP DIVE FORENSIC ANALYSIS & EVIDENCE

### 1. Primary Structural Root Causes
When analyzing **"${rawQuery}"**, forensic evidence points to three compounding inflection points:

* **Top-of-Funnel Vanity Metric Trap**: Teams prioritized gross signup volume while ignoring Day-30 cohort retention decay.
* **Negative Contribution Margin**: Every new user acquired increased net cash burn rate.
* **Over-Leveraged Overhead**: Headcount and lease commitments expanded by 3x-5x ahead of proven product utility.

### 2. Quantitative Industry Evidence
- **Runway Consumption Rate**: Average survival window post-Series A/B was 16 months.
- **LTV/CAC Decay**: Acquisition cost inflated by **2.4x** within 9 months of paid scaling.
- **Cohort Retention Floor**: Day-90 active retention plummeted below **11%**.`,
        timeline: [
          { year: 'Inflection 1', startup: 'Vanity Metrics', event: 'User downloads masked 90% day-30 churn' },
          { year: 'Inflection 2', startup: 'Burn Acceleration', event: 'Customer acquisition cost exceeded LTV by 2.5x' },
          { year: 'Inflection 3', startup: 'Liquidation', event: 'Inability to extend runway led to asset sale' }
        ],
        keyLessons: [
          { lesson: 'Cohort Retention Law', details: 'Do not scale paid user acquisition if day-30 retention < 30%.' },
          { lesson: 'Margin Guardrail', details: 'Ensure positive unit contribution margin prior to scaling.' }
        ],
        sources: ['theranos', 'quibi', 'byjus', 'wework'],
        relatedStartups: (seedData || []).slice(0, 4)
      };
    }

    // A3: Examples / Case Studies
    if (lowerFollowUp.includes('example') || lowerFollowUp.includes('case') || lowerFollowUp.includes('show')) {
      const examples = (seedData || []).slice(0, 3);
      return {
        aiSummary: `## HISTORICAL CASE STUDIES: ${rawQuery.toUpperCase()}

Here are 3 prominent postmortems from our failure database illustrating this exact pattern:

${examples.map(ex => `### ${ex.name} (${ex.industry || 'Tech'})
* **Capital Raised**: ${ex.funding || '$50M'}
* **Operational Breakdown**: ${ex.productDescription || ex.summary || ex.failureCategory}
* **Key Red Flag**: ${Array.isArray(ex.failureReasons) ? ex.failureReasons[0] : ex.summary}`).join('\n\n')}

### Synthesis across Case Studies
All three ventures attempted to overcome fundamental unit-economic deficits through aggressive marketing spend rather than product iteration.`,
        timeline: examples.map(ex => ({
          year: ex.yearClosed || 2022,
          startup: ex.name,
          event: `Liquidated after raising ${ex.funding || 'capital'}`
        })),
        keyLessons: examples.map(ex => ({
          lesson: `${ex.name} Case Study`,
          details: ex.summary || 'Validate demand before scaling.'
        })),
        sources: examples.map(ex => ex.slug || ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
        relatedStartups: examples
      };
    }

    // Generic Follow-up Answer
    return {
      aiSummary: `## FOLLOW-UP ANALYSIS: ${followUpQuestion.toUpperCase()}

Regarding your follow-up query on **"${rawQuery}"**:

### Key Strategic Takeaways
1. **Execution Velocity vs Retention**: High growth without retention accelerates total capital loss.
2. **Moat Protection**: Proprietary unit economics or switching costs are mandatory before entering competitive markets.
3. **Disciplined Capital Allocation**: Startups keeping lean burn rates survived macroeconomic downturns at a **3.4x higher rate**.`,
      timeline: [
        { year: 'Takeaway 1', startup: 'Retention', event: 'Day-30 retention dictates long-term survival' },
        { year: 'Takeaway 2', startup: 'Margins', event: 'Unit margins must be positive from launch' }
      ],
      keyLessons: [
        { lesson: 'Execution Checkpoint', details: 'Ensure unit economics are positive before scaling.' }
      ],
      sources: ['byjus', 'quibi', 'wework'],
      relatedStartups: (seedData || []).slice(0, 4)
    };
  }

  // -------------------------------------------------------------
  // Scenario B: Initial Search Query Handling
  // -------------------------------------------------------------

  // Find explicit seeded company matches using exact word boundaries
  const seededMatches = (seedData || []).filter(item => {
    const name = (item.name || '').trim();
    const slug = (item.slug || '').trim();
    if (!name || name.length < 3) return false;
    
    // Avoid matching common English words as company names
    const commonWords = ['the', 'and', 'for', 'fast', 'show', 'that', 'with', 'from', 'have', 'this', 'that', 'failed', 'poor', 'burn', 'cash'];
    if (commonWords.includes(name.toLowerCase())) return false;

    // Use word boundary regex matching
    const nameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const slugRegex = slug.length >= 3 ? new RegExp(`\\b${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i') : null;

    return nameRegex.test(lowerQuery) || (slugRegex && slugRegex.test(lowerQuery));
  });

  // B1: Comparison query between 2 seeded companies
  if (seededMatches.length >= 2) {
    const c1 = seededMatches[0];
    const c2 = seededMatches[1];
    return {
      aiSummary: `## COMPARATIVE FORENSIC ANALYSIS: ${c1.name.toUpperCase()} VS ${c2.name.toUpperCase()}

An analysis of our failure intelligence database reveals distinct postmortem dynamics between **${c1.name}** and **${c2.name}**.

### Side-by-Side Comparison

| Metric | ${c1.name} | ${c2.name} |
| --- | --- | --- |
| **Industry** | ${c1.industry || 'Tech'} | ${c2.industry || 'Tech'} |
| **Capital Raised** | ${c1.funding || '$50M'} | ${c2.funding || '$50M'} |
| **Primary Failure Cause** | ${c1.failureCategory || c1.topFailureReason || 'Execution Breakdown'} | ${c2.failureCategory || c2.topFailureReason || 'Execution Breakdown'} |
| **Active Period** | ${c1.yearFounded || 2015} – ${c1.yearClosed || 2022} | ${c2.yearFounded || 2015} – ${c2.yearClosed || 2022} |

### Strategic Dissection

1. **${c1.name} Pathology**:
   ${c1.productDescription || c1.summary || c1.tagline || 'Suffered from severe strategic missteps and product disconnect.'}

2. **${c2.name} Pathology**:
   ${c2.productDescription || c2.summary || c2.tagline || 'Ceased operations after failing to build sustainable unit economics or product-market fit.'}

### Key Lessons for Founders
* **Unit Economics First**: Capital scaling cannot subsidize negative contribution margins.
* **Validation Moat**: Ensure core product utility is proven before capital-intensive expansion.`,
      timeline: [
        { year: c1.yearClosed || 2022, startup: c1.name, event: `Operations dissolved (${c1.failureCategory || 'Shutdown'})` },
        { year: c2.yearClosed || 2022, startup: c2.name, event: `Operations dissolved (${c2.failureCategory || 'Shutdown'})` }
      ],
      keyLessons: [
        { lesson: `${c1.name} Precedent`, details: Array.isArray(c1.failureReasons) ? c1.failureReasons[0] : (c1.summary || 'Validate demand before scaling.') },
        { lesson: `${c2.name} Precedent`, details: Array.isArray(c2.failureReasons) ? c2.failureReasons[0] : (c2.summary || 'Maintain operational discipline.') }
      ],
      sources: [c1.slug || 'company1', c2.slug || 'company2'],
      relatedStartups: [c1, c2]
    };
  }

  // B2: Single explicit seeded company match (e.g. Theranos, WeWork, Juicero)
  if (seededMatches.length === 1) {
    const c = seededMatches[0];
    const failDetails = Array.isArray(c.failureReasons) ? c.failureReasons.join('; ') : (c.summary || c.tagline || 'Operational failure.');
    return {
      aiSummary: `## FORENSIC DOSSIER: ${c.name.toUpperCase()}

**${c.name}** was a high-profile **${c.industry || 'Technology'}** startup based in **${c.city || c.country || 'USA'}** that raised **${c.funding || 'substantial venture capital'}** before dissolving in **${c.yearClosed || 2022}**.

### Executive Summary & Failure Pathology
${c.productDescription || c.summary || c.tagline || 'Detailed postmortem analysis of operational collapse.'}

### Primary Breakdown: ${c.failureCategory || 'Market Execution'}
- **Capital Raised**: ${c.funding || '$50M'}
- **Active Years**: ${c.yearFounded || 2015} to ${c.yearClosed || 2022}
- **Key Failure Factors**: ${failDetails}

### Strategic Lessons for Founders
1. **The Validation Law**: Validate problem-solution fit with 50+ qualitative interviews before building complex infrastructure.
2. **Burn Rate Discipline**: Keep fixed overhead low until day-30 cohort retention proves product-market fit.
3. **Moat Protection**: Ensure core technological claims are transparent and independently verified.`,
      timeline: [
        { year: c.yearFounded || 2015, startup: c.name, event: `Founded in ${c.city || c.country || 'USA'}` },
        { year: c.yearClosed || 2022, startup: c.name, event: `Ceased operations and liquidated assets` }
      ],
      keyLessons: [
        { lesson: `${c.name} Core Lesson`, details: failDetails }
      ],
      sources: [c.slug || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')],
      relatedStartups: [c]
    };
  }

  // B3: Category / Failure Cause / Theme Query (e.g. Poor PMF, Cash Burn, EdTech, Food Delivery, Crypto, Unit Economics)
  const categoryKeywords = [
    { key: 'pmf', label: 'NO PRODUCT-MARKET FIT (PMF)', filter: s => JSON.stringify(s).toLowerCase().includes('pmf') || JSON.stringify(s).toLowerCase().includes('market timing') || JSON.stringify(s).toLowerCase().includes('product-market fit') },
    { key: 'cash', label: 'CASH BURN & OVER-FUNDING', filter: s => JSON.stringify(s).toLowerCase().includes('cash') || JSON.stringify(s).toLowerCase().includes('burn') || JSON.stringify(s).toLowerCase().includes('capital') },
    { key: 'unit', label: 'UNPROFITABLE UNIT ECONOMICS', filter: s => JSON.stringify(s).toLowerCase().includes('unit') || JSON.stringify(s).toLowerCase().includes('margin') || JSON.stringify(s).toLowerCase().includes('cost') },
    { key: 'food', label: 'FOOD DELIVERY & ON-DEMAND COLLAPSE', filter: s => JSON.stringify(s).toLowerCase().includes('food') || JSON.stringify(s).toLowerCase().includes('delivery') || JSON.stringify(s).toLowerCase().includes('meal') },
    { key: 'edtech', label: 'EDTECH & LEARNING PLATFORMS', filter: s => JSON.stringify(s).toLowerCase().includes('edtech') || JSON.stringify(s).toLowerCase().includes('learn') || JSON.stringify(s).toLowerCase().includes('tutor') },
    { key: 'crypto', label: 'CRYPTO & WEB3 INSOLVENCY', filter: s => JSON.stringify(s).toLowerCase().includes('crypto') || JSON.stringify(s).toLowerCase().includes('web3') || JSON.stringify(s).toLowerCase().includes('token') },
    { key: 'fraud', label: 'GOVERNANCE & FRAUD', filter: s => JSON.stringify(s).toLowerCase().includes('fraud') || JSON.stringify(s).toLowerCase().includes('sec') || JSON.stringify(s).toLowerCase().includes('investigation') },
  ];

  const matchedCat = categoryKeywords.find(c => lowerQuery.includes(c.key)) || categoryKeywords[0];
  const matchedStartups = (seedData || []).filter(matchedCat.filter).slice(0, 5);

  let cleanTopicTitle = rawQuery.replace(/compare|show|what|why|did|how|failed|patterns|startups|because|of|poor|the|and/gi, '').trim();
  cleanTopicTitle = cleanTopicTitle ? cleanTopicTitle.toUpperCase() : matchedCat.label;

  return {
    aiSummary: `## RESEARCH DOSSIER: ${matchedCat.label}

Our failure intelligence database analyzed **${matchedStartups.length} related postmortems** matching your research query: *"${rawQuery}"*.

### Notable Postmortem Precedents in Dataset

${matchedStartups.map(m => `* **${m.name}** (${m.industry || 'Tech'}, Raised ${m.funding || '$50M'}): ${m.productDescription || m.summary || m.tagline}`).join('\n\n')}

### Core Pathology & Red Flags Identified
1. **Premature Scaling**: Customer acquisition spend expanded before securing 30%+ day-30 cohort retention.
2. **Subsidized Economics**: Growth figures heavily inflated by unsustainable promotional discounts.

### Strategic Recommendations for Founders
* **Quantitative Cohort Audit**: Benchmark week-4 organic retention prior to Series A fundraising.
* **Positive Contribution Margin**: Ensure unit economics are net-positive inclusive of all delivery and support overhead.`,
    timeline: matchedStartups.slice(0, 4).map(m => ({
      year: m.yearClosed || 2022,
      startup: m.name,
      event: `Dissolved due to ${m.failureCategory || 'Operational Breakdown'}`
    })),
    keyLessons: matchedStartups.slice(0, 2).map(m => ({
      lesson: `${m.name} Historical Precedent`,
      details: Array.isArray(m.failureReasons) ? m.failureReasons[0] : (m.summary || 'Validate demand before scaling.')
    })),
    sources: matchedStartups.map(m => m.slug || m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')),
    relatedStartups: matchedStartups
  };
}

export const mockAiResponse = generateDynamicAiResearch("Compare Byju's and Quibi.");

export const mockPlaybook = {
  summary: `## THE FOUNDER PLAYBOOK: DE-RISKING THE ABYSS

This playbook is a strategic diagnostic tool synthesized from the autopsies of 500+ failed ventures. It is designed to act as your operational guardrail, helping you navigate the delicate transition from validation to scale.

### The Core Mandate: Validate or Die

Most founders fail because they build a solution for a problem that does not exist. Your primary objective is to prove—with high-fidelity data—that your target audience has a painful, budget-allocated problem that your product solves uniquely.

### The 90-Day Tactical Roadmap

| Phase | Core Objective | Metric of Success |
| --- | --- | --- |
| **Discovery** | 50+ Customer Interviews | >80% problem resonance score |
| **Validation** | Landing Page + Paid Deposit | >5% conversion rate on cold traffic |
| **Fulfillment** | Manual MVP Delivery | >40% week-4 cohort retention |

### The Death Traps to Avoid
* **The Custom Build Trap:** Building custom software before validating demand with spreadsheets and manual workflows.
* **The Marketing Subsidization:** Using paid ads to buy users before you have proven organic word-of-mouth referral loops.`,
  checklist: [
    "Conduct 50+ qualitative interviews focusing on the user's current manual workarounds.",
    "Build a high-fidelity landing page with a clear value proposition and a paid reservation hook.",
    "Define your 'North Star' retention metric (e.g., weekly active usage) and instrument tracking.",
    "Establish your baseline unit economics: calculate the exact cost of service delivery."
  ],
  risks: [
    "Lack of validated demand: building a product based on assumptions.",
    "Broken unit economics: high variable costs of fulfillment.",
    "Incumbent displacement: underestimating the defensive moats of established players."
  ],
  nextSteps: [
    "Map your customer journey to identify the single most painful friction point.",
    "Set up a simple Carrd landing page with a Stripe payment button for pre-orders.",
    "Interview 5 potential users this week using the 'Mom Test' methodology."
  ]
};

export { generateMockExternalSources };

export function generateDynamicAutopsy(data = {}) {
  const content = (data.deckContent || '').trim();
  const ind = (data.industry || 'SaaS').trim();
  const followUp = (data.followUpQuestion || '').trim();

  let hash = 0;
  const str = `${content.toLowerCase()}_${ind.toLowerCase()}`;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const posHash = Math.abs(hash);

  const riskScore = Math.min(95, Math.max(45, 68 + (posHash % 19) - 5));
  const overallRisk = riskScore > 75 ? 'Lethal' : riskScore > 55 ? 'High' : 'Moderate';

  if (followUp) {
    return {
      overallRisk,
      pathologistVerdict: `Follow-up assessment regarding: "${followUp}"`,
      consultantBrief: `## AUTOPSY FOLLOW-UP: ${followUp.toUpperCase()}

Regarding your pitch deck inquiry:

### Pathologist Recommendation
1. **Remove Top-Down TAM Claims**: Replace generic $50B market claims with a bottom-up calculation: \`(Target Accounts in ICP) x (Annual Contract Value)\`.
2. **Prove Paid Acquisition CAC**: Investors will penalize decks that rely solely on "organic word of mouth" without showing a tested CAC channel.
3. **Quantify Pre-Orders**: Add a slide proving 10+ signed LOIs or non-refundable user deposits.`
    };
  }

  const brief = `## PITCH DECK PATHOLOGY REPORT: ${ind.toUpperCase()} DECK

Our Pitch Deck Pathology Engine has cross-referenced your deck content against **413 historical postmortems** in the **${ind}** sector.

### 1. Headline Lethality Index: ${riskScore}/100 (${overallRisk.toUpperCase()} RISK)
* **Analyzed Sector**: ${ind}
* **Deck Content Preview**: ${content.length > 0 ? content.slice(0, 150) + '...' : 'Sample Pitch Deck'}

### 2. Lethal Slide Flaws Identified
* **Market Size (TAM Slide)**: **Lethal Risk** — Relying on generic top-down industry reports rather than bottom-up willingness to pay.
* **Go-To-Market (GTM Slide)**: **High Risk** — Assuming low customer acquisition cost on paid ad channels without proving organic viral loops.
* **Monetization & Pricing**: **Moderate Risk** — Subsidizing free tier usage with no clear enterprise conversion trigger.
* **Competitive Moat**: **Lethal Risk** — High vulnerability to incumbent platform commoditization.

### 3. Historical Failure Precedents
* **Fast** (FinTech, $124M): Pitch deck projected rapid GTM scaling via 1-click checkout, but burned $10M/month with low revenue.
* **Kite** (AI Dev Tools, $17M): Deck assumed developers would pay for code completion before GitHub Copilot launched a free tier.
* **Quibi** (Media, $1.75B): Pitch deck overstated consumer willingness to pay for short-form mobile video.
* **Parse** (B2B SaaS, $7M): Failed to convert free tier developers to profitable enterprise contracts.

### 4. Pathologist Action Plan to De-Risk Deck
* **Slide 3 (TAM)**: Re-calculate TAM using bottom-up metric: \`ICP Accounts x Contract Price\`.
* **Slide 6 (GTM)**: Present CAC/LTV unit economics from 20 pre-orders rather than ad spend projections.
* **Slide 8 (Moat)**: Explicitly address how your product defends against incumbent platform copies.`;

  return {
    overallRisk,
    pathologistVerdict: `Your pitch deck exhibits ${riskScore > 70 ? 'critical lethal vulnerabilities' : 'structural risks'} that mirror 413 historical startup postmortems in ${ind}.`,
    executiveSummary: `Primary vulnerability identified in Market Size (TAM) and Go-To-Market execution. De-risk your slide deck by proving bottom-up unit economics and 10+ user pre-orders before pitching VCs.`,
    lethalWeaknesses: [
      { slide: 'Market Size (TAM)', issue: 'Top-down generic market claims without bottom-up ICP proof.', historicalPrecedent: 'Similar to Quibi\'s $1.75B top-down market size assumption.' },
      { slide: 'Go-To-Market (GTM)', issue: 'Relying on low-cost paid ad channels without viral retention metrics.', historicalPrecedent: 'Fast burned $124M relying on unsubsidized ad spend.' },
      { slide: 'Competitive Moat', issue: 'Incumbent platform commoditization risk.', historicalPrecedent: 'Kite collapsed when GitHub launched Copilot.' }
    ],
    recommendedImprovements: [
      { title: 'Bottom-Up Market Calculation', description: 'Replace top-down TAM with exact target account pricing.' },
      { title: 'CAC / LTV Proof', description: 'Show actual acquisition cost from pilot users.' },
      { title: 'Defensible Moat', description: 'Highlight proprietary data or network effects.' }
    ],
    consultantBrief: brief
  };
}

export const mockPitchDeckAutopsy = generateDynamicAutopsy();

export function generateDynamicGhostChatResponse(slug = '', message = '', history = []) {
  const msg = (message || '').toLowerCase();
  const cleanSlug = (slug || 'default').toLowerCase().replace(/[^a-z0-9]/g, '');

  const startupDatabase = {
    kite: {
      name: 'Kite',
      industry: 'AI Dev Tools',
      funding: '$17M',
      deathYear: 2021,
      story: 'We built AI code completions years before ChatGPT and Copilot. Our tech was ahead of its time, but we made the editor engine completely free and failed to build an enterprise sales motion before Copilot launched.',
      whyFailed: 'We couldn\'t convert our 500,000 free developer users into paying customers fast enough. When GitHub introduced Copilot at $10/month integrated right into VS Code, our distribution channel was completely choked off.',
      burnInfo: 'We raised $17M from top VCs like Trinity Ventures and Craft Ventures. Most of it went to training customized language models on AWS GPU clusters, which cost over $150k per month.',
      advice: 'Never rely on free-tier developer love alone. Build enterprise security compliance, SSO, and team billing on day one. Distribution beats product elegance every single time.'
    },
    parse: {
      name: 'Parse',
      industry: 'B2B SaaS / Dev Infrastructure',
      funding: '$7M',
      deathYear: 2017,
      story: 'We pioneered Backend-as-a-Service for mobile apps. Facebook acquired us for $85M in 2013, but corporate priorities shifted toward ad monetization and developer APIs were sunsetted.',
      whyFailed: 'We relied on a single corporate acquirer to fund host infrastructure. When Facebook pivoted focus toward video and ad formats, Parse was shut down despite serving over 500,000 active mobile apps.',
      burnInfo: 'We raised $7M before being acquired by Facebook for $85M. The real lesson is that getting acquired isn\'t always the end of the story — platform lock-in can destroy a thriving developer ecosystem.',
      advice: 'Maintain independent infrastructure controls. If you build on top of a third-party platform or sell to a giant, ensure your open-source fallback strategy is rock solid.'
    },
    fast: {
      name: 'Fast',
      industry: 'FinTech / Checkout',
      funding: '$124M',
      deathYear: 2022,
      story: 'We set out to build the fastest 1-click checkout for e-commerce. We raised over $120M from Stripe and Index Ventures, but our cash burn outpaced our actual revenue growth by 100x.',
      whyFailed: 'We were burning over $10M per month on massive tech-conference sponsorships, executive salaries, and marketing blitzes while generating under $50k in total annual revenue.',
      burnInfo: 'We burned through $124M in under 24 months. We mistook venture capital raised for real commercial traction and product-market fit.',
      advice: 'Capital raised is not a metric of success. Validate net processing fee revenue before scaling sales reps or spending millions on brand advertising.'
    },
    quibi: {
      name: 'Quibi',
      industry: 'Media / Streaming',
      funding: '$1.75B',
      deathYear: 2020,
      story: 'We raised $1.75B to revolutionize short-form mobile video with Hollywood production quality. We launched right as COVID lockdowns hit, and mobile-only viewing clashed with stay-at-home screen habits.',
      whyFailed: 'We blocked users from taking screenshots or sharing clips on social media to protect copyright, killing viral organic growth. Plus, TikTok and YouTube offered free, personalized content that users preferred.',
      burnInfo: 'We spent $1.75B. Over $100M was spent on premium Hollywood content contracts ($100k per minute) before proving users would pay $4.99/month for mobile-only episodes.',
      advice: 'Listen to user behavior, not your own executive pedigree. If your users want social sharing and TV casting, don\'t lock your content inside a walled garden.'
    },
    theranos: {
      name: 'Theranos',
      industry: 'HealthTech',
      funding: '$700M',
      deathYear: 2018,
      story: 'We claimed to run hundreds of blood tests from a single pinprick of blood. We signed massive retail partnerships with Walgreens, but our underlying proprietary hardware never worked reliably.',
      whyFailed: 'We prioritized secrecy, PR narrative, and board prestige over peer-reviewed scientific validation and FDA compliance. The gap between marketing claims and physical reality led to collapse.',
      burnInfo: 'We raised $700M at a peak $9B valuation without ever publishing peer-reviewed data in scientific journals.',
      advice: 'In healthcare and deep tech, intellectual honesty is everything. Never fake technical validation — lives and regulatory compliance depend on truth.'
    },
    byjus: {
      name: 'Byju\'s',
      industry: 'EdTech',
      funding: '$5.8B',
      deathYear: 2024,
      story: 'We became India\'s most valuable edtech startup valued at $22B. We embarked on a massive debt-funded global acquisition spree, buying Aakash, WhiteHat Jr, and Epic.',
      whyFailed: 'Aggressive sales tactics, debt-funded acquisitions, delayed financial audits, and governance breakdowns led to severe liquidity default when schools reopened post-pandemic.',
      burnInfo: 'We raised $5.8B in equity and $1.2B in Term Loan B debt. Over-leveraging during cheap capital cycles led to catastrophic debt service default.',
      advice: 'Acquisitions cannot fix broken organic retention. Build a sustainable core unit economic engine before attempting multi-billion dollar M&A.'
    },
    webvan: {
      name: 'Webvan',
      industry: 'E-Commerce / Grocery Delivery',
      funding: '$800M',
      deathYear: 2001,
      story: 'We built automated mega-warehouses across 26 cities for 30-minute online grocery delivery during the dot-com era.',
      whyFailed: 'We built $30M automated fulfillment centers in cities before testing customer order density. Delivery routes were sparse, resulting in negative margins on every delivery.',
      burnInfo: 'We spent $800M in 24 months. Infrastructure capex outpaced gross order margins by a factor of ten.',
      advice: 'Do non-scalable things first. Test local route density with manual vans before investing tens of millions in automated fulfillment centers.'
    }
  };

  let ghost = null;
  for (const [key, g] of Object.entries(startupDatabase)) {
    if (cleanSlug.includes(key) || key.includes(cleanSlug)) {
      ghost = g;
      break;
    }
  }

  if (!ghost) {
    const capitalizedName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ') : 'Our Startup';
    ghost = {
      name: capitalizedName,
      industry: 'Technology',
      funding: '$15M',
      deathYear: 2022,
      story: `We set out to build ${capitalizedName} to transform the industry. We raised capital and grew fast, but ran out of runway before finding repeatable product-market fit.`,
      whyFailed: `We struggled with high customer acquisition costs relative to retention. Our burn rate exceeded net revenue, and when market conditions tightened, we couldn't raise our next round.`,
      burnInfo: `We burned through our funding in under 2 years. Most of it went to customer acquisition marketing and engineering team expansion before proving unit economics.`,
      advice: `Focus relentlessly on Day-30 retention and positive contribution margins. Don't scale paid marketing until your organic retention curve flattens.`
    };
  }

  if (msg.includes('why') || msg.includes('fail') || msg.includes('wrong') || msg.includes('happen') || msg.includes('shut')) {
    return `Looking back from the grave, our downfall at ${ghost.name} came down to one core flaw: ${ghost.whyFailed}`;
  }

  if (msg.includes('fund') || msg.includes('money') || msg.includes('burn') || msg.includes('raise') || msg.includes('investor') || msg.includes('cost')) {
    return `Here's the honest truth about our finances: ${ghost.burnInfo}`;
  }

  if (msg.includes('advice') || msg.includes('different') || msg.includes('lesson') || msg.includes('learn') || msg.includes('recommend') || msg.includes('founder')) {
    return `If I could speak to every founder building in ${ghost.industry} today, I'd say: ${ghost.advice}`;
  }

  if (msg.includes('story') || msg.includes('who') || msg.includes('what') || msg.includes('about') || msg.includes('hi') || msg.includes('hello')) {
    return `${ghost.story}`;
  }

  return `At ${ghost.name}, we learned the hard way. ${ghost.whyFailed} My advice for your journey: ${ghost.advice}`;
}

