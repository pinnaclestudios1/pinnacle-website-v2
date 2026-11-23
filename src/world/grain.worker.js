// Film-grain pass for the procedural textures, run off the main thread.
// Same seeded random generator and arithmetic as the in-page version, so the
// result is pixel-identical; it just never blocks a frame.

function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

self.onmessage = (e) => {
  const { id, buf, amount, seed } = e.data;
  const d = new Uint8ClampedArray(buf);
  const r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  self.postMessage({ id, buf }, [buf]);
};
