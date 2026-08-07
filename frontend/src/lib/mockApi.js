import seedData from '../data/seedData.json';
export { fetchFirestoreStartups, fetchFirestoreStartupBySlug } from './firebaseData';

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

export const mockRiskScan = {
  riskScore: 72,
  riskBreakdown: {
    customerAcquisition: 65,
    retention: 70,
    monetization: 60,
    competition: 80,
    timing: 75
  },
  recommendations: [
    { priority: 'high', action: 'Validate PMF aggressively', rationale: 'Most failures here stem from lack of product-market fit.' },
    { priority: 'medium', action: 'Fix unit economics early', rationale: 'Don\'t scale before proving profitable per user.' }
  ],
  suggestedPivots: [
    { type: 'Market', description: 'Target a more specific niche with higher willingness to pay.', historicalExample: 'Slack pivoted from gaming to enterprise comms.' },
    { type: 'Product', description: 'Simplify features to core value proposition only.', historicalExample: 'Instagram dropped all features except photo filters.' }
  ]
};

export const mockAiResponse = {
  aiSummary: `## FORENSIC DOSSIER: THE MORTALITY OF SCALING

An analysis of our failure intelligence database reveals a sobering truth: **over 70% of high-profile startup failures are self-inflicted wounds, not market casualties.** When we dissect the remains of ventures like **Juicero** and **Quibi**, we find a recurring pathology: the attempt to manufacture consumer demand through sheer capital volume rather than organic product utility.

### The Pathology of Blitzscaling

The modern venture ecosystem often operates on a dangerous premise: that speed is the ultimate defensive moat. However, when applied to capital-intensive businesses, this "blitzscaling" model becomes a death sentence if the underlying unit economics are negative.

| Failure Archetype | Key Metric Failure | Primary Casualty | Strategic Lesson |
| --- | --- | --- | --- |
| **Premature Scaling** | LTV/CAC < 1.0 | Webvan, Beepi | Solve unit economics before scaling |
| **Founder Capture** | R&D Spend > Utility | Juicero, Theranos | Validate core value prop, not the hype |
| **Subsidized Demand** | Contribution Margin < 0 | MoviePass | Negative-margin growth is not a strategy |

### The Critical Inflection Points

Our forensic algorithms identify three critical phases where startups seal their fate:
1. **The Validation Illusion:** Relying on vanity metrics (app downloads, waitlist signups) instead of cohort retention.
2. **The Capital Catalyst:** Raising mega-rounds that force the company to expand headcount and infrastructure ahead of product-market fit.
3. **The Death Spiral:** Attempting to retroactively fix margins by degrading the user experience, leading to rapid churn and brand collapse.

*For a detailed breakdown, explore the individual postmortems of Juicero, Theranos, and MoviePass.*`,
  timeline: [
    { year: 2013, startup: 'Juicero', event: 'Founded with raw-food prophecy' },
    { year: 2016, startup: 'Juicero', event: 'Launched $699 Wi-Fi press' },
    { year: 2017, startup: 'Juicero', event: 'Bloomberg hand-squeeze video' },
    { year: 2017, startup: 'Juicero', event: 'Sudden liquidation and collapse' }
  ],
  keyLessons: [
    { lesson: 'The Hand-Squeeze Test', details: 'If your high-tech hardware can be bypassed by hand in 10 seconds, your value proposition is an illusion.' },
    { lesson: 'LTV/CAC is the Law of Gravity', insight: 'No amount of brand excitement or celebrity backing can suspend the laws of unit economics. If you lose money on every transaction, scaling only accelerates your demise.' }
  ],
  sources: ['juicero', 'theranos', 'wework', 'quibi'],
  relatedStartups: mockStartups.slice(0, 4)
};

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

export const mockPitchDeckAutopsy = {
  overallRisk: 'Lethal',
  pathologistVerdict: 'Your deck shows several red flags that mirror patterns from 413 failed startups.',
  executiveSummary: 'You\'ve got a clear problem statement but are missing critical pieces like product-market fit validation and a sustainable GTM strategy. Focus on those before scaling.',
  strengths: [
    { title: 'Clear Problem Statement', description: 'You\'ve done a good job articulating the customer pain point.' },
    { title: 'Strong Team', description: 'Your team has relevant industry experience.' }
  ],
  weaknesses: [
    { title: 'Unrealistic Market Size', description: 'Your TAM calculation seems heavily inflated.' },
    { title: 'No Clear Differentiation', description: 'It\'s not obvious how you stand out from incumbents.' },
    { title: 'Missing Retention Strategy', description: 'You haven\'t addressed how you\'ll keep customers long-term.' }
  ],
  marketRisks: [
    { title: 'Intense Competition', description: 'Incumbents could easily copy your features.' },
    { title: 'Market Timing', description: 'It\'s unclear if the market is ready for this solution.' }
  ],
  productRisks: [
    { title: 'Feature Overload', description: 'Too many features for an MVP — focus on core value.' },
    { title: 'Unproven Demand', description: 'No user validation to back up your assumptions.' }
  ],
  gtmRisks: [
    { title: 'High CAC', description: 'Your customer acquisition cost assumptions seem too low.' },
    { title: 'Viral Loop Missing', description: 'No clear plan for organic growth.' }
  ],
  financialRisks: [
    { title: 'Unsustainable Burn Rate', description: 'You\'ll run out of cash in 12 months at this rate.' },
    { title: 'Unrealistic Revenue', description: 'Your projections are aggressive without supporting data.' }
  ],
  pmfAnalysis: 'You haven\'t proven product-market fit yet. Focus on that before investing heavily in growth.',
  investorConcerns: [
    { title: 'Unit Economics', description: 'You need to show a clear path to profitability.' },
    { title: 'Churn Risk', description: 'Retention numbers are missing from the deck.' },
    { title: 'Moat', description: 'What prevents competitors from copying you?' }
  ],
  competitiveAnalysis: 'The space is crowded but there might be a niche you can carve out. Focus on your unique value proposition.',
  recommendedImprovements: [
    { title: 'Simplify MVP', description: 'Cut features to focus on core value prop.' },
    { title: 'Validate Pricing', description: 'Talk to customers about willingness to pay.' },
    { title: 'Add User Data', description: 'Include customer interviews or survey results.' }
  ],
  actionPlan: [
    { phase: 'Month 1-2', tasks: ['50 customer interviews', 'Landing page', 'Waitlist'] },
    { phase: 'Month 3-4', tasks: ['Build MVP', 'Beta test with 100 users', 'Iterate'] },
    { phase: 'Month 5-6', tasks: ['Validate pricing', 'Refine GTM', 'Prepare for seed'] }
  ],
  lethalWeaknesses: [
    { slide: 'Go-to-Market', issue: 'No clear user acquisition strategy', historicalPrecedent: 'Similar to Quibi\'s vague GTM plan that failed spectacularly.' },
    { slide: 'Financials', issue: 'Unrealistic revenue projections', historicalPrecedent: 'WeWork\'s inflated numbers that led to their IPO collapse.' },
    { slide: 'Market', issue: 'No competitive moat', historicalPrecedent: 'Juicero\'s easily copyable product.' }
  ],
  structuralRedFlags: ['Team', 'Market', 'Product']
};
