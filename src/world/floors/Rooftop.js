import * as THREE from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import italicJson from '../../assets/fonts/fraunces-700-italic.typeface.json';
import { Floor } from '../Floor.js';
import { V, std, brassMat, C, contactShadow, sharedGlow, dust } from '../kit.js';
import { deckTex, windowsTex } from '../textures.js';
import { tplContactForm, tplFaq, tplFooter } from '../../ui/templates.js';

/** The Rooftop: open sky, city lights, a neon "say hello" and the contact desk. */
export class Rooftop extends Floor {
  async build() {
    const g = this.group;
    const c = this.app.content;
    this.mood = { background: '#0a0e1c', fog: '#0d1226', fogNear: 40, fogFar: 230, exposure: 1.0, env: 0.18, bloom: 0.5, bloomThreshold: 1.0, bloomRadius: 0.45 };

    // Sky dome with gradient + stars
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(300, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: new THREE.Color('#05060f') }, uMid: { value: new THREE.Color('#1a1d44') }, uBot: { value: new THREE.Color('#ff7a4d') } },
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
        fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uBot; varying vec3 vP;
          void main(){ float h = vP.y; vec3 c = mix(uMid, uTop, smoothstep(0.05, 0.6, h)); c = mix(uBot * 0.55, c, smoothstep(-0.05, 0.16, h)); gl_FragColor = vec4(c, 1.); }`,
      }),
    );
    g.add(sky);
    const starGeo = new THREE.BufferGeometry();
    const sp = [];
    for (let i = 0; i < 1400; i++) {
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(Math.random() * 0.9 + 0.08);
      sp.push(Math.sin(ph) * Math.cos(th) * 280, Math.cos(ph) * 280, Math.sin(ph) * Math.sin(th) * 280);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.3, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false }));
    g.add(stars);
    this.stars = stars;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2dc').multiplyScalar(1.05), fog: false }));
    moon.position.set(-60, 110, -220);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: sharedGlow(), color: '#ffe3c0', transparent: true, opacity: 0.22, depthWrite: false, fog: false }));
    halo.scale.setScalar(60);
    halo.position.copy(moon.position);
    g.add(moon, halo);

    await this.pause();
    // City skyline
    const win = windowsTex();
    const bGeo = new THREE.BoxGeometry(1, 1, 1);
    bGeo.translate(0, 0.5, 0);
    const bMat = new THREE.MeshStandardMaterial({ color: '#0b0d16', emissive: '#ffffff', emissiveMap: win, emissiveIntensity: 0.8, roughness: 0.9 });
    const count = 260;
    const city = new THREE.InstancedMesh(bGeo, bMat, count);
    const dmy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.02;
      const r = 70 + Math.random() * 110;
      dmy.position.set(Math.cos(a) * r, -40, Math.sin(a) * r);
      const w = 5 + Math.random() * 9;
      dmy.scale.set(w, 18 + Math.random() * 60 + (r < 100 ? 0 : 20), 5 + Math.random() * 9);
      dmy.rotation.y = -a;
      dmy.updateMatrix();
      city.setMatrixAt(i, dmy.matrix);
    }
    g.add(city);

    // Terrace deck
    const deck = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 26), std({ map: deckTex(), roughness: 0.7 }));
    deck.position.set(0, -0.2, 0);
    deck.receiveShadow = true;
    g.add(deck);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(34.6, 40, 26.6), std({ color: '#121420', roughness: 0.9 }));
    slab.position.set(0, -20.4, 0);
    g.add(slab);

    // Glass balustrade
    const brass = brassMat();
    const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc4ff', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
    const edges = [
      [0, -13, 34, 0],
      [-17, 0, 26, Math.PI / 2],
      [17, 0, 26, Math.PI / 2],
    ];
    for (const [x, z, len, rot] of edges) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(len, 1.1), glass);
      pane.position.set(x, 0.55, z);
      pane.rotation.y = rot;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.07, 0.1), brass);
      rail.position.set(x, 1.12, z);
      rail.rotation.y = rot;
      g.add(pane, rail);
    }

    await this.pause();
    // Neon sign on scaffold
    const font = new Font(italicJson);
    const neonMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a08').multiplyScalar(1.15), toneMapped: false });
    this.neonMat = neonMat;
    const neonGeo = new THREE.ExtrudeGeometry(font.generateShapes('say hello.', 1.7), { depth: 0.16, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 8 });
    neonGeo.computeBoundingBox();
    const nb = neonGeo.boundingBox;
    neonGeo.translate(-(nb.max.x + nb.min.x) / 2, 0, 0);
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.set(-1, 4.1, -10.5);
    g.add(neon);
    this.neon = neon;
    const backer = new THREE.Mesh(new THREE.BoxGeometry(nb.max.x - nb.min.x + 1.4, 3.6, 0.12), std({ color: '#151622', roughness: 0.5, metalness: 0.6 }));
    backer.position.set(-1, 4.9, -10.75);
    g.add(backer);
    const post = std({ color: '#22242e', metalness: 0.8, roughness: 0.4 });
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 4.5, 0.16), post);
      leg.position.set(-1 + sx * (nb.max.x - nb.min.x) * 0.4, 1.2, -10.85);
      g.add(leg);
    }
    const neonLight = new THREE.PointLight(C.ember, 30, 18, 2);
    neonLight.position.set(-1, 4.5, -8.5);
    g.add(neonLight);
    this.neonLight = neonLight;

    // String lights
    const bulbs = [];
    const poles = [V(-15, 0, 11), V(-15, 0, -11), V(15, 0, -11), V(15, 0, 11)];
    const poleMat = std({ color: '#1c1d26', metalness: 0.7, roughness: 0.4 });
    poles.forEach((p) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 10), poleMat);
      m.position.copy(p).setY(2.5);
      g.add(m);
    });
    const spans = [
      [poles[0], poles[1]],
      [poles[1], poles[2]],
      [poles[2], poles[3]],
      [poles[0], poles[2]],
      [poles[1], poles[3]],
    ];
    for (const [a, b] of spans) {
      const n = Math.round(a.distanceTo(b) / 1.1);
      for (let i = 0; i <= n; i++) {
        const k = i / n;
        const p = a.clone().lerp(b, k);
        p.y = 4.9 - Math.sin(k * Math.PI) * 1.4;
        bulbs.push(p);
      }
    }
    const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffcf8a').multiplyScalar(1.6), toneMapped: false }), bulbs.length);
    bulbs.forEach((p, i) => {
      dmy.position.copy(p);
      dmy.scale.setScalar(1);
      dmy.rotation.set(0, 0, 0);
      dmy.updateMatrix();
      bulbMesh.setMatrixAt(i, dmy.matrix);
    });
    g.add(bulbMesh);
    const warm = new THREE.PointLight('#ffc27a', 22, 30, 2);
    warm.position.set(0, 4, 0);
    g.add(warm);

    // Planters with low-poly trees
    const potMat = std({ color: '#2a2b33', roughness: 0.7 });
    const leaf = std({ color: '#2f5b3a', roughness: 0.8, flatShading: true });
    for (const [x, z, s] of [
      [-13, -9, 1.2],
      [12.5, -9.5, 1.4],
      [-13.5, 7, 1],
      [13, 6, 1.1],
      [8, -10.5, 0.8],
    ]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * s, 0.7 * s, 1.1 * s, 20), potMat);
      pot.position.set(x, 0.55 * s, z);
      const tree = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(new THREE.IcosahedronGeometry((0.9 - i * 0.2) * s, 0), leaf);
        f.position.set((Math.random() - 0.5) * 0.4, (1.6 + i * 0.75) * s, (Math.random() - 0.5) * 0.4);
        f.castShadow = true;
        tree.add(f);
      }
      tree.position.set(x, 0, z);
      const sh = contactShadow(2.6 * s, 0.6);
      sh.position.set(x, 0.01, z);
      g.add(pot, tree, sh);
    }

    // Lounge cubes + telescope
    const seat = std({ color: '#e7dccb', roughness: 0.8 });
    for (const [x, z] of [
      [6, 2],
      [7.4, 3.2],
      [-8, 3],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), seat);
      m.position.set(x, 0.3, z);
      m.castShadow = true;
      const sh = contactShadow(1.8, 0.5);
      sh.position.set(x, 0.01, z);
      g.add(m, sh);
    }
    const scope = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.9, 20), brass);
    tube.rotation.z = -0.9;
    tube.position.y = 1.6;
    const tri = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 3, 1, true), post);
    tri.position.y = 0.7;
    scope.add(tube, tri);
    scope.position.set(10, 0, -6);
    scope.rotation.y = -0.6;
    g.add(scope);

    g.add(new THREE.HemisphereLight('#6d7cff', '#1a0f0a', 0.5));
    const moonLight = new THREE.DirectionalLight('#b8c4ff', 0.9);
    moonLight.position.set(-20, 30, -30);
    g.add(moonLight);

    this.setPath([
      { pos: [-4, 2.6, 9], look: [-1.5, 3.9, -10], shift: -0.3, stop: { id: 'hello', label: 'Contact', html: tplContactForm(c), align: 'panel', mascot: c.floors[4].mascot } },
      { pos: [0, 2.5, 5], look: [14, 4, -30], shift: -0.2, stop: { id: 'faq', label: 'FAQ', html: tplFaq(c), align: 'panel', mascot: 'Questions? I’ve got answers.' } },
      { pos: [2, 2.2, 7], look: [-14, 18, -60], shift: 0.15, stop: { id: 'footer', label: 'Goodnight', html: tplFooter(c), align: 'left', mascot: 'Thanks for visiting! Come back soon.' } },
    ]);
    this.dust = dust({ count: 200, box: [30, 6, 24], center: V(0, 3, 0), color: '#ffd9a0', size: 0.05, opacity: 0.5 });
    g.add(this.dust);
  }

  update(dt, t) {
    this.dust.update(t);
    // Neon flicker now and then
    const f = Math.sin(t * 37) > 0.97 || (t % 9 > 8.85 && Math.sin(t * 90) > 0) ? 0.35 : 1;
    this.neonMat.color.setRGB(1, 0.13, 0.02).multiplyScalar(1.15 * f);
    this.neonLight.intensity = 30 * f;
    this.stars.rotation.y = t * 0.004;
  }
}
