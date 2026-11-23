import * as THREE from 'three';
import { glowTex, shadowTex } from './textures.js';

/* Shared building blocks for every floor of the gallery. */

export const C = {
  ember: '#ff5b27',
  ivory: '#f1e9dc',
  brass: '#c79a52',
  ink: '#0c0b0e',
};

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

let _glow, _shadow;
export const sharedGlow = () => (_glow ||= glowTex());
export const sharedShadow = () => (_shadow ||= shadowTex());

export const std = (p) => new THREE.MeshStandardMaterial(p);
export const brassMat = () => std({ color: C.brass, metalness: 1, roughness: 0.28 });
export const steelMat = () => std({ color: '#9a9aa2', metalness: 1, roughness: 0.38 });
export const blackMetal = () => std({ color: '#151417', metalness: 0.7, roughness: 0.4 });

/** A box room, open where `skip` says. z runs from z0 (front) to z0 - d (back). */
export function room({ w, d, h, z0 = 0, floorMat, wallMat, ceilMat, frontWallMat, backWallMat, skip = [] }) {
  const g = new THREE.Group();
  const cz = z0 - d / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, cz);
  floor.receiveShadow = true;
  floor.name = 'floor';
  g.add(floor);
  if (ceilMat && !skip.includes('ceiling')) {
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, h, cz);
    g.add(ceil);
  }
  const walls = [
    ['left', new THREE.PlaneGeometry(d, h), [-w / 2, h / 2, cz], [0, Math.PI / 2, 0], wallMat],
    ['right', new THREE.PlaneGeometry(d, h), [w / 2, h / 2, cz], [0, -Math.PI / 2, 0], wallMat],
    ['back', new THREE.PlaneGeometry(w, h), [0, h / 2, z0 - d], [0, 0, 0], backWallMat || wallMat],
    ['front', new THREE.PlaneGeometry(w, h), [0, h / 2, z0], [0, Math.PI, 0], frontWallMat || wallMat],
  ];
  for (const [name, geo, p, r, m] of walls) {
    if (skip.includes(name)) continue;
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p);
    mesh.rotation.set(...r);
    mesh.receiveShadow = true;
    mesh.name = `wall-${name}`;
    g.add(mesh);
  }
  return g;
}

/* ───────────── Light cones (fake volumetrics) ───────────── */

const coneMaterial = (color, opacity) =>
  new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        vN = normalMatrix * normal;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity;
      varying vec2 vUv; varying vec3 vN; varying vec3 vView;
      void main(){
        // Guard every term: degenerate normals at the apex would otherwise produce NaNs
        // that the bloom pass smears across the whole frame.
        vec3 n = vN / max(length(vN), 1e-4);
        vec3 v = vView / max(length(vView), 1e-4);
        float d = clamp(abs(dot(n, v)), 0.0, 1.0);
        float y = clamp(vUv.y, 0.0, 1.0);
        float a = d * d * y * y * sqrt(y) * uOpacity;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });

/**
 * Gallery spotlight with an optional visible beam and floor light pool.
 * `real: false` builds only the (cheap) beam + pool; the actual lighting is
 * then provided by a few RovingSpots that follow the visitor. Every real light
 * is evaluated for every pixel, so keeping their count low matters a lot.
 */
