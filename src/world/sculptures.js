import * as THREE from 'three';
import { C, std, brassMat } from './kit.js';
import { browserMockTex, sealTex } from './textures.js';

/* One sculpture per service. Each returns { object, update(dt, t) }. */

const HALF_PI = Math.PI / 2;

/** 01 Software: a self-solving lattice of logic. */
function lattice() {
  const g = new THREE.Group();
  const cubes = [];
  const size = 0.34;
  const step = 0.38;
  const geo = new THREE.BoxGeometry(size, size, size);
  const mats = [
    std({ color: '#1a1920', roughness: 0.25, metalness: 0.6 }),
    std({ color: '#f2ece2', roughness: 0.3 }),
    new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 1.4, roughness: 0.4 }),
  ];
  let i = 0;
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        const m = new THREE.Mesh(geo, mats[i % 7 === 0 ? 2 : i % 2]);
        m.position.set(x * step, y * step, z * step);
        m.castShadow = true;
        g.add(m);
        cubes.push(m);
        i++;
      }
  const pivot = new THREE.Group();
  g.add(pivot);
  let turn = null;
  let wait = 0.6;
  const axes = ['x', 'y', 'z'];
  const update = (dt) => {
    g.rotation.y += dt * 0.25;
    g.rotation.x = 0.35;
    if (!turn) {
      wait -= dt;
      if (wait > 0) return;
      const axis = axes[Math.floor(Math.random() * 3)];
      const layer = Math.floor(Math.random() * 3) - 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      pivot.rotation.set(0, 0, 0);
      pivot.updateMatrixWorld();
      const members = cubes.filter((c) => Math.round(c.position[axis] / step) === layer);
      members.forEach((c) => pivot.attach(c));
      turn = { axis, dir, t: 0, members };
      return;
    }
    turn.t = Math.min(1, turn.t + dt / 0.55);
    const e = turn.t < 0.5 ? 4 * turn.t ** 3 : 1 - (-2 * turn.t + 2) ** 3 / 2;
    pivot.rotation[turn.axis] = e * HALF_PI * turn.dir;
    if (turn.t >= 1) {
      pivot.updateMatrixWorld();
      turn.members.forEach((c) => {
        g.attach(c);
        c.position.set(Math.round(c.position.x / step) * step, Math.round(c.position.y / step) * step, Math.round(c.position.z / step) * step);
        c.rotation.set(Math.round(c.rotation.x / HALF_PI) * HALF_PI, Math.round(c.rotation.y / HALF_PI) * HALF_PI, Math.round(c.rotation.z / HALF_PI) * HALF_PI);
      });
      turn = null;
      wait = 0.35;
    }
  };
  return { object: g, update };
}

/** 02 Websites: three floating browser canvases. */
function triptych() {
  const g = new THREE.Group();
  const palettes = [
    ['#141318', '#f2f0e9', C.ember],
    ['#f2f0e9', '#141318', '#2a9d8f'],
    ['#1f2a44', '#ffffff', '#ffcf5c'],
  ];
  const side = std({ color: '#0f0f12', roughness: 0.4 });
  const panels = palettes.map((p, i) => {
    const front = new THREE.MeshStandardMaterial({ map: browserMockTex(i, p), roughness: 0.35, metalness: 0.05 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.02, 0.035), [side, side, side, side, front, side]);
    m.position.set((i - 1) * 0.42, (1 - i) * 0.32, (i - 1) * 0.38);
    m.castShadow = true;
    g.add(m);
    return m;
  });
  return {
    object: g,
    update: (dt, t) => {
      panels.forEach((m, i) => {
        m.position.y = (1 - i) * 0.32 + Math.sin(t * 1.1 + i * 1.3) * 0.06;
        m.rotation.y = -0.35 + Math.sin(t * 0.6 + i) * 0.08;
        m.rotation.x = Math.sin(t * 0.7 + i * 2) * 0.04;
      });
    },
  };
}

/** 03 Design: iridescent infinite knot wrapped by a golden spiral. */
function knot() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.48, 0.16, 260, 36, 2, 3),
    new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.12, metalness: 0.35, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessMinimum: 180, iridescenceThicknessMaximum: 820, clearcoat: 1 }),
  );
  m.castShadow = true;
  g.add(m);
  const pts = [];
  const phi = 1.618;
  for (let a = 0; a < Math.PI * 7; a += 0.05) {
    const r = 0.04 * Math.pow(phi, (a * 2) / Math.PI);
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.012, 6), brassMat());
  spiral.scale.setScalar(0.55);
  g.add(spiral);
  return {
    object: g,
    update: (dt, t) => {
      m.rotation.x = t * 0.3;
      m.rotation.y = t * 0.45;
      spiral.rotation.z = -t * 0.2;
    },
  };
}

