import * as THREE from 'three';

/* Procedural canvas textures: every image in the gallery is drawn in code. */

export const SERIF = 'Fraunces, Georgia, serif';
export const SANS = '"Manrope Variable", Manrope, system-ui, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, monospace';

export function rng(seed = 1) {
  let s = typeof seed === 'string' ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function canvasTex(w, h, draw, { repeat, srgb = true, aniso = 8 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  // Kept in main memory: the grain pass reads pixels back, which is much
  // faster from a CPU canvas than from a GPU one.
  const ctx = c.getContext('2d', { willReadFrequently: true });
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  c.__tex = t; // lets an async grain pass flag the texture for re-upload
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/* Film grain. The per-pixel loop runs in a worker (identical maths and seed), so
   building textures never stalls the page. Falls back to running in-page. */

let _worker;
let _jobId = 0;
const _pending = new Map();
/** Outstanding grain passes; await `grainDone()` before showing new textures. */
const _jobs = new Set();
// (with a safety timeout so a broken worker can never block the gallery)
export const grainDone = () => Promise.race([Promise.all([..._jobs]), new Promise((r) => setTimeout(r, 4000))]);

function grainWorker() {
  if (_worker !== undefined) return _worker;
  try {
    _worker = new Worker(new URL('./grain.worker.js', import.meta.url), { type: 'module' });
    _worker.onmessage = (e) => {
      const done = _pending.get(e.data.id);
      _pending.delete(e.data.id);
      done?.(e.data.buf);
    };
    _worker.onerror = () => {
      _worker = null;
      for (const done of _pending.values()) done(null);
      _pending.clear();
    };
  } catch (err) {
    _worker = null;
  }
  return _worker;
}

function grainSync(d, amount, seed) {
  const r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
}

export function grain(ctx, w, h, amount = 18, seed = 3) {
  const img = ctx.getImageData(0, 0, w, h);
  const worker = grainWorker();
  if (!worker) {
    grainSync(img.data, amount, seed);
    ctx.putImageData(img, 0, 0);
    return;
  }
  const id = ++_jobId;
  const job = new Promise((resolve) => {
    _pending.set(id, (buf) => {
      if (!buf) return resolve();
      ctx.putImageData(new ImageData(new Uint8ClampedArray(buf), w, h), 0, 0);
      if (ctx.canvas.__tex) ctx.canvas.__tex.needsUpdate = true;
      resolve();
    });
  });
  _jobs.add(job);
  job.then(() => _jobs.delete(job));
  worker.postMessage({ id, buf: img.data.buffer, amount, seed: seed >>> 0 }, [img.data.buffer]);
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/* ───────────── Surfaces ───────────── */

export const marbleTex = () =>
  canvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(11);
      ctx.fillStyle = '#141317';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = `rgba(${40 + r() * 20},${36 + r() * 20},${44 + r() * 20},0.25)`;
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, 60 + r() * 220, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.filter = 'blur(1.2px)';
      for (let i = 0; i < 26; i++) {
        ctx.strokeStyle = `rgba(210,200,190,${0.05 + r() * 0.14})`;
        ctx.lineWidth = 0.6 + r() * 2.2;
        ctx.beginPath();
        let x = r() * w;
        let y = -20;
        ctx.moveTo(x, y);
        while (y < h + 20) {
          x += (r() - 0.5) * 90;
          y += 30 + r() * 60;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.filter = 'none';
      // tile seams
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, h);
      grain(ctx, w, h, 10);
    },
    { repeat: [6, 6] },
  );

export const concreteTex = () =>
  canvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(5);
      ctx.fillStyle = '#d8d3cb';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 180; i++) {
        const g = 190 + r() * 40;
        ctx.fillStyle = `rgba(${g},${g - 4},${g - 10},0.12)`;
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, 20 + r() * 160, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(120,112,100,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(w, 1);
      ctx.moveTo(1, 0);
      ctx.lineTo(1, h);
      ctx.stroke();
      grain(ctx, w, h, 14);
    },
    { repeat: [5, 30] },
  );

export const herringboneTex = () =>
  canvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(21);
      ctx.fillStyle = '#2a1c12';
      ctx.fillRect(0, 0, w, h);
      const L = 128;
      const W = 32;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(Math.PI / 4);
      for (let i = -14; i < 14; i++) {
        for (let j = -14; j < 14; j++) {
          const x = i * L;
          const y = j * W * 2;
          for (let k = 0; k < 2; k++) {
            const tone = 70 + r() * 45;
            ctx.fillStyle = `rgb(${tone + 52},${tone * 0.78 + 14},${tone * 0.5})`;
            if (k === 0) ctx.fillRect(x + (j % 2) * W, y, L - 2, W - 2);
            else ctx.fillRect(x + L - W + (j % 2) * W, y + W, W - 2, L - 2);
          }
        }
      }
      ctx.restore();
      grain(ctx, w, h, 16);
    },
    { repeat: [4, 20] },
  );

