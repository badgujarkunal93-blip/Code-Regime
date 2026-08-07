const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ~200 real successful/operating companies across same industries as failed dataset
// These are training data ONLY — never shown in Failure Explorer or any user-facing failure list
const successfulCompanies = [
  // ── SaaS (~35) ──
  { name: 'Slack', industry: 'SaaS', country: 'United States', foundingYear: 2013, teamSize: 2500, fundingUsd: 1390000000, peakUsers: 32000000, status: 'acquired', summary: 'Enterprise team messaging platform acquired by Salesforce for $27.7B.' },
  { name: 'Notion', industry: 'SaaS', country: 'United States', foundingYear: 2016, teamSize: 800, fundingUsd: 343000000, peakUsers: 30000000, status: 'operating', summary: 'All-in-one workspace for notes, docs, wikis, and project management.' },
  { name: 'Figma', industry: 'SaaS', country: 'United States', foundingYear: 2012, teamSize: 1200, fundingUsd: 332000000, peakUsers: 4000000, status: 'operating', summary: 'Collaborative interface design tool for product teams.' },
  { name: 'Airtable', industry: 'SaaS', country: 'United States', foundingYear: 2012, teamSize: 900, fundingUsd: 1360000000, peakUsers: 2000000, status: 'operating', summary: 'Low-code platform for building collaborative apps.' },
  { name: 'Canva', industry: 'SaaS', country: 'Australia', foundingYear: 2012, teamSize: 3500, fundingUsd: 572000000, peakUsers: 130000000, status: 'operating', summary: 'Online graphic design platform for non-designers.' },
  { name: 'Zapier', industry: 'SaaS', country: 'United States', foundingYear: 2011, teamSize: 800, fundingUsd: 1400000, peakUsers: 2200000, status: 'operating', summary: 'Workflow automation connecting 5000+ web apps.' },
  { name: 'Datadog', industry: 'SaaS', country: 'United States', foundingYear: 2010, teamSize: 5000, fundingUsd: 148000000, peakUsers: 26800, status: 'public', summary: 'Cloud-scale monitoring and analytics platform.' },
  { name: 'HubSpot', industry: 'SaaS', country: 'United States', foundingYear: 2006, teamSize: 7400, fundingUsd: 100500000, peakUsers: 184000, status: 'public', summary: 'Inbound marketing, sales, and CRM platform.' },
  { name: 'Atlassian', industry: 'SaaS', country: 'Australia', foundingYear: 2002, teamSize: 10000, fundingUsd: 210000000, peakUsers: 260000, status: 'public', summary: 'Team collaboration tools including Jira, Confluence, and Trello.' },
  { name: 'Zoom', industry: 'SaaS', country: 'United States', foundingYear: 2011, teamSize: 8400, fundingUsd: 160000000, peakUsers: 300000000, status: 'public', summary: 'Video communications platform for enterprise and consumer.' },
  { name: 'Monday.com', industry: 'SaaS', country: 'Israel', foundingYear: 2012, teamSize: 1800, fundingUsd: 234000000, peakUsers: 186000, status: 'public', summary: 'Work operating system for teams to manage projects and workflows.' },
  { name: 'Calendly', industry: 'SaaS', country: 'United States', foundingYear: 2013, teamSize: 700, fundingUsd: 350000000, peakUsers: 15000000, status: 'operating', summary: 'Online scheduling and appointment booking platform.' },
  { name: 'Loom', industry: 'SaaS', country: 'United States', foundingYear: 2015, teamSize: 200, fundingUsd: 203000000, peakUsers: 25000000, status: 'acquired', summary: 'Async video messaging for work, acquired by Atlassian.' },
  { name: 'Linear', industry: 'SaaS', country: 'United States', foundingYear: 2019, teamSize: 80, fundingUsd: 52000000, peakUsers: 500000, status: 'operating', summary: 'Streamlined issue tracking and project management for software teams.' },
  { name: 'Vercel', industry: 'SaaS', country: 'United States', foundingYear: 2015, teamSize: 500, fundingUsd: 563000000, peakUsers: 1000000, status: 'operating', summary: 'Frontend cloud platform for deploying web applications.' },
  { name: 'Supabase', industry: 'SaaS', country: 'United States', foundingYear: 2020, teamSize: 150, fundingUsd: 116000000, peakUsers: 700000, status: 'operating', summary: 'Open-source Firebase alternative with Postgres backend.' },
  { name: 'Postman', industry: 'SaaS', country: 'United States', foundingYear: 2014, teamSize: 800, fundingUsd: 433000000, peakUsers: 30000000, status: 'operating', summary: 'API development and testing collaboration platform.' },
  { name: 'GitLab', industry: 'SaaS', country: 'United States', foundingYear: 2011, teamSize: 2000, fundingUsd: 426000000, peakUsers: 30000000, status: 'public', summary: 'DevOps lifecycle platform for source code management and CI/CD.' },
  { name: 'Twilio', industry: 'SaaS', country: 'United States', foundingYear: 2008, teamSize: 6800, fundingUsd: 240000000, peakUsers: 300000, status: 'public', summary: 'Cloud communications platform for voice, SMS, and video APIs.' },
  { name: 'Freshworks', industry: 'SaaS', country: 'India', foundingYear: 2010, teamSize: 5200, fundingUsd: 484000000, peakUsers: 60000, status: 'public', summary: 'Business software for customer support, IT, sales, and marketing.' },
  { name: 'Zendesk', industry: 'SaaS', country: 'United States', foundingYear: 2007, teamSize: 6000, fundingUsd: 186000000, peakUsers: 170000, status: 'acquired', summary: 'Customer service and support ticketing platform.' },
  { name: 'DocuSign', industry: 'SaaS', country: 'United States', foundingYear: 2003, teamSize: 7000, fundingUsd: 519000000, peakUsers: 1500000, status: 'public', summary: 'Electronic signature and agreement cloud platform.' },
  { name: 'Miro', industry: 'SaaS', country: 'United States', foundingYear: 2011, teamSize: 1800, fundingUsd: 476000000, peakUsers: 50000000, status: 'operating', summary: 'Online collaborative whiteboard platform for distributed teams.' },
  { name: 'ClickUp', industry: 'SaaS', country: 'United States', foundingYear: 2017, teamSize: 1000, fundingUsd: 537000000, peakUsers: 8000000, status: 'operating', summary: 'All-in-one productivity and project management platform.' },
  { name: 'Grammarly', industry: 'SaaS', country: 'United States', foundingYear: 2009, teamSize: 900, fundingUsd: 400000000, peakUsers: 30000000, status: 'operating', summary: 'AI-powered writing assistant for grammar, clarity, and style.' },
  { name: 'Amplitude', industry: 'SaaS', country: 'United States', foundingYear: 2012, teamSize: 700, fundingUsd: 336000000, peakUsers: 45000, status: 'public', summary: 'Product analytics platform for understanding user behavior.' },
  { name: 'Cloudflare', industry: 'SaaS', country: 'United States', foundingYear: 2009, teamSize: 3800, fundingUsd: 332000000, peakUsers: 25000000, status: 'public', summary: 'Web performance, security, and CDN infrastructure.' },
  { name: '1Password', industry: 'SaaS', country: 'Canada', foundingYear: 2005, teamSize: 1000, fundingUsd: 920000000, peakUsers: 15000000, status: 'operating', summary: 'Password management and digital security platform.' },
  { name: 'Webflow', industry: 'SaaS', country: 'United States', foundingYear: 2013, teamSize: 600, fundingUsd: 334000000, peakUsers: 3500000, status: 'operating', summary: 'No-code website builder and CMS platform.' },
  { name: 'Gusto', industry: 'SaaS', country: 'United States', foundingYear: 2011, teamSize: 2000, fundingUsd: 746000000, peakUsers: 300000, status: 'operating', summary: 'Cloud-based payroll, benefits, and HR platform for SMBs.' },
  { name: 'Asana', industry: 'SaaS', country: 'United States', foundingYear: 2008, teamSize: 1800, fundingUsd: 213000000, peakUsers: 139000, status: 'public', summary: 'Work management platform for teams to organize projects.' },
  { name: 'PagerDuty', industry: 'SaaS', country: 'United States', foundingYear: 2009, teamSize: 1100, fundingUsd: 174000000, peakUsers: 21000, status: 'public', summary: 'Digital operations management and incident response platform.' },
  { name: 'Sentry', industry: 'SaaS', country: 'United States', foundingYear: 2012, teamSize: 500, fundingUsd: 217000000, peakUsers: 100000, status: 'operating', summary: 'Application monitoring and error tracking for developers.' },
  { name: 'Descript', industry: 'SaaS', country: 'United States', foundingYear: 2017, teamSize: 200, fundingUsd: 130000000, peakUsers: 1000000, status: 'operating', summary: 'AI-powered audio and video editing platform.' },
  { name: 'Retool', industry: 'SaaS', country: 'United States', foundingYear: 2017, teamSize: 400, fundingUsd: 245000000, peakUsers: 100000, status: 'operating', summary: 'Low-code platform for building internal business tools.' },

  // ── FinTech (~30) ──
  { name: 'Stripe', industry: 'FinTech', country: 'United States', foundingYear: 2010, teamSize: 8000, fundingUsd: 2300000000, peakUsers: 3400000, status: 'operating', summary: 'Online payment processing infrastructure for internet businesses.' },
  { name: 'Square', industry: 'FinTech', country: 'United States', foundingYear: 2009, teamSize: 12000, fundingUsd: 590000000, peakUsers: 56000000, status: 'public', summary: 'Financial services and mobile payment platform for merchants.' },
  { name: 'Plaid', industry: 'FinTech', country: 'United States', foundingYear: 2013, teamSize: 1400, fundingUsd: 734000000, peakUsers: 12000, status: 'operating', summary: 'Financial data connectivity API for banking and fintech apps.' },
  { name: 'Revolut', industry: 'FinTech', country: 'United Kingdom', foundingYear: 2015, teamSize: 7000, fundingUsd: 1700000000, peakUsers: 35000000, status: 'operating', summary: 'Digital banking and financial super-app.' },
  { name: 'Wise', industry: 'FinTech', country: 'United Kingdom', foundingYear: 2011, teamSize: 4000, fundingUsd: 396000000, peakUsers: 16000000, status: 'public', summary: 'International money transfer and multi-currency accounts.' },
  { name: 'Nubank', industry: 'FinTech', country: 'Brazil', foundingYear: 2013, teamSize: 7000, fundingUsd: 2800000000, peakUsers: 85000000, status: 'public', summary: 'Digital banking platform, largest neobank in Latin America.' },
  { name: 'Chime', industry: 'FinTech', country: 'United States', foundingYear: 2012, teamSize: 1600, fundingUsd: 2300000000, peakUsers: 14500000, status: 'operating', summary: 'Mobile-first neobank offering fee-free banking services.' },
  { name: 'Brex', industry: 'FinTech', country: 'United States', foundingYear: 2017, teamSize: 1100, fundingUsd: 1200000000, peakUsers: 100000, status: 'operating', summary: 'Corporate credit card and spend management for startups.' },
  { name: 'Razorpay', industry: 'FinTech', country: 'India', foundingYear: 2014, teamSize: 3000, fundingUsd: 741000000, peakUsers: 10000000, status: 'operating', summary: 'Payment gateway and financial solutions for Indian businesses.' },
  { name: 'PayPal', industry: 'FinTech', country: 'United States', foundingYear: 1998, teamSize: 26000, fundingUsd: 197000000, peakUsers: 430000000, status: 'public', summary: 'Global digital payments and money transfer platform.' },
  { name: 'Klarna', industry: 'FinTech', country: 'Sweden', foundingYear: 2005, teamSize: 5000, fundingUsd: 4570000000, peakUsers: 150000000, status: 'operating', summary: 'Buy-now-pay-later payments and shopping platform.' },
  { name: 'Robinhood', industry: 'FinTech', country: 'United States', foundingYear: 2013, teamSize: 3800, fundingUsd: 5600000000, peakUsers: 22700000, status: 'public', summary: 'Commission-free stock and crypto trading app.' },
  { name: 'Coinbase', industry: 'FinTech', country: 'United States', foundingYear: 2012, teamSize: 3400, fundingUsd: 547000000, peakUsers: 108000000, status: 'public', summary: 'Cryptocurrency exchange and wallet platform.' },
  { name: 'Mercury', industry: 'FinTech', country: 'United States', foundingYear: 2017, teamSize: 500, fundingUsd: 163000000, peakUsers: 200000, status: 'operating', summary: 'Business banking built for startups and e-commerce.' },
  { name: 'Ramp', industry: 'FinTech', country: 'United States', foundingYear: 2019, teamSize: 700, fundingUsd: 820000000, peakUsers: 25000, status: 'operating', summary: 'Corporate card and spend management with savings automation.' },
  { name: 'Adyen', industry: 'FinTech', country: 'Netherlands', foundingYear: 2006, teamSize: 3600, fundingUsd: 266000000, peakUsers: 6000, status: 'public', summary: 'Global payment platform for enterprise merchants.' },
  { name: 'Toast', industry: 'FinTech', country: 'United States', foundingYear: 2011, teamSize: 4500, fundingUsd: 902000000, peakUsers: 85000, status: 'public', summary: 'Restaurant technology and payment platform.' },
  { name: 'SoFi', industry: 'FinTech', country: 'United States', foundingYear: 2011, teamSize: 4400, fundingUsd: 3000000000, peakUsers: 6200000, status: 'public', summary: 'Personal finance and student loan refinancing platform.' },
  { name: 'Affirm', industry: 'FinTech', country: 'United States', foundingYear: 2012, teamSize: 2100, fundingUsd: 1500000000, peakUsers: 14000000, status: 'public', summary: 'Buy-now-pay-later consumer credit platform.' },
  { name: 'Marqeta', industry: 'FinTech', country: 'United States', foundingYear: 2010, teamSize: 700, fundingUsd: 528000000, peakUsers: 500, status: 'public', summary: 'Modern card issuing and payment processing platform.' },
  { name: 'N26', industry: 'FinTech', country: 'Germany', foundingYear: 2013, teamSize: 1500, fundingUsd: 1700000000, peakUsers: 8000000, status: 'operating', summary: 'European mobile-first digital bank.' },
  { name: 'Monzo', industry: 'FinTech', country: 'United Kingdom', foundingYear: 2015, teamSize: 2700, fundingUsd: 1100000000, peakUsers: 8000000, status: 'operating', summary: 'UK digital bank with real-time spending notifications.' },
  { name: 'PhonePe', industry: 'FinTech', country: 'India', foundingYear: 2015, teamSize: 6000, fundingUsd: 850000000, peakUsers: 500000000, status: 'operating', summary: 'India\'s leading digital payments and UPI platform.' },
  { name: 'Checkout.com', industry: 'FinTech', country: 'United Kingdom', foundingYear: 2012, teamSize: 1800, fundingUsd: 1800000000, peakUsers: 50000, status: 'operating', summary: 'Cloud-based payment processing for enterprise.' },
  { name: 'Nuvei', industry: 'FinTech', country: 'Canada', foundingYear: 2003, teamSize: 1800, fundingUsd: 200000000, peakUsers: 50000, status: 'public', summary: 'Global payment technology solutions.' },
  { name: 'Zerodha', industry: 'FinTech', country: 'India', foundingYear: 2010, teamSize: 1200, fundingUsd: 0, peakUsers: 12000000, status: 'operating', summary: 'India\'s largest discount stock brokerage, bootstrapped.' },
  { name: 'Ripple', industry: 'FinTech', country: 'United States', foundingYear: 2012, teamSize: 900, fundingUsd: 294000000, peakUsers: 300, status: 'operating', summary: 'Blockchain-based cross-border payment network for banks.' },
  { name: 'Deel', industry: 'FinTech', country: 'United States', foundingYear: 2019, teamSize: 3000, fundingUsd: 679000000, peakUsers: 25000, status: 'operating', summary: 'Global payroll and compliance for remote teams.' },
  { name: 'Melio', industry: 'FinTech', country: 'United States', foundingYear: 2018, teamSize: 700, fundingUsd: 506000000, peakUsers: 300000, status: 'operating', summary: 'B2B payments platform for small businesses.' },

  // ── EdTech (~20) ──
  { name: 'Duolingo', industry: 'EdTech', country: 'United States', foundingYear: 2011, teamSize: 700, fundingUsd: 183000000, peakUsers: 74000000, status: 'public', summary: 'Gamified language learning app, most downloaded education app globally.' },
  { name: 'Coursera', industry: 'EdTech', country: 'United States', foundingYear: 2012, teamSize: 1400, fundingUsd: 464000000, peakUsers: 118000000, status: 'public', summary: 'Online learning platform offering university courses and degrees.' },
  { name: 'Khan Academy', industry: 'EdTech', country: 'United States', foundingYear: 2008, teamSize: 250, fundingUsd: 16000000, peakUsers: 70000000, status: 'operating', summary: 'Free online education platform for K-12 and college prep.' },
  { name: 'Udemy', industry: 'EdTech', country: 'United States', foundingYear: 2010, teamSize: 1500, fundingUsd: 310000000, peakUsers: 57000000, status: 'public', summary: 'Online marketplace for learning and teaching courses.' },
  { name: 'Quizlet', industry: 'EdTech', country: 'United States', foundingYear: 2005, teamSize: 400, fundingUsd: 62000000, peakUsers: 60000000, status: 'operating', summary: 'Digital flashcard and study tool platform.' },
  { name: 'Chegg', industry: 'EdTech', country: 'United States', foundingYear: 2005, teamSize: 1200, fundingUsd: 345000000, peakUsers: 7800000, status: 'public', summary: 'Student learning platform for textbook solutions and tutoring.' },
  { name: 'Kahoot!', industry: 'EdTech', country: 'Norway', foundingYear: 2012, teamSize: 500, fundingUsd: 360000000, peakUsers: 9000000000, status: 'public', summary: 'Game-based learning platform for schools and businesses.' },
  { name: 'Unacademy', industry: 'EdTech', country: 'India', foundingYear: 2015, teamSize: 3000, fundingUsd: 880000000, peakUsers: 60000000, status: 'operating', summary: 'India\'s largest online learning platform for test preparation.' },
  { name: 'Brainly', industry: 'EdTech', country: 'Poland', foundingYear: 2009, teamSize: 300, fundingUsd: 149000000, peakUsers: 350000000, status: 'operating', summary: 'Peer-to-peer learning community for student homework help.' },
  { name: 'Photomath', industry: 'EdTech', country: 'Croatia', foundingYear: 2014, teamSize: 200, fundingUsd: 29000000, peakUsers: 300000000, status: 'acquired', summary: 'AI-powered math learning app using camera recognition.' },
  { name: 'MasterClass', industry: 'EdTech', country: 'United States', foundingYear: 2015, teamSize: 500, fundingUsd: 461000000, peakUsers: 2000000, status: 'operating', summary: 'Online classes taught by world-renowned experts.' },
  { name: 'Skillshare', industry: 'EdTech', country: 'United States', foundingYear: 2010, teamSize: 200, fundingUsd: 42000000, peakUsers: 12000000, status: 'operating', summary: 'Online learning community for creative skills.' },
  { name: 'Simplilearn', industry: 'EdTech', country: 'India', foundingYear: 2010, teamSize: 2500, fundingUsd: 53000000, peakUsers: 3000000, status: 'operating', summary: 'Online bootcamp for digital skills and professional certifications.' },
  { name: 'Age of Learning', industry: 'EdTech', country: 'United States', foundingYear: 2007, teamSize: 800, fundingUsd: 150000000, peakUsers: 50000000, status: 'operating', summary: 'Children\'s digital education platform including ABCmouse.' },
  { name: 'Codecademy', industry: 'EdTech', country: 'United States', foundingYear: 2011, teamSize: 300, fundingUsd: 82000000, peakUsers: 50000000, status: 'acquired', summary: 'Interactive coding education platform.' },
  { name: 'Pluralsight', industry: 'EdTech', country: 'United States', foundingYear: 2004, teamSize: 2000, fundingUsd: 191000000, peakUsers: 1700000, status: 'acquired', summary: 'Technology workforce development and skills platform.' },
  { name: 'ClassDojo', industry: 'EdTech', country: 'United States', foundingYear: 2011, teamSize: 200, fundingUsd: 61000000, peakUsers: 51000000, status: 'operating', summary: 'Classroom communication and management platform for K-8.' },
  { name: 'Outschool', industry: 'EdTech', country: 'United States', foundingYear: 2015, teamSize: 350, fundingUsd: 230000000, peakUsers: 1000000, status: 'operating', summary: 'Live online classes for kids taught by independent educators.' },
  { name: 'Emeritus', industry: 'EdTech', country: 'India', foundingYear: 2015, teamSize: 1200, fundingUsd: 650000000, peakUsers: 300000, status: 'operating', summary: 'Online professional education from top universities.' },

  // ── E-commerce / Retail (~25) ──
  { name: 'Shopify', industry: 'E-commerce', country: 'Canada', foundingYear: 2004, teamSize: 10000, fundingUsd: 122000000, peakUsers: 4400000, status: 'public', summary: 'E-commerce platform enabling anyone to set up an online store.' },
  { name: 'Instacart', industry: 'E-commerce', country: 'United States', foundingYear: 2012, teamSize: 3000, fundingUsd: 2900000000, peakUsers: 10000000, status: 'public', summary: 'Online grocery delivery and pickup marketplace.' },
  { name: 'Etsy', industry: 'E-commerce', country: 'United States', foundingYear: 2005, teamSize: 2300, fundingUsd: 97000000, peakUsers: 96000000, status: 'public', summary: 'Global marketplace for unique handmade and vintage goods.' },
  { name: 'Wish', industry: 'E-commerce', country: 'United States', foundingYear: 2010, teamSize: 600, fundingUsd: 1600000000, peakUsers: 100000000, status: 'public', summary: 'Mobile-first discount e-commerce marketplace.' },
  { name: 'Poshmark', industry: 'E-commerce', country: 'United States', foundingYear: 2011, teamSize: 800, fundingUsd: 153000000, peakUsers: 80000000, status: 'acquired', summary: 'Social marketplace for new and used fashion.' },
  { name: 'ThredUp', industry: 'E-commerce', country: 'United States', foundingYear: 2009, teamSize: 2000, fundingUsd: 375000000, peakUsers: 1400000, status: 'public', summary: 'Online resale platform for secondhand clothing.' },
  { name: 'BigCommerce', industry: 'E-commerce', country: 'United States', foundingYear: 2009, teamSize: 1500, fundingUsd: 235000000, peakUsers: 60000, status: 'public', summary: 'Enterprise e-commerce SaaS platform for online stores.' },
  { name: 'Meesho', industry: 'E-commerce', country: 'India', foundingYear: 2015, teamSize: 2000, fundingUsd: 1100000000, peakUsers: 150000000, status: 'operating', summary: 'Social commerce platform for small businesses in India.' },
  { name: 'Mercado Libre', industry: 'E-commerce', country: 'Argentina', foundingYear: 1999, teamSize: 30000, fundingUsd: 450000000, peakUsers: 148000000, status: 'public', summary: 'Latin America\'s largest online marketplace and fintech.' },
  { name: 'Coupang', industry: 'E-commerce', country: 'South Korea', foundingYear: 2010, teamSize: 70000, fundingUsd: 3600000000, peakUsers: 21000000, status: 'public', summary: 'South Korea\'s largest e-commerce company with same-day delivery.' },
  { name: 'Flipkart', industry: 'E-commerce', country: 'India', foundingYear: 2007, teamSize: 35000, fundingUsd: 12600000000, peakUsers: 450000000, status: 'acquired', summary: 'India\'s leading e-commerce platform, acquired by Walmart.' },
  { name: 'Faire', industry: 'E-commerce', country: 'United States', foundingYear: 2017, teamSize: 800, fundingUsd: 1100000000, peakUsers: 700000, status: 'operating', summary: 'Online wholesale marketplace connecting retailers and brands.' },
  { name: 'StockX', industry: 'E-commerce', country: 'United States', foundingYear: 2015, teamSize: 1600, fundingUsd: 690000000, peakUsers: 10000000, status: 'operating', summary: 'Online marketplace for sneakers, streetwear, and collectibles.' },
  { name: 'Depop', industry: 'E-commerce', country: 'United Kingdom', foundingYear: 2011, teamSize: 400, fundingUsd: 105000000, peakUsers: 30000000, status: 'acquired', summary: 'Gen Z-focused social shopping app for fashion resale.' },
  { name: 'Chewy', industry: 'E-commerce', country: 'United States', foundingYear: 2011, teamSize: 20000, fundingUsd: 451000000, peakUsers: 20000000, status: 'public', summary: 'Online pet food and product retailer.' },
  { name: 'Nykaa', industry: 'E-commerce', country: 'India', foundingYear: 2012, teamSize: 3500, fundingUsd: 100000000, peakUsers: 20000000, status: 'public', summary: 'India\'s leading beauty and personal care e-commerce platform.' },
  { name: 'Bolt', industry: 'E-commerce', country: 'United States', foundingYear: 2014, teamSize: 300, fundingUsd: 1090000000, peakUsers: 80000000, status: 'operating', summary: 'One-click checkout and shopper network for e-commerce.' },
  { name: 'Whatnot', industry: 'E-commerce', country: 'United States', foundingYear: 2019, teamSize: 400, fundingUsd: 485000000, peakUsers: 5000000, status: 'operating', summary: 'Live shopping marketplace for collectibles.' },

  // ── Healthcare / Bio (~18) ──
  { name: 'Tempus', industry: 'Healthcare', country: 'United States', foundingYear: 2015, teamSize: 2500, fundingUsd: 1300000000, peakUsers: 5000, status: 'operating', summary: 'AI-powered precision medicine platform for clinical data analysis.' },
  { name: 'Hims & Hers', industry: 'Healthcare', country: 'United States', foundingYear: 2017, teamSize: 2500, fundingUsd: 197000000, peakUsers: 1500000, status: 'public', summary: 'Telehealth platform for men\'s and women\'s health.' },
  { name: 'Oscar Health', industry: 'Healthcare', country: 'United States', foundingYear: 2012, teamSize: 3000, fundingUsd: 1600000000, peakUsers: 1000000, status: 'public', summary: 'Technology-focused health insurance company.' },
  { name: 'Ro', industry: 'Healthcare', country: 'United States', foundingYear: 2017, teamSize: 1000, fundingUsd: 876000000, peakUsers: 2000000, status: 'operating', summary: 'Direct-to-patient telehealth and pharmacy platform.' },
  { name: 'GoodRx', industry: 'Healthcare', country: 'United States', foundingYear: 2011, teamSize: 900, fundingUsd: 400000000, peakUsers: 6000000, status: 'public', summary: 'Prescription drug price comparison and savings platform.' },
  { name: 'Noom', industry: 'Healthcare', country: 'United States', foundingYear: 2008, teamSize: 2000, fundingUsd: 660000000, peakUsers: 50000000, status: 'operating', summary: 'Behavioral health and weight management platform.' },
  { name: '23andMe', industry: 'Healthcare', country: 'United States', foundingYear: 2006, teamSize: 600, fundingUsd: 986000000, peakUsers: 14000000, status: 'public', summary: 'Consumer genetics and health testing company.' },
  { name: 'Veeva Systems', industry: 'Healthcare', country: 'United States', foundingYear: 2007, teamSize: 6000, fundingUsd: 7000000, peakUsers: 75000, status: 'public', summary: 'Cloud software for the pharmaceutical and life sciences industry.' },
  { name: 'Zocdoc', industry: 'Healthcare', country: 'United States', foundingYear: 2007, teamSize: 600, fundingUsd: 223000000, peakUsers: 6000000, status: 'operating', summary: 'Online medical appointment booking platform.' },
  { name: 'Color Health', industry: 'Healthcare', country: 'United States', foundingYear: 2013, teamSize: 500, fundingUsd: 278000000, peakUsers: 5000000, status: 'operating', summary: 'Population health technology for genetic testing and COVID response.' },
  { name: 'Headspace', industry: 'Healthcare', country: 'United States', foundingYear: 2010, teamSize: 800, fundingUsd: 325000000, peakUsers: 70000000, status: 'operating', summary: 'Guided meditation and mindfulness app.' },
  { name: 'Calm', industry: 'Healthcare', country: 'United States', foundingYear: 2012, teamSize: 400, fundingUsd: 217000000, peakUsers: 100000000, status: 'operating', summary: 'Mental health and sleep wellness app.' },
  { name: 'BetterUp', industry: 'Healthcare', country: 'United States', foundingYear: 2013, teamSize: 750, fundingUsd: 600000000, peakUsers: 500000, status: 'operating', summary: 'Mental fitness coaching and professional development platform.' },
  { name: 'Doctolib', industry: 'Healthcare', country: 'France', foundingYear: 2013, teamSize: 2800, fundingUsd: 680000000, peakUsers: 70000000, status: 'operating', summary: 'Europe\'s leading health booking and telehealth platform.' },
  { name: 'Practo', industry: 'Healthcare', country: 'India', foundingYear: 2008, teamSize: 600, fundingUsd: 180000000, peakUsers: 30000000, status: 'operating', summary: 'India\'s largest healthcare platform for doctor discovery and booking.' },
  { name: 'Sword Health', industry: 'Healthcare', country: 'United States', foundingYear: 2015, teamSize: 1200, fundingUsd: 340000000, peakUsers: 2500000, status: 'operating', summary: 'AI-powered physical therapy and musculoskeletal care.' },
  { name: 'Thirty Madison', industry: 'Healthcare', country: 'United States', foundingYear: 2017, teamSize: 500, fundingUsd: 255000000, peakUsers: 500000, status: 'operating', summary: 'Healthcare platform specializing in chronic condition brands.' },

  // ── Hardware / IoT (~15) ──
  { name: 'GoPro', industry: 'Hardware', country: 'United States', foundingYear: 2002, teamSize: 1600, fundingUsd: 88000000, peakUsers: 10000000, status: 'public', summary: 'Action camera and content platform for adventure media.' },
  { name: 'Sonos', industry: 'Hardware', country: 'United States', foundingYear: 2002, teamSize: 1800, fundingUsd: 120000000, peakUsers: 15000000, status: 'public', summary: 'Multi-room wireless smart speaker system.' },
  { name: 'Ring', industry: 'Hardware', country: 'United States', foundingYear: 2013, teamSize: 3500, fundingUsd: 209000000, peakUsers: 10000000, status: 'acquired', summary: 'Smart home security cameras and doorbell, acquired by Amazon.' },
  { name: 'Oura', industry: 'Hardware', country: 'Finland', foundingYear: 2013, teamSize: 700, fundingUsd: 350000000, peakUsers: 2500000, status: 'operating', summary: 'Smart health tracking ring for sleep and activity.' },
  { name: 'Whoop', industry: 'Hardware', country: 'United States', foundingYear: 2012, teamSize: 600, fundingUsd: 400000000, peakUsers: 1000000, status: 'operating', summary: 'Wearable fitness and recovery tracker for athletes.' },
  { name: 'DJI', industry: 'Hardware', country: 'China', foundingYear: 2006, teamSize: 14000, fundingUsd: 0, peakUsers: 50000000, status: 'operating', summary: 'World\'s largest consumer drone and camera stabilizer manufacturer.' },
  { name: 'Arduino', industry: 'Hardware', country: 'Italy', foundingYear: 2005, teamSize: 100, fundingUsd: 10000000, peakUsers: 30000000, status: 'operating', summary: 'Open-source electronics prototyping platform.' },
  { name: 'Raspberry Pi', industry: 'Hardware', country: 'United Kingdom', foundingYear: 2012, teamSize: 200, fundingUsd: 45000000, peakUsers: 60000000, status: 'public', summary: 'Low-cost single-board computer for education and hobbyists.' },
  { name: 'Anker', industry: 'Hardware', country: 'China', foundingYear: 2011, teamSize: 3500, fundingUsd: 0, peakUsers: 100000000, status: 'operating', summary: 'Consumer electronics brand for charging and audio products.' },
  { name: 'Rivian', industry: 'Hardware', country: 'United States', foundingYear: 2009, teamSize: 16000, fundingUsd: 10700000000, peakUsers: 100000, status: 'public', summary: 'Electric vehicle and autonomous technology company.' },
  { name: 'Skydio', industry: 'Hardware', country: 'United States', foundingYear: 2014, teamSize: 500, fundingUsd: 340000000, peakUsers: 50000, status: 'operating', summary: 'AI-powered autonomous drone manufacturer.' },
  { name: 'Bambu Lab', industry: 'Hardware', country: 'China', foundingYear: 2020, teamSize: 1000, fundingUsd: 0, peakUsers: 500000, status: 'operating', summary: 'Consumer 3D printer manufacturer with desktop FDM printers.' },
  { name: 'Remarkable', industry: 'Hardware', country: 'Norway', foundingYear: 2013, teamSize: 400, fundingUsd: 80000000, peakUsers: 1000000, status: 'operating', summary: 'E-paper tablet for digital note-taking and reading.' },
  { name: 'Nothing', industry: 'Hardware', country: 'United Kingdom', foundingYear: 2020, teamSize: 400, fundingUsd: 280000000, peakUsers: 2000000, status: 'operating', summary: 'Consumer technology brand for phones and earbuds.' },
  { name: 'Lululemon Mirror', industry: 'Hardware', country: 'United States', foundingYear: 2018, teamSize: 200, fundingUsd: 74000000, peakUsers: 200000, status: 'acquired', summary: 'Interactive smart mirror for home fitness, acquired by Lululemon.' },

  // ── Media / Entertainment (~20) ──
  { name: 'Spotify', industry: 'Media', country: 'Sweden', foundingYear: 2006, teamSize: 9800, fundingUsd: 2600000000, peakUsers: 602000000, status: 'public', summary: 'Audio streaming platform for music, podcasts, and audiobooks.' },
  { name: 'Discord', industry: 'Media', country: 'United States', foundingYear: 2015, teamSize: 600, fundingUsd: 995000000, peakUsers: 200000000, status: 'operating', summary: 'Group chat platform for communities and gaming.' },
  { name: 'Reddit', industry: 'Media', country: 'United States', foundingYear: 2005, teamSize: 2000, fundingUsd: 1300000000, peakUsers: 1700000000, status: 'public', summary: 'Social news aggregation and discussion community platform.' },
  { name: 'Substack', industry: 'Media', country: 'United States', foundingYear: 2017, teamSize: 100, fundingUsd: 82000000, peakUsers: 35000000, status: 'operating', summary: 'Platform for independent writers to publish paid newsletters.' },
  { name: 'Patreon', industry: 'Media', country: 'United States', foundingYear: 2013, teamSize: 500, fundingUsd: 412000000, peakUsers: 8000000, status: 'operating', summary: 'Creator membership platform for subscription content.' },
  { name: 'Roblox', industry: 'Media', country: 'United States', foundingYear: 2004, teamSize: 2100, fundingUsd: 855000000, peakUsers: 66000000, status: 'public', summary: 'Online gaming platform and game creation system for kids.' },
  { name: 'Epic Games', industry: 'Media', country: 'United States', foundingYear: 1991, teamSize: 3600, fundingUsd: 5400000000, peakUsers: 400000000, status: 'operating', summary: 'Gaming company behind Unreal Engine and Fortnite.' },
  { name: 'Unity Technologies', industry: 'Media', country: 'United States', foundingYear: 2004, teamSize: 6800, fundingUsd: 1300000000, peakUsers: 3000000, status: 'public', summary: 'Real-time 3D game engine and development platform.' },
  { name: 'Canva', industry: 'Media', country: 'Australia', foundingYear: 2012, teamSize: 3500, fundingUsd: 572000000, peakUsers: 130000000, status: 'operating', summary: 'Online graphic design platform for non-designers.' },
  { name: 'Vimeo', industry: 'Media', country: 'United States', foundingYear: 2004, teamSize: 1000, fundingUsd: 300000000, peakUsers: 200000000, status: 'public', summary: 'Video hosting and streaming platform for professionals.' },
  { name: 'Anchor', industry: 'Media', country: 'United States', foundingYear: 2015, teamSize: 150, fundingUsd: 14000000, peakUsers: 5000000, status: 'acquired', summary: 'Podcast creation and hosting platform, acquired by Spotify.' },
  { name: 'Deezer', industry: 'Media', country: 'France', foundingYear: 2007, teamSize: 600, fundingUsd: 300000000, peakUsers: 16000000, status: 'public', summary: 'Music streaming platform with global catalog.' },
  { name: 'Crunchyroll', industry: 'Media', country: 'United States', foundingYear: 2006, teamSize: 1000, fundingUsd: 0, peakUsers: 10000000, status: 'acquired', summary: 'Anime streaming and distribution platform.' },
  { name: 'Wattpad', industry: 'Media', country: 'Canada', foundingYear: 2006, teamSize: 300, fundingUsd: 118000000, peakUsers: 90000000, status: 'acquired', summary: 'Social storytelling platform for reading and writing.' },
  { name: 'Niantic', industry: 'Media', country: 'United States', foundingYear: 2010, teamSize: 800, fundingUsd: 770000000, peakUsers: 150000000, status: 'operating', summary: 'AR gaming company behind Pokémon GO and Ingress.' },
  { name: 'Twitch', industry: 'Media', country: 'United States', foundingYear: 2011, teamSize: 2500, fundingUsd: 35000000, peakUsers: 31000000, status: 'acquired', summary: 'Live streaming platform for gaming, acquired by Amazon.' },
  { name: 'Cameo', industry: 'Media', country: 'United States', foundingYear: 2017, teamSize: 200, fundingUsd: 166000000, peakUsers: 30000, status: 'operating', summary: 'Marketplace for personalized celebrity video messages.' },

  // ── Food / Delivery (~17) ──
  { name: 'DoorDash', industry: 'Food Delivery', country: 'United States', foundingYear: 2013, teamSize: 8000, fundingUsd: 2500000000, peakUsers: 32000000, status: 'public', summary: 'On-demand food delivery and logistics platform.' },
  { name: 'Grubhub', industry: 'Food Delivery', country: 'United States', foundingYear: 2004, teamSize: 3700, fundingUsd: 284000000, peakUsers: 33000000, status: 'acquired', summary: 'Online food ordering and delivery platform.' },
  { name: 'Deliveroo', industry: 'Food Delivery', country: 'United Kingdom', foundingYear: 2013, teamSize: 2500, fundingUsd: 1530000000, peakUsers: 8000000, status: 'public', summary: 'On-demand food delivery platform across Europe and Asia.' },
  { name: 'Swiggy', industry: 'Food Delivery', country: 'India', foundingYear: 2014, teamSize: 5000, fundingUsd: 3600000000, peakUsers: 50000000, status: 'operating', summary: 'India\'s leading on-demand food and grocery delivery platform.' },
  { name: 'Zomato', industry: 'Food Delivery', country: 'India', foundingYear: 2008, teamSize: 4000, fundingUsd: 2200000000, peakUsers: 80000000, status: 'public', summary: 'Restaurant discovery and food delivery platform in India.' },
  { name: 'Sweetgreen', industry: 'Food Delivery', country: 'United States', foundingYear: 2007, teamSize: 5000, fundingUsd: 465000000, peakUsers: 3000000, status: 'public', summary: 'Fast-casual restaurant chain with tech-enabled ordering.' },
  { name: 'Getir', industry: 'Food Delivery', country: 'Turkey', foundingYear: 2015, teamSize: 6000, fundingUsd: 1800000000, peakUsers: 30000000, status: 'operating', summary: 'Ultrafast grocery delivery platform with dark stores.' },
  { name: 'Gopuff', industry: 'Food Delivery', country: 'United States', foundingYear: 2013, teamSize: 3000, fundingUsd: 3400000000, peakUsers: 5000000, status: 'operating', summary: 'Instant delivery platform for convenience store products.' },
  { name: 'Wolt', industry: 'Food Delivery', country: 'Finland', foundingYear: 2014, teamSize: 7000, fundingUsd: 856000000, peakUsers: 4000000, status: 'acquired', summary: 'Food delivery platform across Europe, acquired by DoorDash.' },
  { name: 'Rappi', industry: 'Food Delivery', country: 'Colombia', foundingYear: 2015, teamSize: 3000, fundingUsd: 2200000000, peakUsers: 25000000, status: 'operating', summary: 'Latin American super app for delivery and financial services.' },
  { name: 'Blue Apron', industry: 'Food Delivery', country: 'United States', foundingYear: 2012, teamSize: 1700, fundingUsd: 199000000, peakUsers: 1000000, status: 'public', summary: 'Meal kit delivery service with pre-portioned ingredients.' },
  { name: 'HelloFresh', industry: 'Food Delivery', country: 'Germany', foundingYear: 2011, teamSize: 20000, fundingUsd: 370000000, peakUsers: 7500000, status: 'public', summary: 'Meal kit delivery service, largest in the world.' },
  { name: 'Olo', industry: 'Food Delivery', country: 'United States', foundingYear: 2005, teamSize: 800, fundingUsd: 140000000, peakUsers: 85000, status: 'public', summary: 'Restaurant online ordering and delivery management platform.' },
  { name: 'ChowNow', industry: 'Food Delivery', country: 'United States', foundingYear: 2012, teamSize: 300, fundingUsd: 70000000, peakUsers: 20000, status: 'operating', summary: 'Commission-free online ordering platform for restaurants.' },
  { name: 'Rebel Foods', industry: 'Food Delivery', country: 'India', foundingYear: 2011, teamSize: 5000, fundingUsd: 560000000, peakUsers: 15000000, status: 'operating', summary: 'World\'s largest internet restaurant company with cloud kitchens.' },
];

