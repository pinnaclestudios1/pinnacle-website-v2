/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PINNACLE STUDIOS — SITE CONTENT
 *  Every word on the website lives in this file. Edit freely.
 *
 *  ⚠ Items marked  SAMPLE  are placeholder copy (case studies, testimonials,
 *    stats, client names). Replace them with your real work before launch.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const site = {
  name: 'Pinnacle Studios',
  shortName: 'Pinnacle',
  // Used for canonical URLs + the sitemap. Change to your own domain once it's
  // connected in Vercel (Settings › Domains).
  url: 'https://pinnacle-website-v2.vercel.app',
  email: 'team@pinnaclestudios.in',
  phone: '+91 00000 00000', // TODO
  location: 'Remote-first · Working worldwide', // TODO
  tagline: 'Software, web & creative studio.',
  description:
    'Pinnacle Studios is a software and creative agency. We design, build and grow digital products: software, websites, UI/UX design, branding, motion graphics, automation and SEO.',
  founded: '2021', // TODO
  socials: [
    { label: 'Instagram', href: 'https://instagram.com/' },
    { label: 'LinkedIn', href: 'https://linkedin.com/' },
    { label: 'Behance', href: 'https://behance.net/' },
    { label: 'Dribbble', href: 'https://dribbble.com/' },
    { label: 'X', href: 'https://x.com/' },
  ],
  // Optional: set a form endpoint (Formspree, Getform, your own API…).
  // If empty, the contact form opens the visitor's email app instead.
  formEndpoint: '',
};

/** The building: one floor = one page. */
export const floors = [
  {
    id: 'lobby',
    path: '/',
    level: 'G',
    name: 'The Lobby',
    nav: 'Lobby',
    title: 'Pinnacle Studios — Software, Web & Creative Agency',
    description: site.description,
    mascot: 'Hi, I’m Pinn! Scroll to explore the gallery.',
  },
  {
    id: 'services',
    path: '/services',
    level: '1',
    name: 'Services Wing',
    nav: 'Services',
    title: 'Services — Software, Websites, Design, Branding, Motion, Automation & SEO | Pinnacle Studios',
    description:
      'Seven disciplines under one roof: custom software, websites, UI/UX design, branding, motion graphics, automation and SEO.',
    mascot: 'Seven exhibits, seven crafts. Let’s walk.',
  },
  {
    id: 'work',
    path: '/work',
    level: '2',
    name: 'Case Study Hall',
    nav: 'Work',
    title: 'Case Studies — Selected Work | Pinnacle Studios',
    description: 'Selected case studies from Pinnacle Studios: products, platforms and brands we have designed, built and grown.',
    mascot: 'Click any frame to open the full story.',
  },
  {
    id: 'studio',
    path: '/studio',
    level: '3',
    name: 'The Studio Rotunda',
    nav: 'Studio',
    title: 'About the Studio — Process, Team & Clients | Pinnacle Studios',
    description: 'Who we are, how we work, the people behind the work and the ways you can partner with Pinnacle Studios.',
    mascot: 'This is where the magic gets made.',
  },
  {
    id: 'contact',
    path: '/contact',
    level: 'R',
    name: 'The Rooftop',
    nav: 'Contact',
    title: 'Contact — Start a Project | Pinnacle Studios',
    description: 'Tell us about your project. Pinnacle Studios replies to every brief within one business day.',
    mascot: 'Best view in the building. Say hello!',
  },
];

export const hero = {
  kicker: 'A software & creative agency',
  headline: 'We build digital work worth framing.',
  sub: 'Software, websites, design, branding, motion, automation and SEO, made by one studio.',
  primary: { label: 'Explore the gallery', action: 'next' },
  secondary: { label: 'Start a project', href: '/contact' },
};

export const manifesto = {
  kicker: 'Curator’s note',
  title: 'Every project is an exhibit.',
  body:
    'We treat your product the way a gallery treats a masterpiece: with research, care and craft. Strategy, design and engineering sit in one room, so ideas move from sketch to shipped without getting lost in hand-offs.',
  // SAMPLE stats — replace with your own numbers
  stats: [
    { value: '120+', label: 'Projects shipped' },
    { value: '40+', label: 'Brands partnered' },
    { value: '7', label: 'Disciplines' },
    { value: '96%', label: 'Clients who return' },
  ],
};

