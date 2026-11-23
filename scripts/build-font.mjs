// Converts Fontsource WOFF files into three.js typeface JSON (ASCII subset).
// Run: npm run fonts   (output is committed in src/assets/fonts, so this is only
// needed if you change the 3D display font.)
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';

const jobs = [
  { src: '@fontsource/fraunces/files/fraunces-latin-800-normal.woff', out: 'fraunces-800.typeface.json' },
  { src: '@fontsource/fraunces/files/fraunces-latin-700-italic.woff', out: 'fraunces-700-italic.typeface.json' },
];

const CHARS = new Set(Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)));
for (const ch of '’‘“”—·') CHARS.add(ch);

for (const job of jobs) {
  const file = path.resolve('node_modules', job.src);
  const buf = fs.readFileSync(file);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const r = Math.round;
  const scale = 100000 / ((font.unitsPerEm || 2048) * 72);
  const glyphs = {};
  for (const ch of CHARS) {
    const g = font.charToGlyph(ch);
    if (!g) continue;
    const token = { ha: r(g.advanceWidth * scale), x_min: r((g.xMin ?? 0) * scale), x_max: r((g.xMax ?? 0) * scale), o: '' };
    for (const c of g.path.commands) {
      const t = c.type.toLowerCase() === 'c' ? 'b' : c.type.toLowerCase();
      token.o += t + ' ';
      if (c.x !== undefined) token.o += r(c.x * scale) + ' ' + r(c.y * scale) + ' ';
      if (c.x1 !== undefined) token.o += r(c.x1 * scale) + ' ' + r(c.y1 * scale) + ' ';
      if (c.x2 !== undefined) token.o += r(c.x2 * scale) + ' ' + r(c.y2 * scale) + ' ';
    }
    glyphs[ch] = token;
  }
  const json = {
    glyphs,
    familyName: font.getEnglishName('fullName'),
    ascender: r(font.ascender * scale),
    descender: r(font.descender * scale),
    underlinePosition: font.tables.post.underlinePosition,
    underlineThickness: font.tables.post.underlineThickness,
    boundingBox: { xMin: font.tables.head.xMin, xMax: font.tables.head.xMax, yMin: font.tables.head.yMin, yMax: font.tables.head.yMax },
    resolution: 1000,
  };
  const outFile = path.resolve('src/assets/fonts', job.out);
  fs.writeFileSync(outFile, JSON.stringify(json));
  console.log('wrote', job.out, Object.keys(glyphs).length, 'glyphs', (fs.statSync(outFile).size / 1024).toFixed(1) + 'kb');
}
