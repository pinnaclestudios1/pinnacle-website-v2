// Derives the web brand assets from the master logo SVGs in /brand.
// Run: npm run brand   (outputs are committed, so only needed if the logo changes)
import fs from 'node:fs';

const read = (f) => fs.readFileSync(`brand/${f}`, 'utf8');
const dark = read('Pinnacle_mainLogo_darkbg.svg');
const light = read('Pinnacle_mainLogo_lightbg.svg');

// Path order in the master file: [0] triangle, [1] inner edges, [2] orange peak,
// [3] [4] base nodes, [5] centre node, [6] PINNACLE, [7] STUDIOS
const paths = (svg) => [...svg.matchAll(/<path [^>]*\/>/g)].map((m) => m[0]);
const d = paths(dark);
const mark = d.slice(0, 6).join('');

fs.mkdirSync('public/brand', { recursive: true });
fs.writeFileSync('public/brand/pinnacle-logo-dark.svg', dark);
fs.writeFileSync('public/brand/pinnacle-logo-light.svg', light);

// Stacked lock-up (mark centred above the wordmark): used on the lift doors,
// where it splits down the middle as they open.
const W = 700;
const ms = 1.3;
const markX = (W - 321.3 * ms) / 2;
const stacked = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 560" fill="none">
<g transform="translate(${markX.toFixed(2)} 0) scale(${ms})">${mark}</g>
<g transform="translate(${((W - 643) / 2 - 397).toFixed(2)} 328)">${d[6]}</g>
<g transform="translate(${((W - 440) / 2 - 396).toFixed(2)} 324)">${d[7]}</g>
</svg>
`;
fs.writeFileSync('public/brand/pinnacle-stacked-dark.svg', stacked);

// Mark only
fs.writeFileSync('public/brand/pinnacle-mark-dark.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 312 252" fill="none">${mark}</svg>\n`);

// Favicon: mark on a dark rounded tile
const s = 0.15;
fs.writeFileSync(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0c0b0e"/><g transform="translate(${(32 - 156 * s).toFixed(2)} ${(32 - 126 * s).toFixed(2)}) scale(${s})" fill="none">${mark.replace(/stroke-width="[\d.]+"/g, 'stroke-width="14"')}</g></svg>\n`,
);

console.log('brand assets written to public/brand + public/favicon.svg');