/** Floor 1. `art` selects the 3D sculpture shown on the pedestal. */
export const services = [
  {
    id: 'software',
    no: '01',
    title: 'Software Development',
    short: 'Custom platforms, SaaS & mobile apps',
    art: 'lattice',
    artTitle: 'Lattice of Logic, 2026',
    medium: 'TypeScript, Python, Go, cloud-native infrastructure',
    body: 'We engineer reliable, scalable software, from MVPs to enterprise platforms. Clean architecture, tested code and DevOps that lets you ship every week.',
    deliverables: ['Web & mobile apps', 'SaaS platforms', 'APIs & integrations', 'Cloud & DevOps'],
  },
  {
    id: 'websites',
    no: '02',
    title: 'Website Design & Development',
    short: 'Fast, beautiful, conversion-led websites',
    art: 'triptych',
    artTitle: 'Browser Triptych, 2026',
    medium: 'Next.js, WebGL, headless CMS, Shopify',
    body: 'Marketing sites, e-commerce stores and immersive 3D experiences, built to load fast, rank well and turn visitors into customers.',
    deliverables: ['Marketing websites', 'E-commerce', 'Headless CMS', '3D & WebGL experiences'],
  },
  {
    id: 'design',
    no: '03',
    title: 'UI / UX Design',
    short: 'Products people love to use',
    art: 'knot',
    artTitle: 'Infinite Flow, 2026',
    medium: 'Research, Figma, prototyping, design systems',
    body: 'We research real users, map their journeys and design interfaces that feel effortless, then document everything in design systems your team can scale.',
    deliverables: ['User research', 'Product & UI design', 'Prototyping', 'Design systems'],
  },
  {
    id: 'branding',
    no: '04',
    title: 'Branding & Identity',
    short: 'Brands with a point of view',
    art: 'seal',
    artTitle: 'The Seal, 2026',
    medium: 'Strategy, naming, identity systems, guidelines',
    body: 'From positioning and naming to logos, type and tone of voice, we build identities that are unmistakable on every surface.',
    deliverables: ['Brand strategy', 'Logo & identity', 'Packaging', 'Brand guidelines'],
  },
  {
    id: 'motion',
    no: '05',
    title: 'Motion Graphics',
    short: 'Stories that move',
    art: 'wave',
    artTitle: 'Kinetic Field, 2026',
    medium: 'After Effects, Cinema 4D, Blender, Rive',
    body: 'Explainer videos, product launches, social reels and UI motion. Animation that grabs attention and makes complex ideas simple.',
    deliverables: ['Explainer videos', 'Social & reels', '3D animation', 'UI & logo motion'],
  },
  {
    id: 'automation',
    no: '06',
    title: 'Automation & AI',
    short: 'Workflows that run themselves',
    art: 'gears',
    artTitle: 'Perpetual Engine, 2026',
    medium: 'AI agents, n8n, Zapier, custom integrations',
    body: 'We find the repetitive work slowing your team down and automate it with AI assistants, integrations and internal tools that save hours every week.',
    deliverables: ['AI agents & chatbots', 'Workflow automation', 'CRM & ops integrations', 'Internal tools'],
  },
  {
    id: 'seo',
    no: '07',
    title: 'SEO & Growth',
    short: 'Climb to the top of search',
    art: 'ascent',
    artTitle: 'The Ascent, 2026',
    medium: 'Technical SEO, content, analytics, CRO',
    body: 'Technical audits, content strategy and conversion optimisation that compound month after month, taking you to the pinnacle of search results.',
    deliverables: ['Technical SEO', 'Content strategy', 'Local & e-commerce SEO', 'Analytics & CRO'],
  },
];

/**
 * Floor 2 — SAMPLE case studies. Replace with real projects.
 * `palette` drives the generated artwork on each frame. `style` picks a composition:
 * orbits | grid | waves | blocks | bars | rings
 */