export function spot(parent, { from, to, color = '#fff1dc', intensity = 120, angle = 0.38, penumbra = 0.7, distance = 0, cone = true, coneOpacity = 0.14, pool = true, poolSize, castShadow = false, real = true }) {
  const out = {};
  if (real) {
    const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra, 2);
    light.position.copy(from);
    light.target.position.copy(to);
    if (castShadow) {
      light.castShadow = true;
      light.shadow.mapSize.set(1024, 1024);
      light.shadow.bias = -0.0004;
      light.shadow.normalBias = 0.04;
      light.shadow.radius = 3;
      light.shadow.camera.near = 4;
      light.shadow.camera.far = 40;
    }
    parent.add(light, light.target);
    out.light = light;
  }
  const L = from.distanceTo(to);
  const radius = Math.tan(angle) * L * 0.8;
  if (cone) {
    const geo = new THREE.ConeGeometry(radius, L, 32, 1, true);
    const mesh = new THREE.Mesh(geo, coneMaterial(color, coneOpacity));
    mesh.position.copy(from).lerp(to, 0.5);
    const dir = new THREE.Vector3().subVectors(from, to).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.renderOrder = 5;
    mesh.raycast = () => {};
    parent.add(mesh);
    out.cone = mesh;
  }
  if (pool) {
    const s = poolSize ?? radius * 2.4;
    const p = new THREE.Mesh(
      new THREE.PlaneGeometry(s, s),
      new THREE.MeshBasicMaterial({ map: sharedGlow(), color, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    p.rotation.x = -Math.PI / 2;
    p.position.set(to.x, 0.015, to.z);
    p.raycast = () => {};
    parent.add(p);
    out.pool = p;
  }
  return out;
}

/**
 * A small pool of real spotlights that glide to whichever exhibits are nearest
 * the visitor's point of focus. Lights fade out before jumping to a new exhibit.
 * targets: [{ from: Vector3, to: Vector3 }] in `parent` local space.
 */
export class RovingSpots {
  constructor(parent, targets, { count = 2, color = '#fff1dc', intensity = 80, angle = 0.4, penumbra = 0.7 } = {}) {
    this.parent = parent;
    this.targets = targets;
    this.intensity = intensity;
    this.lights = [];
    this._focus = new THREE.Vector3();
    for (let i = 0; i < Math.min(count, targets.length); i++) {
      const l = new THREE.SpotLight(color, intensity, 0, angle, penumbra, 2);
      l.position.copy(targets[i].from);
      l.target.position.copy(targets[i].to);
      parent.add(l, l.target);
      this.lights.push({ l, assign: i, level: 1 });
    }
  }

  update(dt, focusWorld) {
    const f = this.parent.worldToLocal(this._focus.copy(focusWorld));
    const near = this.targets
      .map((t, i) => [t.to.distanceToSquared(f), i])
      .sort((a, b) => a[0] - b[0])
      .slice(0, this.lights.length)
      .map((x) => x[1]);
    const free = near.filter((i) => !this.lights.some((s) => s.assign === i));
    for (const s of this.lights) {
      if (!near.includes(s.assign) && free.length) s.next = free.shift();
      if (s.next !== undefined) {
        s.level = Math.max(0, s.level - dt * 4);
        if (s.level === 0) {
          s.assign = s.next;
          s.next = undefined;
          s.l.position.copy(this.targets[s.assign].from);
          s.l.target.position.copy(this.targets[s.assign].to);
        }
      } else s.level = Math.min(1, s.level + dt * 2.5);
      s.l.intensity = this.intensity * s.level * s.level;
    }
  }
}

export function contactShadow(size = 2.4, opacity = 0.8) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: sharedShadow(), transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  m.raycast = () => {};
  return m;
}

export function pedestal({ w = 1.7, h = 1.1, d = 1.7, color = '#f4f0ea', rough = 0.6 } = {}) {
  const g = new THREE.Group();
  const m = std({ color, roughness: rough });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  body.position.y = h / 2;
  body.castShadow = body.receiveShadow = true;
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.05, d + 0.08), m);
  top.position.y = h + 0.025;
  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06), std({ color: '#2a2729', roughness: 0.5 }));
  base.position.y = 0.04;
  g.add(body, top, base, contactShadow(Math.max(w, d) * 2.2, 0.6));
  g.userData.top = h + 0.05;
  return g;
}

/** Picture frame. Returns group with `.art` (raycast target). */
export function frame({ w, h, map, border = 0.32, depth = 0.16, thick = 0.24, frameMat = brassMat(), matColor = '#f4efe6' }) {
  const g = new THREE.Group();
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std({ map, roughness: 0.75 }));
  art.position.z = depth * 0.35;
  const W = w + border * 2;
  const H = h + border * 2;
  const mat = new THREE.Mesh(new THREE.BoxGeometry(W, H, depth * 0.5), std({ color: matColor, roughness: 0.9 }));
  g.add(mat, art);
  const pieces = [
    [W + thick * 2, thick, 0, H / 2 + thick / 2],
    [W + thick * 2, thick, 0, -H / 2 - thick / 2],
    [thick, H, -W / 2 - thick / 2, 0],
    [thick, H, W / 2 + thick / 2, 0],
  ];
  for (const [pw, ph, x, y] of pieces) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, depth), frameMat);
    b.position.set(x, y, depth * 0.25);
    b.castShadow = true;
    g.add(b);
  }
  g.art = art;
  g.outer = { w: W + thick * 2, h: H + thick * 2 };
  return g;
}

/** Brass-framed lift doors with a little floor indicator. */
export function liftDoor({ label = '↑' } = {}) {
  const g = new THREE.Group();
  const brass = brassMat();
  const W = 4.2;
  const H = 6;
  const steel = std({ color: '#6c6a70', metalness: 1, roughness: 0.32 });
  for (const s of [-1, 1]) {
    const door = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.03, H, 0.12), steel);
    door.position.set((s * W) / 4, H / 2, 0);
    g.add(door);
    const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.06, H - 1, 0.14), brass);
    inlay.position.set((s * W) / 4, H / 2, 0.01);
    g.add(inlay);
  }
  const t = 0.3;
  for (const [w, h, x, y] of [
    [W + t * 2, t, 0, H + t / 2],
    [t, H, -W / 2 - t / 2, H / 2],
    [t, H, W / 2 + t / 2, H / 2],
  ]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.35), brass);
    b.position.set(x, y, 0.08);
    g.add(b);
  }
  // Half-moon indicator
  const ind = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40, 0, Math.PI), std({ color: '#18161a', metalness: 0.5, roughness: 0.4 }));
  ind.position.set(0, H + 0.45, 0.27);
  g.add(ind);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.05, 8, 40, Math.PI), brass);
  rim.position.copy(ind.position);
  g.add(rim);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.ember).multiplyScalar(3), toneMapped: false }));
  needle.geometry.translate(0, 0.3, 0);
  needle.position.set(0, H + 0.45, 0.29);
  needle.rotation.z = -0.7;
  g.add(needle);
  g.needle = needle;
  const btn = new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(C.ember).multiplyScalar(4), toneMapped: false }));
  btn.position.set(W / 2 + 0.75, 2.4, 0.02);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.04), brass);
  plate.position.set(W / 2 + 0.75, 2.4, 0);
  g.add(plate, btn);
  g.button = btn;
  g.userData.label = label;
  return g;
}

