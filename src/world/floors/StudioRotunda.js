import * as THREE from 'three';
import { Floor } from '../Floor.js';
import { spot, strip, frame, V, std, panel, brassMat, contactShadow, pedestal, C, dust, RovingSpots } from '../kit.js';
import { stoneRingsTex, plasterTex, portraitTex, logoTex, textTex, SERIF, MONO, SANS } from '../textures.js';
import { displayFont } from '../HeroTitle.js';
import { tplStory, tplProcess, tplTeam, tplTestimonials, tplClients, tplEngagement } from '../../ui/templates.js';

const DEG = Math.PI / 180;
const dirAt = (a) => new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
const tanAt = (a) => new THREE.Vector3(Math.cos(a), 0, Math.sin(a));

/** Floor 3: a domed rotunda. The camera turns on the spot; each sector is a chapter of the studio. */
export class StudioRotunda extends Floor {
  async build() {
    const g = this.group;
    const c = this.app.content;
    const st = c.studio;
    this.mood = { background: '#17110d', fogNear: 30, fogFar: 70, exposure: 1.0, env: 0.35, bloom: 0.5, bloomThreshold: 0.88, bloomRadius: 0.55 };
    const R = 15;
    const H = 11;

    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), std({ map: stoneRingsTex(), roughness: 0.4, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    g.add(floor);
    const wallTex = plasterTex('#c9ab8b', 17);
    wallTex.repeat.set(10, 2);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 120, 1, true), std({ map: wallTex, roughness: 0.95, side: THREE.BackSide }));
    wall.position.y = H / 2;
    wall.receiveShadow = true;
    g.add(wall);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 72, 24, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#7d5d44', roughness: 1, side: THREE.BackSide }));
    dome.scale.y = 0.45;
    dome.position.y = H;
    g.add(dome);
    // Coffers: rings of light on the dome
    const ocul = strip(1, 1, '#fff0d6', 2.2);
    ocul.geometry = new THREE.CircleGeometry(2.2, 48);
    ocul.rotation.x = Math.PI / 2;
    ocul.position.y = H + R * 0.45 - 0.05;
    g.add(ocul);
    const brass = brassMat();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.07, 10, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf9e').multiplyScalar(2.2) }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 9.2;
    this.ring = ring;
    g.add(ring);
    const cornice = new THREE.Mesh(new THREE.TorusGeometry(R - 0.15, 0.18, 8, 160), brass);
    cornice.rotation.x = Math.PI / 2;
    cornice.position.y = H;
    g.add(cornice);
    // Pilasters between sectors
    const pilMat = std({ color: '#e6d6c0', roughness: 0.6 });
    for (let k = 0; k < 12; k++) {
      const a = (k * 30 + 15) * DEG;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, H, 0.35), pilMat);
      p.position.copy(dirAt(a).multiplyScalar(R - 0.2));
      p.position.y = H / 2;
      p.lookAt(0, H / 2, 0);
      g.add(p);
    }

    g.add(new THREE.HemisphereLight('#ffe6c8', '#2a1a10', 0.75));
    const center = new THREE.PointLight('#ffd9b0', 60, 30, 2);
    center.position.y = 9;
    g.add(center);

    const sectors = [
      { id: 'story', label: st.story.kicker, html: tplStory(c), mascot: c.floors[3].mascot },
      { id: 'process', label: 'Process', html: tplProcess(c), mascot: 'Four steps, always upward.' },
      { id: 'team', label: 'Team', html: tplTeam(c), mascot: 'That last portrait could be you.' },
      { id: 'voices', label: 'Testimonials', html: tplTestimonials(c) },
      { id: 'clients', label: 'Clients', html: tplClients(c) },
      { id: 'engage', label: 'Engagement', html: tplEngagement(c), mascot: 'Pick a crystal, any crystal.' },
    ];
    this.anim = [];
    const spotTargets = [];

    for (const [k, s] of sectors.entries()) {
      await this.pause();
      const a = k * 60 * DEG;
      const d = dirAt(a);
      const t = tanAt(a);
      const at = (dist, side = 0, y = 0) => d.clone().multiplyScalar(dist).addScaledVector(t, side).setY(y);
      const from = at(3, 0, H - 0.3);
      const to = at(9, 0, 1.4);
      spot(g, { from, to, angle: 0.4, coneOpacity: 0.06, poolSize: 7, real: false });
      spotTargets.push({ from, to });
      if (s.id === 'story') this._cairn(g, at(8.5), at);
      if (s.id === 'process') this._process(g, st.process, at, a);
      if (s.id === 'team') this._portraits(g, st.team, a, R);
      if (s.id === 'voices') this._quotes(g, at(9, 0, 3.6), a);
      if (s.id === 'clients') this._logos(g, st.clients, a, R);
      if (s.id === 'engage') this._crystals(g, st.engagement, at, a);
    }

    this.roving = new RovingSpots(g, spotTargets, { count: 2, intensity: 150, angle: 0.42, penumbra: 0.8 });

    // Story wall text
    const storyWall = panel(
      5.6,
      1.75,
      textTex({ w: 2048, h: 640, lines: [{ text: `EST. ${c.site.founded}`, font: MONO, size: 52, weight: 500, y: 140, color: '#7a4b2e', spacing: 14, align: 'center' }, { text: 'Built like a cairn.', font: SERIF, size: 140, weight: 600, y: 420, color: '#2a1b12', align: 'center' }] }),
      { transparent: true },
    );
    storyWall.position.copy(dirAt(0).multiplyScalar(R - 0.1)).setY(6.6);
    storyWall.lookAt(0, 6.6, 0);
    g.add(storyWall);

    // Camera: turn on the spot through 300°
    const keys = [];
    for (let k = 0; k <= 10; k++) {
      const a = k * 30 * DEG;
      const d = dirAt(a);
      const pos = d.clone().multiplyScalar(-2.4).setY(2.9);
      const look = d.clone().multiplyScalar(10).setY(2.9);
      const key = { pos: pos.toArray(), look: look.toArray(), shift: 0.2 };
      if (k % 2 === 0) key.stop = { ...sectors[k / 2], align: 'left' };
      keys.push(key);
    }
    this.setPath(keys);
    this.dust = dust({ count: 380, box: [24, 10, 24], center: V(0, 5, 0), opacity: 0.4 });
    g.add(this.dust);
  }

  _cairn(g, base, at) {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.4, 48), std({ color: '#3a2c22', roughness: 0.6 }));
    plinth.position.copy(base).setY(0.2);
    plinth.castShadow = plinth.receiveShadow = true;
    g.add(plinth);
    const sh = contactShadow(5, 0.5);
    sh.position.set(base.x, 0.012, base.z);
    g.add(sh);
    const stones = new THREE.Group();
    stones.position.copy(base).setY(0.4);
    const sizes = [1.15, 0.95, 0.78, 0.62, 0.48, 0.36];
    let y = 0;
    sizes.forEach((r, i) => {
      const top = i === sizes.length - 1;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 40, 24),
        top ? new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 0.9, roughness: 0.35 }) : std({ color: ['#8f8478', '#6d655c', '#a59a8c', '#7b7064', '#958a7d'][i], roughness: 0.75 }),
      );
      const sy = 0.5;
      m.scale.set(1, sy, 0.92);
      y += r * sy;
      m.position.set((Math.random() - 0.5) * 0.12, y, (Math.random() - 0.5) * 0.12);
      m.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * 3, (Math.random() - 0.5) * 0.15);
      y += r * sy * 0.92;
      m.castShadow = true;
      stones.add(m);
    });
    g.add(stones);
    this.anim.push((dt, t) => (stones.rotation.z = Math.sin(t * 0.7) * 0.02));
  }

  _process(g, steps, at, a) {
    const heights = [1.4, 2.2, 3.0, 3.8];
    const mat = std({ color: '#2b241f', roughness: 0.5, metalness: 0.2 });
    steps.forEach((s, i) => {
      const h = heights[i];
      const face = new THREE.MeshStandardMaterial({
        map: textTex({ w: 512, h: Math.round(512 * (h / 1.1)), bg: '#2b241f', lines: [{ text: s.no, font: SERIF, weight: 800, size: 170, y: 220, color: '#f0c48a' }, { text: s.title, font: SANS, weight: 700, size: 62, y: 320, color: '#f2f0e9' }], pad: 50 }),
        roughness: 0.6,
      });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 0.6), [mat, mat, mat, mat, face, mat]);
      const p = at(9, (i - 1.5) * 1.55, h / 2);
      m.position.copy(p);
      m.lookAt(0, h / 2, 0);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
      const sh = contactShadow(2.4, 0.5);
      sh.position.set(p.x, 0.012, p.z);
      g.add(sh);
      if (i === 3) {
        const peak = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 4), new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 1.5 }));
        peak.position.set(p.x, h + 0.35, p.z);
        g.add(peak);
        this.anim.push((dt, t) => (peak.rotation.y = t * 0.8));
      }
    });
  }

  _portraits(g, team, a, R) {
    const brass = brassMat();
    team.forEach((m, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const ang = a + (col - 1) * 10.5 * DEG;
      const f = frame({ w: 2.0, h: 2.5, map: portraitTex(m.role, i, m.careers), border: 0.16, thick: 0.12, depth: 0.1, frameMat: m.careers ? new THREE.MeshStandardMaterial({ color: C.ember, emissive: C.ember, emissiveIntensity: 0.5 }) : brass });
      f.position.copy(dirAt(ang).multiplyScalar(R - 0.25)).setY(row === 0 ? 5.25 : 1.95);
      f.lookAt(0, f.position.y, 0);
      g.add(f);
      if (m.careers) this.interactive(f, { label: 'Join the studio', onClick: () => this.app.ui.openCareers() });
    });
  }

  _quotes(g, pos, a) {
    const font = displayFont();
    const shapes = font.generateShapes('“', 4.2);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 0.6, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.06, bevelSegments: 4, curveSegments: 12 });
    geo.center();
    const m = new THREE.Mesh(geo, brassMat());
    m.castShadow = true;
    const holder = new THREE.Group();
    holder.position.copy(pos);
    holder.lookAt(0, pos.y, 0);
    holder.add(m);
    g.add(holder);
    const ped = pedestal({ w: 1.2, h: 0.6, d: 1.2, color: '#2b241f' });
    ped.position.copy(pos).setY(0);
    g.add(ped);
    this.anim.push((dt, t) => {
      m.rotation.y = Math.sin(t * 0.5) * 0.5;
      m.position.y = Math.sin(t * 0.9) * 0.15;
    });
  }

  _logos(g, clients, a, R) {
    const back = std({ color: '#2b241f', roughness: 0.6 });
    clients.forEach((name, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const ang = a + (col - 1.5) * 7 * DEG;
      const p = dirAt(ang).multiplyScalar(R - 0.2).setY(5.4 - row * 1.4);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.95, 0.08), back);
      plate.position.copy(p);
      plate.lookAt(0, p.y, 0);
      const face = panel(1.6, 0.8, logoTex(name, i), { rough: 0.5, mat: { metalness: i % 3 === 2 ? 0.6 : 0 } });
      face.position.z = 0.05;
      plate.add(face);
      g.add(plate);
    });
  }

  _crystals(g, plans, at, a) {
    const heights = [0.9, 1.2, 1.5];
    const sizes = [0.35, 0.5, 0.68];
    const colors = ['#9fd8ff', '#ffd27a', C.ember];
    plans.forEach((p, i) => {
      const base = at(9, (i - 1) * 2.3, 0);
      const ped = pedestal({ w: 1.1, h: heights[i], d: 1.1, color: '#efe4d4' });
      ped.position.copy(base);
      ped.lookAt(0, 0, 0);
      g.add(ped);
      const label = panel(1.0, 0.32, textTex({ w: 512, h: 160, lines: [{ text: p.name, font: SERIF, weight: 600, size: 84, y: 110, color: '#2a1b12', align: 'center' }] }), { transparent: true });
      label.position.set(0, heights[i] * 0.55, 0.56);
      ped.add(label);
      const cr = new THREE.Mesh(
        new THREE.OctahedronGeometry(sizes[i], 0),
        new THREE.MeshPhysicalMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.1, iridescence: 0.8, clearcoat: 1, flatShading: true }),
      );
      cr.scale.y = 1.5;
      cr.position.copy(base).setY(heights[i] + sizes[i] * 1.6 + 0.2);
      cr.castShadow = true;
      g.add(cr);
      const y0 = cr.position.y;
      this.anim.push((dt, t) => {
        cr.rotation.y = t * (0.4 + i * 0.2);
        cr.position.y = y0 + Math.sin(t * 1.2 + i) * 0.1;
      });
    });
  }

  update(dt, t) {
    this.dust.update(t);
    this.roving.update(dt, this.app.focus);
    this.ring.rotation.z = t * 0.05;
    for (const f of this.anim) f(dt, t);
  }
}
