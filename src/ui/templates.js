/**
 * Pure HTML-string templates (no DOM access).
 * Used at runtime for the 3D gallery placards AND at build time
 * (vite.config.js) to pre-render the crawlable 2D version of the site.
 */

export const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const tags = (list, cls = 'tags') => `<ul class="${cls}">${list.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;

const meta = (left, right) =>
  `<header class="placard__meta"><span>${esc(left)}</span><span>${esc(right)}</span></header>`;

/* ───────────────────────── Lobby ───────────────────────── */

export const tplHero = ({ hero }) => `
  <div class="hero-copy">
    <p class="kicker"><span class="kicker__dot"></span>${esc(hero.kicker)}</p>
    <h1 class="hero-copy__title"><span class="sr-only">Pinnacle Studios: </span>${esc(hero.headline)}</h1>
    <p class="hero-copy__sub">${esc(hero.sub)}</p>
    <div class="btn-row">
      <button class="btn btn--primary" data-action="next">${esc(hero.primary.label)} <span aria-hidden="true">↓</span></button>
      <a class="btn btn--ghost" href="${hero.secondary.href}" data-link>${esc(hero.secondary.label)}</a>
    </div>
  </div>`;

export const tplManifesto = ({ manifesto }) => `
  <article class="placard placard--wide">
    ${meta(manifesto.kicker, 'Lobby')}
    <h2 class="placard__title">${esc(manifesto.title)}</h2>
    <p class="placard__body">${esc(manifesto.body)}</p>
    <dl class="stats">
      ${manifesto.stats.map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd data-count="${esc(s.value)}">${esc(s.value)}</dd></div>`).join('')}
    </dl>
  </article>`;

export const tplFloorGuide = ({ floors }) => `
  <article class="placard placard--wide">
    ${meta('Floor guide', 'Take the lift')}
    <h2 class="placard__title">Where to next?</h2>
    <ol class="floor-guide">
      ${floors
        .slice(1)
        .map(
          (f) => `<li><a href="${f.path}" data-link><span class="floor-guide__lvl">${esc(f.level)}</span><span class="floor-guide__name">${esc(f.name)}</span><span class="floor-guide__arrow" aria-hidden="true">→</span></a></li>`,
        )
        .join('')}
    </ol>
  </article>`;

/* ───────────────────────── Services ───────────────────────── */

export const tplServicesIntro = ({ services }) => `
  <article class="placard placard--wide">
    ${meta('Floor 1', 'Services Wing')}
    <h2 class="placard__title">Seven disciplines.<br/>One studio.</h2>
    <p class="placard__body">Walk the wing to meet each craft. Every exhibit is a service we deliver end-to-end, or together as one team.</p>
    <ol class="mini-index">${services.map((s) => `<li><button data-goto-stop="${s.id}"><span>${s.no}</span>${esc(s.title)}</button></li>`).join('')}</ol>
  </article>`;

export const tplService = (s) => `
  <article class="placard">
    ${meta(`Exhibit ${s.no}`, 'Services Wing')}
    <h2 class="placard__title">${esc(s.title)}</h2>
    <p class="placard__art"><em>${esc(s.artTitle)}</em><br/>${esc(s.medium)}</p>
    <p class="placard__body">${esc(s.body)}</p>
    ${tags(s.deliverables)}
    <div class="btn-row"><a class="btn btn--primary btn--sm" href="/contact" data-link>Enquire about this service</a></div>
  </article>`;

export const tplServicesEnd = () => `
  <article class="placard">
    ${meta('End of wing', 'Floor 1')}
    <h2 class="placard__title">See it all in action.</h2>
    <p class="placard__body">The Case Study Hall upstairs shows how these crafts come together on real products.</p>
    <div class="btn-row"><a class="btn btn--primary" href="/work" data-link>Ride up to Floor 2 ↑</a></div>
  </article>`;

/* ───────────────────────── Work ───────────────────────── */

export const tplWorkIntro = ({ caseStudies }) => `
  <article class="placard placard--wide">
    ${meta('Floor 2', 'Case Study Hall')}
    <h2 class="placard__title">Selected work.</h2>
    <p class="placard__body">Each frame is a project we designed, built or grew. Click a canvas to step inside its story.</p>
    <ol class="mini-index">${caseStudies.map((c, i) => `<li><button data-goto-stop="${c.slug}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(c.client)}</button></li>`).join('')}</ol>
  </article>`;

export const tplCase = (c, i) => `
  <article class="placard">
    ${meta(`Work ${String(i + 1).padStart(2, '0')} · ${c.year}`, c.industry)}
    <h2 class="placard__title">${esc(c.client)}</h2>
    <p class="placard__art"><em>${esc(c.title)}</em></p>
    <p class="placard__body">${esc(c.summary)}</p>
    <div class="result-row">${c.results.slice(0, 2).map((r) => `<div><strong>${esc(r.value)}</strong><span>${esc(r.label)}</span></div>`).join('')}</div>
    ${tags(c.services)}
    <div class="btn-row"><a class="btn btn--primary btn--sm" href="/work/${c.slug}" data-link>Open case study</a></div>
  </article>`;

export const tplCaseDetail = (c, { next } = {}) => `
  <article class="case">
    <header class="case__head">
      <p class="kicker">${esc(c.industry)} · ${esc(c.year)}</p>
      <h2 class="case__client">${esc(c.client)}</h2>
      <p class="case__title">${esc(c.title)}</p>
      ${tags(c.services)}
    </header>
    <div class="case__results">${c.results.map((r) => `<div><strong>${esc(r.value)}</strong><span>${esc(r.label)}</span></div>`).join('')}</div>
    <div class="case__grid">
      <section><h3>The challenge</h3><p>${esc(c.challenge)}</p></section>
      <section><h3>Our approach</h3><p>${esc(c.approach)}</p></section>
    </div>
    <blockquote class="case__quote"><p>“${esc(c.quote.text)}”</p><cite>${esc(c.quote.by)}</cite></blockquote>
    <footer class="case__foot">
      <a class="btn btn--primary" href="/contact" data-link>Start a similar project</a>
      ${next ? `<a class="btn btn--ghost" href="/work/${next.slug}" data-link>Next: ${esc(next.client)} →</a>` : ''}
    </footer>
  </article>`;

export const tplWorkEnd = () => `
  <article class="placard">
    ${meta('End of hall', 'Floor 2')}
    <h2 class="placard__title">Your project could hang here.</h2>
    <p class="placard__body">Meet the people and process behind the work in the Studio Rotunda, one floor up.</p>
    <div class="btn-row"><a class="btn btn--primary" href="/studio" data-link>Ride up to Floor 3 ↑</a><a class="btn btn--ghost" href="/contact" data-link>Start a project</a></div>
  </article>`;

/* ───────────────────────── Studio ───────────────────────── */

export const tplStory = ({ studio, site }) => `
  <article class="placard">
    ${meta(studio.story.kicker, `Est. ${site.founded}`)}
    <h2 class="placard__title">${esc(studio.story.title)}</h2>
    <p class="placard__body">${esc(studio.story.body)}</p>
  </article>`;

export const tplProcess = ({ studio }) => `
  <article class="placard placard--wide">
    ${meta('How we work', 'Four steps to the peak')}
    <h2 class="placard__title">Our process.</h2>
    <ol class="process">${studio.process.map((p) => `<li><span>${p.no}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div></li>`).join('')}</ol>
  </article>`;

export const tplTeam = ({ studio }) => `
  <article class="placard placard--wide">
    ${meta('The studio', 'Portrait wall')}
    <h2 class="placard__title">Small, senior, multidisciplinary.</h2>
    <ul class="team">${studio.team.map((t) => `<li class="${t.careers ? 'is-careers' : ''}"><h3>${esc(t.role)}</h3><p>${esc(t.body)}</p></li>`).join('')}</ul>
    <p class="placard__body placard__body--sm"><strong>${esc(studio.careers.title)}.</strong> ${esc(studio.careers.body)} <a href="mailto:?subject=Portfolio" data-careers>${esc(studio.careers.cta)} →</a></p>
  </article>`;

export const tplTestimonials = ({ studio }) => `
  <article class="placard">
    ${meta('Kind words', 'Client voices')}
    <div class="quotes" data-quotes>
      ${studio.testimonials.map((t, i) => `<blockquote class="${i === 0 ? 'is-active' : ''}"><p>“${esc(t.text)}”</p><cite>${esc(t.by)}</cite></blockquote>`).join('')}
    </div>
    <div class="quotes__dots">${studio.testimonials.map((_, i) => `<button aria-label="Show testimonial ${i + 1}" data-quote="${i}" class="${i === 0 ? 'is-active' : ''}"></button>`).join('')}</div>
  </article>`;

export const tplClients = ({ studio }) => `
  <article class="placard">
    ${meta('Collection', 'Brands we’ve partnered with')}
    <h2 class="placard__title">In good company.</h2>
    <ul class="clients">${studio.clients.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
  </article>`;

export const tplEngagement = ({ studio }) => `
  <article class="placard placard--wide">
    ${meta('Ways to work together', 'Engagement models')}
    <h2 class="placard__title">Pick your path up.</h2>
    <ul class="plans">${studio.engagement
      .map((e) => `<li><h3>${esc(e.name)}</h3><p class="plans__dur">${esc(e.duration)}</p><p>${esc(e.body)}</p><p class="plans__best">Best for: ${esc(e.best)}</p></li>`)
      .join('')}</ul>
    <div class="btn-row"><a class="btn btn--primary" href="/contact" data-link>Ride to the Rooftop ↑</a></div>
  </article>`;

/* ───────────────────────── Rooftop / Contact ───────────────────────── */

export const tplContactForm = ({ contact, site }) => `
  <article class="placard placard--panel" data-scroll-lock>
    ${meta(contact.kicker, 'The Rooftop')}
    <h2 class="placard__title">${esc(contact.title)}</h2>
    <p class="placard__body">${esc(contact.body)}</p>
    <form class="form" data-contact-form novalidate>
      <div class="form__row">
        <label><span>Name</span><input name="name" autocomplete="name" required /></label>
        <label><span>Email</span><input name="email" type="email" autocomplete="email" required /></label>
      </div>
      <label><span>Company <em>(optional)</em></span><input name="company" autocomplete="organization" /></label>
      <fieldset><legend>What do you need?</legend>
        <div class="chips">${contact.services.map((s) => `<label class="chip"><input type="checkbox" name="services" value="${esc(s)}" /><span>${esc(s)}</span></label>`).join('')}</div>
      </fieldset>
      <fieldset><legend>Budget</legend>
        <div class="chips">${contact.budgets.map((b, i) => `<label class="chip"><input type="radio" name="budget" value="${esc(b)}" ${i === 4 ? 'checked' : ''}/><span>${esc(b)}</span></label>`).join('')}</div>
      </fieldset>
      <label><span>Tell us about the project</span><textarea name="message" rows="3" required></textarea></label>
      <div class="form__foot">
        <button class="btn btn--primary" type="submit">Send brief</button>
        <a class="form__mail" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
      </div>
      <p class="form__status" role="status" aria-live="polite"></p>
    </form>
  </article>`;

export const tplFaq = ({ faq }) => `
  <article class="placard placard--panel" data-scroll-lock>
    ${meta('Visitor questions', 'FAQ')}
    <h2 class="placard__title">Good to know.</h2>
    <div class="faq">${faq.map((f, i) => `<details ${i === 0 ? 'open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
  </article>`;

export const tplFooter = ({ site, floors }) => `
  <article class="placard placard--wide">
    ${meta('Closing time', `© ${new Date().getFullYear()} ${site.name}`)}
    <h2 class="placard__title">Thanks for visiting the gallery.</h2>
    <div class="footer-grid">
      <div><h3>Visit</h3><p>${esc(site.location)}</p><p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p><p>${esc(site.phone)}</p></div>
      <div><h3>Floors</h3><ul>${floors.map((f) => `<li><a href="${f.path}" data-link>${esc(f.level)} · ${esc(f.nav)}</a></li>`).join('')}</ul></div>
      <div><h3>Follow</h3><ul>${site.socials.map((s) => `<li><a href="${s.href}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join('')}</ul></div>
    </div>
    <p class="legal"><a href="#privacy" data-legal="privacy">Privacy</a><a href="#terms" data-legal="terms">Terms</a><span>Built in-house, naturally.</span></p>
  </article>`;

/* ───────────────────────── Classic 2D site (pre-rendered) ───────────────────────── */

export const tplClassic = (c) => {
  const { site, floors, hero, manifesto, services, caseStudies, studio, faq } = c;
  return `
  <header class="classic__header">
    <a class="classic__logo" href="/" data-link><img src="/brand/pinnacle-logo-dark.svg" alt="Pinnacle Studios" width="146" height="35" /></a>
    <nav aria-label="Main">${floors.map((f) => `<a href="#c-${f.id}">${esc(f.nav)}</a>`).join('')}</nav>
    <button class="btn btn--ghost btn--sm" data-action="toggle-classic">Enter 3D gallery</button>
  </header>
  <main class="classic__main">
    <section id="c-lobby" class="classic__section classic__hero">
      <p class="kicker">${esc(hero.kicker)}</p>
      <h1>Pinnacle Studios</h1>
      <p class="classic__lead">${esc(hero.headline)} ${esc(hero.sub)}</p>
      <p><a class="btn btn--primary" href="#c-contact">${esc(hero.secondary.label)}</a></p>
      <h2>${esc(manifesto.title)}</h2>
      <p>${esc(manifesto.body)}</p>
      <dl class="stats">${manifesto.stats.map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('')}</dl>
    </section>
    <section id="c-services" class="classic__section">
      <p class="kicker">Floor 1 · Services</p>
      <h2>Seven disciplines. One studio.</h2>
      <div class="classic__cards">${services
        .map((s) => `<article><span class="classic__no">${s.no}</span><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p>${tags(s.deliverables)}</article>`)
        .join('')}</div>
    </section>
    <section id="c-work" class="classic__section">
      <p class="kicker">Floor 2 · Case studies</p>
      <h2>Selected work.</h2>
      ${caseStudies.map((cs) => tplCaseDetail(cs)).join('')}
    </section>
    <section id="c-studio" class="classic__section">
      <p class="kicker">Floor 3 · Studio</p>
      <h2>${esc(studio.story.title)}</h2>
      <p>${esc(studio.story.body)}</p>
      <h3>Process</h3>
      <ol class="process">${studio.process.map((p) => `<li><span>${p.no}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div></li>`).join('')}</ol>
      <h3>Team</h3>
      <ul class="team">${studio.team.map((t) => `<li><h3>${esc(t.role)}</h3><p>${esc(t.body)}</p></li>`).join('')}</ul>
      <h3>Clients say</h3>
      ${studio.testimonials.map((t) => `<blockquote><p>“${esc(t.text)}”</p><cite>${esc(t.by)}</cite></blockquote>`).join('')}
      <h3>Clients</h3>
      <ul class="clients">${studio.clients.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>Engagement models</h3>
      <ul class="plans">${studio.engagement.map((e) => `<li><h3>${esc(e.name)}</h3><p class="plans__dur">${esc(e.duration)}</p><p>${esc(e.body)}</p></li>`).join('')}</ul>
    </section>
    <section id="c-contact" class="classic__section">
      <p class="kicker">Rooftop · Contact</p>
      ${tplContactForm(c)}
      <h2>FAQ</h2>
      <div class="faq">${faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
    </section>
  </main>
  <footer class="classic__footer">
    <p>© ${new Date().getFullYear()} ${esc(site.name)} · <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
    <p>${site.socials.map((s) => `<a href="${s.href}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(' · ')}</p>
  </footer>`;
};

export const jsonLd = ({ site, services }) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: site.name,
    url: site.url,
    email: site.email,
    description: site.description,
    foundingDate: site.founded,
    sameAs: site.socials.map((s) => s.href),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Services',
      itemListElement: services.map((s) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.title, description: s.body } })),
    },
  });
