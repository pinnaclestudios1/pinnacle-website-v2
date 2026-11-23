import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import content from './src/content.js';
import { tplClassic, jsonLd, esc } from './src/ui/templates.js';

/**
 * Pre-renders the crawlable 2D content into index.html, and on build writes one
 * HTML file per floor + case study (each with its own title / description /
 * canonical) plus sitemap.xml and robots.txt. Works on any static host.
 */
function galleryPages() {
  let outDir = 'dist';
  const pages = () => [
    ...content.floors.map((f) => ({ route: f.path, title: f.title, description: f.description })),
    ...content.caseStudies.map((c) => ({
      route: `/work/${c.slug}`,
      title: `${c.client}: ${c.title} | Case Study | ${content.site.name}`,
      description: c.summary,
    })),
  ];
  return {
    name: 'pinnacle-gallery-pages',
    configResolved(cfg) {
      outDir = path.resolve(cfg.root, cfg.build.outDir);
    },
    transformIndexHtml(html) {
      // Inline the real logo in the header so it's crisp and its orange peak can animate.
      const logo = fs
        .readFileSync(path.resolve('public/brand/pinnacle-logo-dark.svg'), 'utf8')
        .replace(/<svg width="\d+" height="\d+"/, '<svg class="logo__svg" aria-hidden="true" focusable="false"')
        .replace('fill="#FF5B27"', 'fill="#FF5B27" class="logo__peak"')
        .replace(/clip0_[\w]+/g, 'logo-clip');
      return html
        .replace('<!--LOGO-->', logo)
        .replace('<!--CLASSIC-->', tplClassic(content))
        .replace('<!--JSONLD-->', jsonLd(content));
    },
    closeBundle() {
      const indexFile = path.join(outDir, 'index.html');
      if (!fs.existsSync(indexFile)) return;
      const base = fs.readFileSync(indexFile, 'utf8');
      const url = content.site.url.replace(/\/$/, '');
      for (const p of pages()) {
        const html = base
          .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(p.description)}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(p.title)}`)
          .replace('</head>', `  <link rel="canonical" href="${url}${p.route === '/' ? '/' : p.route}" />
  </head>`);
        const dir = path.join(outDir, p.route);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
      }
      const today = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(
        path.join(outDir, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages()
          .map((p) => `  <url><loc>${url}${p.route}</loc><lastmod>${today}</lastmod></url>`)
          .join('\n')}\n</urlset>\n`,
      );
      fs.writeFileSync(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${url}/sitemap.xml\n`);
    },
  };
}

export default defineConfig({
  plugins: [galleryPages()],
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 1200 },
});