/** 04 Branding: the Pinnacle seal. */
function seal() {
  const g = new THREE.Group();
  const face = new THREE.MeshStandardMaterial({ map: sealTex(), metalness: 0.85, roughness: 0.3 });
  const edge = brassMat();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 96), [edge, face, face]);
  coin.rotation.x = HALF_PI;
  coin.castShadow = true;
  const holder = new THREE.Group();
  holder.add(coin);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 12), edge);
  rod.position.y = -1.05;
  g.add(holder, rod);
  return {
    object: g,
    update: (dt, t) => {
      holder.rotation.y = t * 0.6;
      holder.position.y = Math.sin(t * 1.2) * 0.05;
    },
  };
}

/** 05 Motion: a kinetic field of cubes riding a wave. */
function wave() {
  const n = 12;
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.2 });
  const mesh = new THREE.InstancedMesh(geo, mat, n * n);
  mesh.castShadow = true;
  const col = new THREE.Color();
  const a = new THREE.Color(C.ember);
  const b = new THREE.Color('#7c5cff');
  for (let i = 0; i < n * n; i++) {
    const x = i % n;
    const z = Math.floor(i / n);
    col.copy(a).lerp(b, (x + z) / (2 * n - 2));
    mesh.setColorAt(i, col);
  }
  g.add(mesh);
  const dummy = new THREE.Object3D();
  return {
    object: g,
    update: (dt, t) => {
      for (let i = 0; i < n * n; i++) {
        const x = (i % n) - (n - 1) / 2;
        const z = Math.floor(i / n) - (n - 1) / 2;
        const d = Math.hypot(x, z);
        const h = 0.5 + 0.5 * Math.sin(d * 0.8 - t * 2.6);
        dummy.position.set(x * 0.13, h * 0.5 - 0.4, z * 0.13);
        dummy.scale.set(1, 1 + h * 6, 1);
        dummy.rotation.y = h * 0.6;
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      g.rotation.y = t * 0.15;
    },
  };
}

function gearShape(teeth, R, depth = 0.12) {
  const s = new THREE.Shape();
  const r = R - depth;
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const phase = i % 4;
    const rad = phase === 1 || phase === 2 ? R : r;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, R * 0.22, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

/** 06 Automation: a perpetual engine of meshing gears. */
function gears() {
  const g = new THREE.Group();
  const defs = [
    { teeth: 16, R: 0.62, x: -0.25, y: -0.1, mat: brassMat(), dir: 1 },
    { teeth: 10, R: 0.4, x: 0.72, y: 0.28, mat: std({ color: '#d8d2c8', metalness: 1, roughness: 0.3 }), dir: -1 },
    { teeth: 8, R: 0.33, x: 0.05, y: 0.86, mat: new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.4 }), dir: -1 },
  ];
  const list = defs.map((d) => {
    const geo = new THREE.ExtrudeGeometry(gearShape(d.teeth, d.R), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2, curveSegments: 6 });
    geo.translate(0, 0, -0.07);
    const m = new THREE.Mesh(geo, d.mat);
    m.position.set(d.x, d.y, 0);
    m.castShadow = true;
    g.add(m);
    return { m, ...d };
  });
  return {
    object: g,
    update: (dt, t) => {
      for (const d of list) d.m.rotation.z = (t * 0.9 * d.dir * 16) / d.teeth + (d.teeth === 10 ? 0.15 : 0);
    },
  };
}

/** 07 SEO: the ascent to the summit, under the magnifying glass. */
function ascent() {
  const g = new THREE.Group();
  const bars = [];
  const white = std({ color: '#f2ece2', roughness: 0.35 });
  const dark = std({ color: '#1b1a20', roughness: 0.3, metalness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const h = 0.3 + i * 0.3;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1, 0.24), i % 2 ? white : dark);
    m.geometry.translate(0, 0.5, 0);
    m.position.set(-0.6 + i * 0.3, -0.85, 0);
    m.userData.h = h;
    m.castShadow = true;
    g.add(m);
    bars.push(m);
  }
  const summit = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 4), new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 1.6 }));
  g.add(summit);
  const glass = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 12, 48), brassMat());
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), new THREE.MeshPhysicalMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.25, roughness: 0, metalness: 0, side: THREE.DoubleSide }));
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.42, 12), dark);
  handle.position.set(0.3, -0.3, 0);
  handle.rotation.z = Math.PI / 4;
  glass.add(ring, lens, handle);
  g.add(glass);
  return {
    object: g,
    update: (dt, t) => {
      bars.forEach((b, i) => {
        const k = 0.75 + 0.25 * Math.sin(t * 1.4 - i * 0.6);
        b.scale.y = b.userData.h * k;
      });
      const top = bars[4];
      summit.position.set(top.position.x, top.position.y + top.scale.y + 0.17, 0);
      summit.rotation.y = t;
      const a = t * 0.7;
      glass.position.set(Math.cos(a) * 0.75, 0.15 + Math.sin(a * 1.3) * 0.25, Math.sin(a) * 0.5);
      glass.rotation.y = -a + Math.PI / 2;
    },
  };
}

export const SCULPTURES = { lattice, triptych, knot, seal, wave, gears, ascent };
