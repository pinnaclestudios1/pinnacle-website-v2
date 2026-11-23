import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Floor } from '../Floor.js';
import { HeroTitle } from '../HeroTitle.js';
import { room, spot, dust, strip, liftDoor, V, std, C, brassMat, panel, logoSculpture } from '../kit.js';
import { marbleTex, lobbyBannerTex, textTex, SERIF, MONO, SANS } from '../textures.js';
import { tplHero, tplManifesto, tplFloorGuide } from '../../ui/templates.js';

export class Lobby extends Floor {
  async build() {
    const g = this.group;
    const c = this.app.content;
    this.guide = false;
    this.mood = { background: '#0b0a0d', fogNear: 30, fogFar: 85, exposure: 1.05, env: 0.28, bloom: 0.45, bloomThreshold: 1.0, bloomRadius: 0.5 };

    const W = 48;
    const D = 52;
    const H = 15;
    const z0 = 30;

    // Mirror floor under a translucent marble skin. The reflection is rendered
    // small and without MSAA: under the marble a soft reflection reads better anyway.
    const low = this.app.engine.low;
    // No mirror when the browser renders on the CPU: it would draw the scene twice.
    const useMirror = !this.app.engine.software;
    if (useMirror) {
      const rs = low ? 0.25 : 0.4;
      const mirror = new Reflector(new THREE.PlaneGeometry(W, D), {
        textureWidth: Math.floor(window.innerWidth * rs),
        textureHeight: Math.floor(window.innerHeight * rs),
        color: 0x8a8590,
        clipBias: 0.003,
        multisample: 0,
      });
      mirror.rotation.x = -Math.PI / 2;
      mirror.position.set(0, -0.002, z0 - D / 2);
      g.add(mirror);
      this.mirror = mirror;
    }

    const marble = marbleTex();
    const floorMat = useMirror
      ? std({ map: marble, color: '#ffffff', roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.84 })
      : std({ map: marble, color: '#ffffff', roughness: 0.2, metalness: 0.2 });
    const wallMat = std({ color: '#151418', roughness: 0.85 });
    const ceilMat = std({ color: '#0f0e12', roughness: 1 });
    const r = room({ w: W, d: D, h: H, z0, floorMat, wallMat, ceilMat });
    g.add(r);

    // Ceiling skylights
    for (let x = -15; x <= 15; x += 7.5)
      for (let z = -15; z <= 15; z += 7.5) {
        const s = strip(4.6, 4.6, '#ffe9cf', 0.26);
        s.rotation.x = Math.PI / 2;
        s.position.set(x, H - 0.02, z);
        g.add(s);
      }

    // Colonnade
    const colMat = std({ color: '#e9e1d4', roughness: 0.35, metalness: 0 });
    const brass = brassMat();
    for (const sx of [-1, 1])
      for (let z = -16; z <= 16; z += 8) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, H, 40, 1), colMat);
        col.position.set(sx * 18, H / 2, z);
        col.castShadow = true;
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 1.6), colMat);
        base.position.set(sx * 18, 0.25, z);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 8, 40), brass);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(sx * 18, 2.8, z);
        const glow = strip(0.18, 9, '#ffcf9e', 1.4);
        glow.position.set(sx * 23.9 * 1, 6, z);
        glow.rotation.y = -sx * Math.PI / 2;
        g.add(col, base, ring, glow);
      }

    // Back wall: vertical light slats around the lift
    for (let x = -21; x <= 21; x += 2.4) {
      if (Math.abs(x) < 4.5) continue;
      const s = strip(0.08, H - 3, '#ffd3a1', 0.9);
      s.position.set(x, H / 2, z0 - D + 0.03);
      g.add(s);
    }

    // Side banners
    const banner = lobbyBannerTex(c.services);
    for (const sx of [-1, 1]) {
      const b = panel(3.2, 12.8, banner);
      b.position.set(sx * 23.95, 7, -4);
      b.rotation.y = -sx * Math.PI / 2;
      g.add(b);
    }

    // Wall vinyl + the Pinnacle mark, floating above the lift
    const vinyl = panel(
      12,
      0.75,
      textTex({
        w: 2048,
        h: 128,
        lines: [{ text: 'Software · Websites · Design · Branding · Motion · Automation · SEO', font: MONO, weight: 500, size: 46, y: 80, color: '#b9b2a8', spacing: 6, align: 'center' }],
      }),
      { transparent: true },
    );
    vinyl.position.set(0, 8.25, z0 - D + 0.05);
    g.add(vinyl);
    this.mark = logoSculpture({ edge: 3.0, glow: 0.9 });
    this.mark.userData.baseY = 12.0;
    this.mark.position.set(0, 12.0, z0 - D + 3);
    g.add(this.mark);

    // The sculpture: plinth + title + mascot
    const plinthMat = std({ color: '#1b1a1f', roughness: 0.3, metalness: 0.4 });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.8, 3.4), plinthMat);
    plinth.position.y = 0.4;
    plinth.castShadow = plinth.receiveShadow = true;
    const plinthEdge = new THREE.Mesh(new THREE.BoxGeometry(15.56, 0.05, 3.46), brass);
    plinthEdge.position.y = 0.8;
    const plinthLabel = panel(
      6,
      0.6,
      textTex({ w: 1024, h: 102, lines: [{ text: 'PINNACLE STUDIOS · SOFTWARE & CREATIVE AGENCY', font: MONO, size: 30, weight: 500, y: 62, color: '#c79a52', spacing: 5, align: 'center' }] }),
      { transparent: true },
    );
    plinthLabel.position.set(0, 0.42, 1.71);
    g.add(plinth, plinthEdge, plinthLabel);

    const faceMat = std({ color: '#f4ede2', roughness: 0.3, metalness: 0.02 });
    const sideMat = std({ color: '#cdbfa9', roughness: 0.42, metalness: 0.05 });
    this.title = new HeroTitle({
      faceMat,
      sideMat,
      lines: [
        { text: 'Pinnacle', size: 2.55, y: 3.35 },
        { text: 'Studios', size: 1.75, y: 0.82 },
      ],
    });
    g.add(this.title.group);
    this.title.letters.forEach((l) => this.interactive(l.mesh, { cursor: 'grab', onClick: () => this.app.sound?.tick() }));
    this.title.group.updateMatrixWorld(true);
    this.perches = this.title.perchPoints();
    // World-space box of the hero sculpture (title + plinth + room for Pinn on top).
    // The camera uses it to keep the title clear of the hero text on any screen.
    this.heroBox = new THREE.Box3().setFromObject(this.title.group).union(new THREE.Box3().setFromObject(plinth));
    this.heroBox.max.y += 0.9;

    // Lights
    g.add(new THREE.HemisphereLight('#fff1e0', '#120e0c', 0.35));
    spot(g, { from: V(-9, 14, 13), to: V(0, 2.6, 0), intensity: 420, angle: 0.42, penumbra: 0.7, castShadow: true, coneOpacity: 0.07, poolSize: 16 });
    spot(g, { from: V(0, 12, -9), to: V(0, 3.5, 0), color: '#ff8a5c', intensity: 220, angle: 0.4, penumbra: 0.9, cone: false, pool: false });
    spot(g, { from: V(0, 14.5, -16), to: V(0, 0, -21), intensity: 200, angle: 0.36, coneOpacity: 0.12 });
    for (const sx of [-1, 1]) spot(g, { from: V(sx * 14, 14.5, 10), to: V(sx * 14, 0, 10), angle: 0.3, coneOpacity: 0.09, real: false });
    // Pinn's warm glow on the letters (lobby only; follows the mascot).
    this.pinnLight = new THREE.PointLight('#ff7a45', 3.2, 8, 2);
    g.add(this.pinnLight);

    // Lift
    this.lift = liftDoor();
    this.lift.position.set(0, 0, z0 - D + 0.2);
    g.add(this.lift);
    this.interactive(this.lift, { label: 'Ride to Floor 1', onClick: () => this.app.goToFloor(1) });

    this.dust = dust({ count: 700, box: [40, 13, 40], center: V(0, 6.5, 0) });
    g.add(this.dust);

    // Camera path
    this.setPath([
      { pos: [0, 2.7, 18.5], look: [0, 1.9, 0], stop: { id: 'hero', label: 'Welcome', html: tplHero(c), align: 'hero', mascot: c.floors[0].mascot } },
      { pos: [9, 2.9, 15], look: [0.3, 2.6, 0], shift: 0.1 },
      { pos: [14, 3.0, 9], look: [0.5, 2.9, -0.5], shift: 0.2, stop: { id: 'about', label: 'Curator’s note', html: tplManifesto(c), align: 'left', mascot: 'Every project gets museum-grade care.' } },
      { pos: [9.5, 2.9, -7], look: [-1, 3.4, -16], shift: 0.15 },
      { pos: [1.5, 3.8, -1.5], look: [0.5, 8.4, -21.5], shift: 0.22, stop: { id: 'guide', label: 'Floor guide', html: tplFloorGuide(c), align: 'left', mascot: 'Hop in the lift! Keep scrolling to ride up.' } },
    ]);
    this.bounds = new THREE.Box3(V(-21, 0.8, -19), V(21, 12, 28.5)).translate(V(0, this.y, 0));
  }

  enter() {
    const m = this.app.mascot;
    m.setPerches(
      this.perches.map((p) => p.point),
      this.perches[0].r * 1.3,
    );
    m.setMode('perch', true);
  }

  update(dt, t) {
    this.dust.update(t);
    this.mark.update(t);
    const m = this.app.mascot.root;
    this.pinnLight.position.set(m.position.x, m.position.y - this.y + this.app.mascot.size, m.position.z);
    this.title.update(dt, t, this.app.hovered, this.app.engine.reducedMotion);
    this.lift.needle.rotation.z = -0.7 + Math.sin(t * 0.6) * 0.1;
  }
}