async function main() {
  console.log(`🌱 Seeding ${successfulCompanies.length} successful/operating companies...`);
  console.log('⚠️  These are training data ONLY — they will NOT appear in the failure database UI.\n');

  let created = 0, updated = 0, failed = 0;

  for (let i = 0; i < successfulCompanies.length; i++) {
    const c = successfulCompanies[i];
    try {
      const slug = slugify(c.name);
      const currentYear = new Date().getFullYear();
      const lifetimeMonths = c.foundingYear ? (currentYear - c.foundingYear) * 12 : null;

      // Resolve status to valid enum
      const status = c.status === 'acquired' ? 'acquired' :
                     c.status === 'public' ? 'public' : 'operating';

      // Upsert industry record
      const industryRecord = await prisma.industry.upsert({
        where: { slug: slugify(c.industry) },
        update: {},
        create: {
          name: c.industry,
          slug: slugify(c.industry),
          description: `${c.industry} companies`,
        },
      });

      const existing = await prisma.company.findUnique({ where: { slug } });
      if (existing) {
        await prisma.company.update({
          where: { slug },
          data: {
            status,
            industry: c.industry,
            industryId: industryRecord.id,
            country: c.country || 'Unknown',
            foundingYear: c.foundingYear,
            teamSize: c.teamSize,
            fundingUsd: c.fundingUsd ? BigInt(c.fundingUsd) : null,
            peakUsers: c.peakUsers,
            lifetimeMonths,
            summary: c.summary,
          },
        });
        updated++;
      } else {
        await prisma.company.create({
          data: {
            name: c.name,
            slug,
            alternativeNames: [c.name],
            status,
            industry: c.industry,
            industryId: industryRecord.id,
            country: c.country || 'Unknown',
            foundingYear: c.foundingYear,
            teamSize: c.teamSize,
            fundingUsd: c.fundingUsd ? BigInt(c.fundingUsd) : null,
            peakUsers: c.peakUsers,
            lifetimeMonths,
            summary: c.summary,
          },
        });
        created++;
      }

      if ((i + 1) % 50 === 0) {
        console.log(`  ✅ Processed ${i + 1}/${successfulCompanies.length}...`);
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ Failed: ${c.name}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Successful companies seed complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed:  ${failed}`);

  // Verify counts
  const counts = await prisma.$queryRaw`SELECT status, COUNT(*)::int as count FROM companies GROUP BY status ORDER BY count DESC`;
  console.log('\n📊 Company counts by status:');
  for (const row of counts) {
    console.log(`   ${row.status}: ${row.count}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