/** Drifting dust in the light beams. */
export function dust({ count = 500, box = [30, 10, 30], center = V(0, 5, 0), color = '#ffe8cc', size = 0.06, opacity = 0.55 } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = center.x + (Math.random() - 0.5) * box[0];
    pos[i * 3 + 1] = center.y + (Math.random() - 0.5) * box[1];
    pos[i * 3 + 2] = center.z + (Math.random() - 0.5) * box[2];
    seed[i] = Math.random() * 100;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uSize: { value: size * 400 }, uOpacity: { value: opacity }, uMap: { value: sharedGlow() } },
    vertexShader: /* glsl */ `
      attribute float seed; uniform float uTime; uniform float uSize; varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.12 + seed) * 0.6;
        p.y += sin(uTime * 0.09 + seed * 1.7) * 0.5;
        p.z += cos(uTime * 0.1 + seed * 0.6) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (0.5 + 0.5 * fract(seed)) / -mv.z;
        vA = 0.4 + 0.6 * sin(uTime * 0.6 + seed);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; uniform sampler2D uMap; varying float vA;
      void main(){
        float a = texture2D(uMap, gl_PointCoord).a;
        gl_FragColor = vec4(uColor, a * uOpacity * vA);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.raycast = () => {};
  pts.frustumCulled = false;
  pts.update = (t) => (mat.uniforms.uTime.value = t);
  return pts;
}

/** Emissive strip light (ceiling troffer / wall slat). */
export function strip(w, h, color = '#fff3e0', power = 1.6) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), toneMapped: true }),
  );
  m.raycast = () => {};
  return m;
}

/** Flat textured panel facing +z. */
export function panel(w, h, map, opts = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, transparent: !!opts.transparent, roughness: opts.rough ?? 0.85, metalness: 0, ...opts.mat }));
  return m;
}

/** Ease helpers */
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/**
 * The Pinnacle mark in 3D. The logo is a tetrahedron seen from the front, so
 * here it stands on its base, peak up, slowly turning: the orange peak node
 * stays at the top while the three base nodes orbit beneath it.
 */
export function logoSculpture({ edge = 3, nodeColor = '#f2f0e9', lineColor = '#777775', glow = 1.6 } = {}) {
  const g = new THREE.Group();
  const spin = new THREE.Group();
  g.add(spin);
  const R = edge / Math.sqrt(3);
  const h = edge * Math.sqrt(2 / 3);
  const base = [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
    return new THREE.Vector3(Math.cos(a) * R, 0, Math.sin(a) * R);
  });
  const peak = new THREE.Vector3(0, h, 0);
  const rod = std({ color: lineColor, metalness: 0.75, roughness: 0.35 });
  const r = edge * 0.022;
  const link = (a, b) => {
    const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), rod);
    m.position.copy(a).lerp(b, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(b, a).normalize());
    m.castShadow = true;
    spin.add(m);
  };
  for (let i = 0; i < 3; i++) {
    link(base[i], base[(i + 1) % 3]);
    link(base[i], peak);
  }
  const nodeMat = std({ color: nodeColor, roughness: 0.3, metalness: 0.05 });
  const nodeGeo = new THREE.SphereGeometry(edge * 0.085, 24, 16);
  base.forEach((p) => {
    const n = new THREE.Mesh(nodeGeo, nodeMat);
    n.position.copy(p);
    n.castShadow = true;
    spin.add(n);
  });
  const peakMesh = new THREE.Mesh(
    new THREE.SphereGeometry(edge * 0.1, 32, 20),
    new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: glow, roughness: 0.35 }),
  );
  peakMesh.position.copy(peak);
  spin.add(peakMesh);
  // Centre the sculpture on its own middle so it can float.
  spin.position.y = -h / 2;
  g.userData.height = h;
  g.update = (t) => {
    spin.rotation.y = t * 0.25;
    g.position.y = g.userData.baseY + Math.sin(t * 0.8) * 0.12;
  };
  return g;
}