export const caseStudies = [
  {
    slug: 'kairo-health',
    client: 'Kairo Health',
    title: 'A calmer way to book care',
    industry: 'Healthcare',
    year: '2026',
    services: ['UI/UX Design', 'Software', 'Branding'],
    summary: 'A patient app and clinic dashboard that cut appointment no-shows by a third.',
    challenge:
      'Kairo’s clinics were juggling phone bookings, paper reminders and three disconnected tools. Patients missed appointments and staff spent hours rescheduling.',
    approach:
      'We interviewed 40 patients and front-desk staff, redesigned the booking journey around a single “next step” screen, and engineered a React Native app with a real-time clinic dashboard and automated reminders.',
    results: [
      { value: '−34%', label: 'no-shows' },
      { value: '4.8★', label: 'app store rating' },
      { value: '11 hrs', label: 'saved per clinic / week' },
    ],
    quote: { text: 'Pinnacle didn’t just build an app. They rebuilt how our clinics breathe.', by: 'Head of Operations, Kairo Health' },
    palette: ['#0f3d3a', '#1f7a6d', '#f2e6c9', '#ff8a5b'],
    style: 'orbits',
  },
  {
    slug: 'verdant-grocers',
    client: 'Verdant Grocers',
    title: 'Fresh produce, faster checkout',
    industry: 'E-commerce',
    year: '2025',
    services: ['Website', 'SEO', 'Automation'],
    summary: 'A headless storefront and automated fulfilment flow for an organic grocery chain.',
    challenge: 'An ageing storefront took six seconds to load, and every order was re-typed into the warehouse system by hand.',
    approach:
      'We rebuilt the shop on a headless stack with edge caching, restructured category pages for search, and connected orders straight to fulfilment with an automation layer.',
    results: [
      { value: '+212%', label: 'organic traffic' },
      { value: '0.9s', label: 'load time' },
      { value: '+48%', label: 'conversion rate' },
    ],
    quote: { text: 'Our site finally feels as fresh as our food.', by: 'Founder, Verdant Grocers' },
    palette: ['#203a1c', '#6aa84f', '#f6f0dc', '#e8c547'],
    style: 'grid',
  },
  {
    slug: 'atlas-freight',
    client: 'Atlas Freight',
    title: 'Logistics, live on one screen',
    industry: 'Logistics',
    year: '2025',
    services: ['Software', 'Automation', 'UI/UX Design'],
    summary: 'A real-time fleet control tower that replaced 14 spreadsheets.',
    challenge: 'Dispatchers tracked 600 trucks across spreadsheets, calls and chat groups. Delays were found hours too late.',
    approach:
      'We built a live map-first control tower with predictive ETAs, automated exception alerts and driver-side mobile check-ins, rolled out depot by depot.',
    results: [
      { value: '14 → 1', label: 'tools consolidated' },
      { value: '−27%', label: 'late deliveries' },
      { value: '600+', label: 'vehicles tracked live' },
    ],
    quote: { text: 'We see problems before customers do. That changed everything.', by: 'CTO, Atlas Freight' },
    palette: ['#14213d', '#3a5a9b', '#e5e5e5', '#fca311'],
    style: 'waves',
  },
  {
    slug: 'lumen-finance',
    client: 'Lumen Finance',
    title: 'A brand that earns trust',
    industry: 'Fintech',
    year: '2026',
    services: ['Branding', 'Website', 'Motion Graphics'],
    summary: 'A full rebrand, launch film and website for a neo-bank entering three new markets.',
    challenge: 'Lumen looked like every other fintech: blue gradients, stock photos and jargon. Trust and recall were low.',
    approach:
      'We repositioned Lumen around “money in plain light”, built a warm identity system with a custom typeface, produced a 60-second launch film and a site that explains every fee in one sentence.',
    results: [
      { value: '3.1×', label: 'brand recall' },
      { value: '2M+', label: 'launch film views' },
      { value: '+65%', label: 'sign-ups in launch month' },
    ],
    quote: { text: 'For the first time, our brand sounds like us.', by: 'CMO, Lumen Finance' },
    palette: ['#2b1a3d', '#7b4bb7', '#fff4e0', '#ffcf5c'],
    style: 'rings',
  },
  {
    slug: 'monsoon-records',
    client: 'Monsoon Records',
    title: 'Music that moves on every screen',
    industry: 'Media & Music',
    year: '2024',
    services: ['Motion Graphics', 'Branding', 'Website'],
    summary: 'Album identities, visualisers and an artist hub for an independent label.',
    challenge: 'The label released 30 records a year with no consistent visual language and a dated website no one visited.',
    approach:
      'We designed a modular identity that flexes per release, a library of motion templates for reels and visualisers, and an artist hub with streaming previews.',
    results: [
      { value: '+180%', label: 'social engagement' },
      { value: '30', label: 'releases / year, on-brand' },
      { value: '5×', label: 'faster content production' },
    ],
    quote: { text: 'Every release now looks like an event.', by: 'Creative Lead, Monsoon Records' },
    palette: ['#1b1b2f', '#e43f5a', '#f6e9e9', '#3fc1c9'],
    style: 'bars',
  },
  {
    slug: 'orbit-learning',
    client: 'Orbit Learning',
    title: 'Learning that feels like play',
    industry: 'EdTech',
    year: '2026',
    services: ['UI/UX Design', 'Software', 'SEO'],
    summary: 'A gamified learning platform for 200,000 students, with AI-generated practice.',
    challenge: 'Students dropped off after week two. Content was static and teachers could not see who was falling behind.',
    approach:
      'We designed streaks, quests and an AI practice engine that adapts to each learner, plus a teacher view highlighting who needs help today.',
    results: [
      { value: '+73%', label: 'week-4 retention' },
      { value: '200k', label: 'active students' },
      { value: '#1', label: 'ranking for core keywords' },
    ],
    quote: { text: 'Our students ask for homework now. That’s the review.', by: 'Co-founder, Orbit Learning' },
    palette: ['#10243e', '#2a9d8f', '#f1faee', '#f4a261'],
    style: 'blocks',
  },
];

