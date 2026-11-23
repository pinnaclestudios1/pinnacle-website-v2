import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

/** Film grain + vignette, applied after tone mapping. */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.022 },
    uVignette: { value: 0.55 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime; uniform float uGrain; uniform float uVignette;
    varying vec2 vUv;
    float hash(vec2 p) { p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.95, 0.25, length(d * vec2(1.0, 0.85)) * 1.25);
      c.rgb *= mix(1.0, v, uVignette);
      float n = hash(gl_FragCoord.xy + fract(uTime * 7.13) * 100.0) - 0.5;
      c.rgb += n * uGrain;
      gl_FragColor = c;
    }`,
};

/** Integrated / mobile GPUs get the lighter quality tier. `?quality=low|high` forces one. */
function detectTier(renderer, isTouch) {
  let gpu = '';
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  } catch (e) {}
  const forced = new URLSearchParams(location.search).get('quality');
  if (forced === 'low' || forced === 'high' || forced === 'software') return { tier: forced, gpu };
  // No GPU at all: the browser is drawing WebGL on the CPU (hardware acceleration
  // off or blocked). Only a very small render resolution stays usable.
  if (/swiftshader|basic render|llvmpipe|softpipe|software/i.test(gpu)) return { tier: 'software', gpu };
  const weak =
    isTouch ||
    (navigator.hardwareConcurrency || 8) <= 4 ||
    /intel|radeon\(tm\) graphics|radeon graphics|radeon vega|vega \d+ graphics|mali|adreno|powervr|apple gpu|swiftshader|llvmpipe|basic render/i.test(gpu);
  return { tier: weak ? 'low' : 'high', gpu };
}

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    this.renderer = renderer;

    const { tier, gpu } = detectTier(renderer, this.isTouch);
    this.tier = tier;
    this.gpu = gpu;
    this.software = tier === 'software';
    this.low = tier === 'low' || this.software;
    // Render-resolution budget (pixels). Large or high-DPI screens render
    // slightly below native instead of overwhelming the GPU. On CPU rendering
    // pixel count is everything, so that tier renders small and upscales.
    this.pixelBudget = this.software ? 0.32e6 : this.low ? 2.1e6 : 3.2e6;
    this.scale = 1; // dynamic-resolution multiplier
    this.minScale = this.software ? 0.6 : 0.72; // never softer than this
    this.ceiling = 1;

    renderer.shadowMap.enabled = !this.low;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    // Refreshed once per frame by the loop; otherwise the mirror floor's
    // extra render pass would redraw the shadow map a second time.
    renderer.shadowMap.autoUpdate = false;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c0b0e');
    this.scene.fog = new THREE.Fog('#0c0b0e', 25, 80);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    this.scene.add(this.camera);

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.4;
    pmrem.dispose();

    // High tier: 4× MSAA. Low tier: no MSAA, one cheap FXAA pass instead.
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: this.low ? 0 : 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.9);
    // Bloom at quarter resolution: the glow is soft anyway, and this is far cheaper.
    const bloomSetSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w, h) => bloomSetSize(Math.max(2, Math.round(w * 0.5)), Math.max(2, Math.round(h * 0.5)));
    this.composer.addPass(this.bloom);
    if (this.software) this.bloom.enabled = false;
    this.composer.addPass(new OutputPass());
    if (this.low) {
      this.fxaa = new ShaderPass(FXAAShader);
      this.composer.addPass(this.fxaa);
    }
    this.finish = new ShaderPass(FinishShader);
    if (this.reducedMotion) this.finish.uniforms.uGrain.value = 0;
    this.composer.addPass(this.finish);

    this.timer = new THREE.Timer();
    this.timer.connect?.(document);
    this.updaters = new Set();
    this.running = false;
    this._perf = { t0: 0, frames: 0, good: 0, hold: 0 };

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  get aspect() {
    return this.width / this.height;
  }

  get maxPixelRatio() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return THREE.MathUtils.clamp(Math.sqrt(this.pixelBudget / (this.width * this.height)), this.software ? 0.25 : 0.5, dpr);
  }

  _applyResolution() {
    this.pixelRatio = this.maxPixelRatio * this.scale;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(this.width, this.height);
    if (this.fxaa) this.fxaa.material.uniforms.resolution.value.set(1 / (this.width * this.pixelRatio), 1 / (this.height * this.pixelRatio));
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this._applyResolution();
    this.camera.aspect = this.width / this.height;
    // Portrait screens get a wider lens so the sculptures still fit.
    this.camera.fov = this.camera.aspect < 1 ? 62 : this.camera.aspect < 1.4 ? 52 : 45;
    this.camera.updateProjectionMatrix();
  }

  /** Per-floor atmosphere. */
  setMood({ background, fog, fogNear = 25, fogFar = 80, exposure = 1, env = 0.4, bloom = 0.55, bloomThreshold = 0.9, bloomRadius = 0.6 }) {
    this.scene.background.set(background);
    this.scene.fog.color.set(fog ?? background);
    this.scene.fog.near = fogNear;
    this.scene.fog.far = fogFar;
    this.renderer.toneMappingExposure = exposure;
    this.scene.environmentIntensity = env;
    this.bloom.strength = bloom;
    this.bloom.threshold = bloomThreshold;
    this.bloom.radius = bloomRadius;
    // New floor, new cost profile: let the resolution climb back up if it can.
    this.ceiling = 1;
    this.settle();
  }

  /** Ignore frame timings for a moment (floor swaps, resolution changes). */
  settle(ms = 1200) {
    this._perf.hold = performance.now() + ms;
    this._perf.t0 = 0;
  }

  add(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.timer.update();
    this.settle();
    const loop = (now) => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      this.timer.update(now);
      const dt = Math.min(this.timer.getDelta(), 1 / 20);
      const t = this.timer.getElapsed();
      for (const fn of this.updaters) fn(dt, t);
      this.finish.uniforms.uTime.value = t;
      if (this.renderer.shadowMap.enabled) this.renderer.shadowMap.needsUpdate = true;
      this.composer.render(dt);
      this._adapt(now);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
  }

  /**
   * Dynamic resolution: measure the real frame rate every second. Drop the
   * render scale quickly when it's low; raise it slowly when there's headroom.
   */
  _adapt(now) {
    const p = this._perf;
    if (document.hidden || now < p.hold) {
      p.t0 = 0;
      return;
    }
    if (!p.t0) {
      p.t0 = now;
      p.frames = 0;
      return;
    }
    p.frames++;
    const elapsed = now - p.t0;
    if (elapsed < 1000) return;
    const fps = (p.frames * 1000) / elapsed;
    p.t0 = now;
    p.frames = 0;
    this.fps = fps;

    // Did the last resolution drop actually help? If not, the GPU isn't the
    // bottleneck: the browser is capping the frame rate (Chrome Energy Saver,
    // battery saver, no hardware acceleration…). Lowering resolution would only
    // make it blurry, so restore sharpness and stop degrading.
    if (p.trial) {
      const t = p.trial;
      p.trial = null;
      // Only treat it as a cap near typical capped rates (≥ 20 fps). Below that
      // the device is simply struggling, and lower resolution is the right call.
      if (t.fps >= 20 && fps < t.fps * 1.1) {
        this.scale = t.scale;
        this.minScale = t.scale;
        this.ceiling = 1;
        this._applyResolution();
        this.capped = Math.round(t.fps);
        // Only tell the visitor when it looks like a real power-saving cap
        // (~30 fps). Other drops (a throttled or partly hidden window) just
        // keep full sharpness quietly.
        if (this.capped >= 25 && this.capped <= 35) this.onCapped?.(this.capped);
        this.settle(500);
        return;
      }
    }

    if (fps < 48) {
      p.good = 0;
      if (this.scale > this.minScale + 0.001) {
        p.trial = { scale: this.scale, fps };
        this.ceiling = Math.max(this.minScale, this.scale - 0.05);
        this.scale = Math.max(this.minScale, this.scale - (fps < 30 ? 0.15 : 0.1));
        this._applyResolution();
        this.settle(500);
      } else if (fps < 40 && this.bloom.enabled && !this.capped) {
        this.bloom.enabled = false;
      }
    } else if (fps > 57) {
      p.good++;
      if (p.good >= 4 && this.scale < this.ceiling - 0.001) {
        p.good = 0;
        this.scale = Math.min(this.ceiling, this.scale + 0.1);
        this._applyResolution();
        this.settle(500);
      }
    } else p.good = 0;
  }
}