export const deckTex = () =>
  canvasTex(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(31);
      const rows = 16;
      const ph = h / rows;
      for (let i = 0; i < rows; i++) {
        let x = -r() * 400;
        while (x < w) {
          const len = 300 + r() * 400;
          const tone = 52 + r() * 22;
          ctx.fillStyle = `rgb(${tone + 22},${tone + 6},${tone - 6})`;
          ctx.fillRect(x, i * ph, len - 3, ph - 4);
          ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          for (let k = 0; k < 5; k++) {
            ctx.beginPath();
            const yy = i * ph + r() * ph;
            ctx.moveTo(x, yy);
            ctx.lineTo(x + len, yy + (r() - 0.5) * 4);
            ctx.stroke();
          }
          x += len;
        }
      }
      grain(ctx, w, h, 14);
    },
    { repeat: [4, 4] },
  );

export const stoneRingsTex = () =>
  canvasTex(2048, 2048, (ctx, w, h) => {
    const r = rng(41);
    const cx = w / 2;
    const cy = h / 2;
    ctx.fillStyle = '#b9a68f';
    ctx.fillRect(0, 0, w, h);
    const rings = 9;
    for (let i = rings; i > 0; i--) {
      const rad = (i / rings) * (w / 2);
      const seg = 6 + i * 6;
      for (let s = 0; s < seg; s++) {
        const a0 = (s / seg) * Math.PI * 2;
        const a1 = ((s + 1) / seg) * Math.PI * 2;
        const tone = 160 + r() * 40 - (i % 2) * 18;
        ctx.fillStyle = `rgb(${tone + 14},${tone},${tone - 18})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, rad, a0, a1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,52,36,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    // Inlaid compass star
    ctx.translate(cx, cy);
    for (let k = 0; k < 8; k++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = k % 2 ? '#7a4b2e' : '#e9dcc6';
      ctx.beginPath();
      ctx.moveTo(0, -w * 0.09);
      ctx.lineTo(w * 0.018, 0);
      ctx.lineTo(-w * 0.018, 0);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    grain(ctx, w, h, 12);
  });

export const plasterTex = (base = '#ece7df', seed = 9) =>
  canvasTex(
    512,
    512,
    (ctx, w, h) => {
      const r = rng(seed);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) {
        ctx.fillStyle = `rgba(0,0,0,${r() * 0.014})`;
        ctx.beginPath();
        ctx.arc(r() * w, r() * h, 10 + r() * 80, 0, Math.PI * 2);
        ctx.fill();
      }
      grain(ctx, w, h, 8);
    },
    { repeat: [6, 2] },
  );

export const glowTex = (inner = 'rgba(255,240,220,1)', outer = 'rgba(255,240,220,0)') =>
  canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(1, outer);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

export const shadowTex = () =>
  canvasTex(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.75)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

/* ───────────── Typography on walls ───────────── */

/**
 * lines: [{ text, font, color, size, y, align?, spacing? }]  (size/y in px)
 */
export const textTex = ({ w = 1024, h = 512, bg = null, lines = [], pad = 40 }) =>
  canvasTex(w, h, (ctx) => {
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.textBaseline = 'alphabetic';
    for (const l of lines) {
      ctx.fillStyle = l.color || '#fff';
      ctx.font = `${l.weight || 400} ${l.size}px ${l.font || SERIF}`;
      ctx.textAlign = l.align || 'left';
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${l.spacing || 0}px`;
      const x = l.align === 'center' ? w / 2 : l.align === 'right' ? w - pad : pad;
      ctx.fillText(l.text, x, l.y);
    }
  });

/* ───────────── Case-study artworks ───────────── */

export function caseArtTex(c, index) {
  return canvasTex(1280, 930, (ctx, w, h) => {
    const [a, b, cream, accent] = c.palette;
    const r = rng(c.slug);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    switch (c.style) {
      case 'orbits': {
        const cx = w * 0.36;
        const cy = h * 0.48;
        for (let i = 1; i < 9; i++) {
          ctx.strokeStyle = `rgba(242,230,201,${0.08 + i * 0.03})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, i * 52, i * 40, -0.3, 0, Math.PI * 2);
          ctx.stroke();
          const ang = r() * Math.PI * 2;
          ctx.fillStyle = i % 3 === 0 ? accent : cream;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(ang) * i * 52, cy + Math.sin(ang) * i * 40, 6 + r() * 14, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'grid': {
        const s = 74;
        for (let x = 30; x < w * 0.62; x += s + 14)
          for (let y = 40; y < h - 160; y += s + 14) {
            const k = r();
            rrect(ctx, x, y, s, s, 18);
            if (k < 0.18) {
              ctx.fillStyle = accent;
              ctx.fill();
            } else if (k < 0.5) {
              ctx.fillStyle = 'rgba(246,240,220,0.85)';
              ctx.fill();
            } else {
              ctx.strokeStyle = 'rgba(246,240,220,0.35)';
              ctx.lineWidth = 2;
              ctx.stroke();
            }
          }
        break;
      }
      case 'waves': {
        for (let i = 0; i < 26; i++) {
          ctx.strokeStyle = i === 13 ? accent : `rgba(229,229,229,${0.12 + (i % 5) * 0.05})`;
          ctx.lineWidth = i === 13 ? 6 : 2;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 8) {
            const y = 120 + i * 24 + Math.sin(x * 0.008 + i * 0.4) * 40 + Math.sin(x * 0.021 + i) * 12;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        break;
      }
      case 'blocks': {
        const cols = [cream, accent, b, a, '#ffffff'];
        let y = 0;
        while (y < h) {
          const bh = 80 + r() * 200;
          let x = 0;
          while (x < w * 0.64) {
            const bw = 90 + r() * 260;
            ctx.fillStyle = cols[Math.floor(r() * cols.length)];
            ctx.globalAlpha = 0.85;
            ctx.fillRect(x + 6, y + 6, bw - 12, bh - 12);
            x += bw;
          }
          y += bh;
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'bars': {
        const n = 34;
        const bw = (w * 0.64) / n;
        for (let i = 0; i < n; i++) {
          const bh = (0.2 + Math.abs(Math.sin(i * 0.55)) * 0.6 + r() * 0.2) * h * 0.7;
          ctx.fillStyle = i % 7 === 3 ? accent : i % 2 ? cream : '#3fc1c9';
          ctx.globalAlpha = i % 2 ? 0.9 : 0.6;
          rrect(ctx, 24 + i * bw, h * 0.82 - bh, bw - 8, bh, 6);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'rings': {
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = i % 2 ? accent : cream;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 30 + i * 6;
          ctx.beginPath();
          ctx.arc(w * 0.18 + i * 90, h * 0.46 + Math.sin(i) * 60, 120 + i * 18, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        break;
      }
    }
    ctx.restore();

    // Device mock-up: hints at the product we shipped.
    const dx = w * 0.6;
    const dy = h * 0.14;
    const dw = w * 0.34;
    const dh = h * 0.6;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 24;
    rrect(ctx, dx, dy, dw, dh, 26);
    ctx.fillStyle = cream;
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = a;
    rrect(ctx, dx + 20, dy + 20, dw - 40, 54, 14);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(dx + 47, dy + 47, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    rrect(ctx, dx + 70, dy + 40, dw * 0.4, 14, 7);
    ctx.fill();
    ctx.fillStyle = a;
    ctx.font = `700 40px ${SERIF}`;
    ctx.fillText(c.results[0].value, dx + 26, dy + 140);
    ctx.font = `500 18px ${SANS}`;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText(c.results[0].label, dx + 28, dy + 170);
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i === 1 ? accent : 'rgba(0,0,0,0.08)';
      rrect(ctx, dx + 26 + i * ((dw - 52) / 3), dy + 200, (dw - 52) / 3 - 12, 130 + i * 20, 14);
      ctx.fill();
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      rrect(ctx, dx + 26, dy + 380 + i * 28, (dw - 52) * (0.9 - i * 0.15), 12, 6);
      ctx.fill();
    }

    // Caption
    ctx.fillStyle = cream;
    ctx.font = `500 20px ${MONO}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.fillText(`WORK ${String(index + 1).padStart(2, '0')} — ${c.industry.toUpperCase()}`, 48, 66);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.font = `700 84px ${SERIF}`;
    ctx.fillText(c.client, 44, h - 92);
    ctx.font = `400 28px ${SANS}`;
    ctx.globalAlpha = 0.8;
    ctx.fillText(c.title, 48, h - 46);
    ctx.globalAlpha = 1;
    grain(ctx, w, h, 16, index + 1);
  });
}

/* ───────────── Services Wing pieces ───────────── */

export function browserMockTex(variant, palette) {
  return canvasTex(768, 520, (ctx, w, h) => {
    const [bg, fg, accent] = palette;
    ctx.fillStyle = bg;
    rrect(ctx, 0, 0, w, h, 28);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, w, 52);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(30 + i * 24, 26, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rrect(ctx, 120, 14, w - 240, 24, 12);
    ctx.fill();
    ctx.fillStyle = fg;
    if (variant === 0) {
      ctx.font = `700 64px ${SERIF}`;
      ctx.fillText('Make it', 48, 160);
      ctx.fillStyle = accent;
      ctx.fillText('unforgettable.', 48, 230);
      ctx.fillStyle = fg;
      rrect(ctx, 48, 270, 180, 52, 26);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(w - 170, 300, 120, 0, Math.PI * 2);
      ctx.fill();
    } else if (variant === 1) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === 1 ? accent : 'rgba(255,255,255,0.12)';
        rrect(ctx, 40 + i * 236, 90, 212, 280, 20);
        ctx.fill();
        ctx.fillStyle = fg;
        ctx.globalAlpha = 0.8;
        rrect(ctx, 64 + i * 236, 300, 120, 14, 7);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = fg;
      ctx.font = `600 26px ${SANS}`;
      ctx.fillText('Shop the collection', 40, 430);
    } else {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      for (let x = 40; x < w - 40; x += 10) {
        const y = 340 - (x / w) * 180 - Math.sin(x * 0.03) * 24;
        x === 40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = fg;
      ctx.font = `700 48px ${SANS}`;
      ctx.fillText('+212%', 40, 130);
      ctx.font = `500 20px ${MONO}`;
      ctx.globalAlpha = 0.6;
      ctx.fillText('ORGANIC SESSIONS', 40, 162);
      ctx.globalAlpha = 1;
    }
  });
}

export function sealTex() {
  return canvasTex(1024, 1024, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx * 0.8, cy * 0.7, 50, cx, cy, w / 2);
    g.addColorStop(0, '#f6d58e');
    g.addColorStop(1, '#a8752e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(70,40,10,0.6)';
    ctx.lineWidth = 6;
    [480, 360, 340].forEach((rad) => {
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(70,40,10,0.8)';
    ctx.font = `600 52px ${MONO}`;
    const text = '  PINNACLE STUDIOS · BRAND & IDENTITY · EST. MMXXI ·';
    const step = (Math.PI * 2) / text.length;
    for (let i = 0; i < text.length; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * step);
      ctx.fillText(text[i], -14, -400);
      ctx.restore();
    }
    // The Pinnacle mark, embossed (coordinates from the master logo, 321×252).
    ctx.save();
    const k = 1.55;
    ctx.translate(cx - 160.7 * k, cy - 135 * k);
    ctx.scale(k, k);
    ctx.lineWidth = 11;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(90,52,14,0.85)';
    ctx.beginPath();
    ctx.moveTo(25.6, 226.5);
    ctx.lineTo(160.8, 29.2);
    ctx.lineTo(295.9, 226.5);
    ctx.closePath();
    ctx.moveTo(160.8, 29.2);
    ctx.lineTo(160.8, 138.8);
    ctx.lineTo(25.6, 226.5);
    ctx.moveTo(160.8, 138.8);
    ctx.lineTo(295.9, 226.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90,52,14,0.95)';
    for (const [x, y, r] of [
      [25.3, 224.3, 23.7],
      [286.3, 224.3, 23.7],
      [160.8, 138.8, 20.1],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff5b27';
    ctx.beginPath();
    ctx.arc(160.7, 29.4, 25.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

export function plaqueTex({ no, title, sub }) {
  return textTex({
    w: 1024,
    h: 1024,
    lines: [
      { text: no, font: SERIF, weight: 800, size: 420, y: 470, color: 'rgba(20,18,22,0.92)' },
      { text: title, font: SERIF, weight: 600, size: 84, y: 640, color: 'rgba(20,18,22,0.9)' },
      { text: sub.toUpperCase(), font: MONO, weight: 500, size: 30, y: 710, color: 'rgba(20,18,22,0.55)', spacing: 4 },
    ],
    pad: 70,
  });
}

/* ───────────── Studio pieces ───────────── */

export function portraitTex(role, i, careers = false) {
  const palettes = [
    ['#2d3a4a', '#e8b26b'],
    ['#3b2c35', '#ff7a59'],
    ['#24372f', '#a9d4b4'],
    ['#352a4a', '#c3a6ff'],
    ['#40301f', '#ffd27a'],
    ['#1d1c22', '#ff5b27'],
  ];
  const [bg, fg] = palettes[i % palettes.length];
  return canvasTex(640, 800, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, bg);
    g.addColorStop(1, '#0d0c10');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    if (careers) {
      ctx.setLineDash([18, 14]);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.38, 120, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.88, 230, 190, 0, Math.PI, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = fg;
      ctx.font = `800 170px ${SERIF}`;
      ctx.textAlign = 'center';
      ctx.fillText('?', w / 2, h * 0.38 + 60);
    } else {
      const lg = ctx.createRadialGradient(w * 0.35, h * 0.3, 10, w / 2, h * 0.4, 200);
      lg.addColorStop(0, fg);
      lg.addColorStop(1, bg);
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.38, 125, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(w / 2, h * 0.9, 240, 200, 0, Math.PI, 0);
      ctx.fill();
      // abstract feature: a stroke unique to each discipline
      ctx.strokeStyle = 'rgba(13,12,16,0.6)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      if (i === 0) ctx.arc(w / 2, h * 0.38, 60, 0.2, Math.PI - 0.2);
      else if (i === 1) {
        ctx.moveTo(w / 2 - 60, h * 0.36);
        ctx.lineTo(w / 2 + 60, h * 0.36);
      } else if (i === 2) ctx.arc(w / 2, h * 0.38, 70, Math.PI, Math.PI * 2);
      else if (i === 3) {
        ctx.moveTo(w / 2 - 70, h * 0.42);
        ctx.quadraticCurveTo(w / 2, h * 0.3, w / 2 + 70, h * 0.42);
      } else {
        ctx.moveTo(w / 2 - 50, h * 0.44);
        ctx.lineTo(w / 2, h * 0.32);
        ctx.lineTo(w / 2 + 50, h * 0.44);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 110, w, 110);
    ctx.fillStyle = '#f2f0e9';
    ctx.font = `600 54px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(role, 40, h - 42);
    grain(ctx, w, h, 14, i + 20);
  });
}

export function logoTex(name, i) {
  return canvasTex(512, 256, (ctx, w, h) => {
    ctx.fillStyle = i % 3 === 0 ? '#2a2420' : i % 3 === 1 ? '#efe6d6' : '#7a5a34';
    ctx.fillRect(0, 0, w, h);
    const ink = i % 3 === 1 ? '#2a2420' : '#efe6d6';
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const styles = [
      () => ((ctx.font = `800 64px ${SERIF}`), name),
      () => ((ctx.font = `800 46px ${SANS}`), name.toUpperCase()),
      () => ((ctx.font = `italic 700 60px ${SERIF}`), name.toLowerCase()),
      () => ((ctx.font = `500 44px ${MONO}`), name.toLowerCase().replace(/\s/g, '_')),
    ];
    const label = styles[i % 4]();
    if ('letterSpacing' in ctx) ctx.letterSpacing = i % 4 === 1 ? '6px' : '0px';
    let size = parseInt(ctx.font.match(/(\d+)px/)[1], 10);
    while (ctx.measureText(label).width > w - 120 && size > 20) {
      size -= 2;
      ctx.font = ctx.font.replace(/\d+px/, `${size}px`);
    }
    ctx.fillText(label, w / 2 + 22, h / 2 + 4);
    const tw = ctx.measureText(label).width;
    const gx = w / 2 - tw / 2 - 16;
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (i % 3 === 0) ctx.arc(gx, h / 2, 14, 0, Math.PI * 2);
    else if (i % 3 === 1) {
      ctx.moveTo(gx - 14, h / 2 + 12);
      ctx.lineTo(gx, h / 2 - 14);
      ctx.lineTo(gx + 14, h / 2 + 12);
      ctx.closePath();
    } else ctx.rect(gx - 12, h / 2 - 12, 24, 24);
    ctx.stroke();
  });
}

export function windowsTex() {
  return canvasTex(
    256,
    512,
    (ctx, w, h) => {
      const r = rng(77);
      ctx.fillStyle = '#07080d';
      ctx.fillRect(0, 0, w, h);
      for (let y = 8; y < h; y += 16)
        for (let x = 8; x < w; x += 14) {
          const k = r();
          if (k < 0.32) {
            ctx.fillStyle = k < 0.06 ? '#ffd9a0' : k < 0.2 ? 'rgba(255,196,120,0.75)' : 'rgba(160,190,255,0.45)';
            ctx.fillRect(x, y, 7, 9);
          }
        }
    },
    { repeat: [1, 1] },
  );
}

export function lobbyBannerTex(services) {
  return canvasTex(512, 2048, (ctx, w, h) => {
    ctx.fillStyle = '#16151a';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + 40, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f2f0e9';
    ctx.font = `800 150px ${SERIF}`;
    ctx.fillText('The Gallery', 0, -40);
    ctx.font = `500 34px ${MONO}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillStyle = '#ff6a3d';
    ctx.fillText(services.map((s) => s.title.split(' ')[0].toUpperCase()).join(' · '), 0, 60);
    ctx.restore();
  });
}