/** Floor 3 — The Studio. */
export const studio = {
  story: {
    kicker: 'Our story',
    title: 'A studio built like a cairn.',
    body:
      'Pinnacle Studios started with a simple belief: great digital work comes from small, senior teams who care. Like stones in a cairn, every discipline we add is balanced on the others. Strategy holds up design, design holds up engineering, and together they point upward.',
  },
  process: [
    { no: '01', title: 'Discover', body: 'Workshops, research and audits to understand your users, market and goals.' },
    { no: '02', title: 'Define', body: 'Strategy, scope and a roadmap with clear milestones and success metrics.' },
    { no: '03', title: 'Design & Build', body: 'Weekly sprints, live previews and continuous feedback. No black boxes.' },
    { no: '04', title: 'Launch & Grow', body: 'Launch, measure, optimise. We stay on as your long-term growth partner.' },
  ],
  team: [
    { role: 'Strategy', body: 'Research, positioning and product strategy.' },
    { role: 'Engineering', body: 'Full-stack, mobile, cloud and AI engineers.' },
    { role: 'Design', body: 'Product, UI/UX and visual designers.' },
    { role: 'Motion', body: 'Animators, 3D artists and editors.' },
    { role: 'Growth', body: 'SEO, content and performance marketers.' },
    { role: 'You?', body: 'We’re always meeting talented people.', careers: true },
  ],
  // SAMPLE testimonials
  testimonials: [
    { text: 'They think like founders and build like engineers. Rare combination.', by: 'CEO, Atlas Freight' },
    { text: 'The most collaborative agency we’ve worked with. Weekly demos, zero surprises.', by: 'Product Lead, Kairo Health' },
    { text: 'Our rebrand paid for itself in the first quarter.', by: 'CMO, Lumen Finance' },
  ],
  // SAMPLE client names
  clients: ['Kairo Health', 'Verdant', 'Atlas Freight', 'Lumen', 'Monsoon', 'Orbit', 'Northpeak', 'Saffron & Co', 'Halcyon', 'Ferrous', 'Bluewren', 'Quanta'],
  engagement: [
    { name: 'Sprint', duration: '2–4 weeks', body: 'A focused burst: a brand, a landing page, a prototype or an audit.', best: 'Validating an idea' },
    { name: 'Build', duration: '6–16 weeks', body: 'A full product, platform or website, from discovery to launch.', best: 'Launching something new' },
    { name: 'Partner', duration: 'Monthly retainer', body: 'An embedded senior team for design, development, SEO and growth.', best: 'Scaling with momentum' },
  ],
  careers: {
    title: 'Join the studio',
    body: 'We hire curious designers, engineers and storytellers. Remote-friendly, senior-led, no busywork.',
    cta: 'Send your portfolio',
  },
};

export const faq = [
  { q: 'How much does a project cost?', a: 'Sprints start from a fixed fee; builds are quoted after a free discovery call. We always share a clear estimate before any work begins.' },
  { q: 'How long does a website take?', a: 'A marketing website usually takes 4–8 weeks. Complex platforms and e-commerce take 8–16 weeks depending on scope.' },
  { q: 'Do you work with startups?', a: 'Yes. Many of our partners are early-stage founders. We help shape the MVP, ship fast and scale with you.' },
  { q: 'Can you take over an existing product?', a: 'Absolutely. We start with a code and UX audit, then improve, refactor or extend what you already have.' },
  { q: 'Do you offer support after launch?', a: 'Every project includes a support window, and most clients continue on a monthly Partner retainer for updates, SEO and growth.' },
];

export const contact = {
  kicker: 'Start a project',
  title: 'Let’s build your pinnacle.',
  body: 'Tell us a little about your project. We reply to every brief within one business day.',
  services: ['Software', 'Website', 'UI/UX Design', 'Branding', 'Motion Graphics', 'Automation', 'SEO'],
  budgets: ['Under $5k', '$5k – $15k', '$15k – $50k', '$50k+', 'Not sure yet'],
};

export const content = { site, floors, hero, manifesto, services, caseStudies, studio, faq, contact };
export default content;
