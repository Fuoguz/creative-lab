import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import gsap from 'gsap';
import { createEnergy } from './riftEnergy';
import { createLab } from './riftLab';
import { createMachiningTexture, createReflectionStudio } from './surface';
import { mechanismProgress, mechanismStage } from './choreography';

export type Phase = 'loading' | 'awakening' | 'core' | 'entering' | 'lab' | 'returning' | 'error';
export interface SceneEvents {
  phase: (p: Phase) => void;
  progress: (p: number) => void;
  hover: (name: string) => void;
  select: (name: string) => void;
  experiment: (index: number) => void;
  quality: (low: boolean) => void;
  spread: (value: boolean) => void;
  mechanism: (label: string) => void;
  error: (message: string) => void;
}
type Assembly = {
  object: THREE.Object3D;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  rotation: THREE.Euler;
  turn: THREE.Vector3;
  stage: number;
};
export class CoreExperience {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(36, 1, 0.08, 160);
  controls: OrbitControls;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  root = new THREE.Group();
  energy = createEnergy();
  lab = createLab();
  phase: Phase = 'loading';
  exploded = false;
  reduced: boolean;
  low = false;
  state = { spread: 0, wake: 0, energy: 0, offset: 1, lab: 0 };
  assemblies: Assembly[] = [];
  targets: THREE.Object3D[] = [];
  selected = '';
  hovered = '';
  private dead = false;
  private raf = 0;
  private then = 0;
  private time = 0;
  private slow = 0;
  private timeline?: gsap.core.Timeline;
  private observer: ResizeObserver;
  private ray = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-9, -9);
  private down = new THREE.Vector2();
  private keyLight = new THREE.DirectionalLight('#c3d6ef', 0);
  private rimLight = new THREE.PointLight('#e4a66a', 0, 22, 2);
  private coreLight = new THREE.PointLight('#69c5ff', 0, 5, 2);
  private machining = createMachiningTexture();
  private labSelection = -1;
  private lastMechanism = '';
  private env: THREE.WebGLRenderTarget;
  private focusTweens: gsap.core.Tween[] = [];
  private sampleFrames = 0;
  private sampleTime = 0;
  private fill = new THREE.DirectionalLight('#b8d1d1', 0);
  constructor(
    private host: HTMLElement,
    private events: SceneEvents,
    reduced: boolean,
  ) {
    this.reduced = reduced;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setClearColor('#050706');
    this.scene.background = new THREE.Color('#050706');
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.info.autoReset = false;
    this.renderer.domElement.setAttribute(
      'aria-label',
      '可旋转的机械核心。拖动旋转，滚轮或双指缩放。键盘方向键旋转，D 解构，Enter 进入，Escape 返回。',
    );
    this.renderer.domElement.tabIndex = 0;
    host.appendChild(this.renderer.domElement);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = createReflectionStudio();
    this.env = pmrem.fromScene(room, 0.04);
    this.disposeObject(room);
    pmrem.dispose();
    this.scene.environment = this.env.texture;
    this.scene.environmentIntensity = 0;
    this.scene.fog = new THREE.FogExp2('#080b12', 0.009);
    this.scene.background = new THREE.Color('#080b12');
    this.camera.position.set(3.2, 1.2, 11);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reduced;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 8.5;
    this.controls.maxDistance = 16;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = 2.7;
    this.controls.rotateSpeed = 0.55;
    this.controls.enabled = false;
    this.keyLight.position.set(-3, 5, 4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.bias = -0.0008;
    this.keyLight.shadow.normalBias = 0.02;
    Object.assign(this.keyLight.shadow.camera, {
      left: -4,
      right: 4,
      top: 4,
      bottom: -4,
      near: 0.5,
      far: 20,
    });
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.keyLight);
    this.rimLight.position.set(-3, -1, -2);
    this.scene.add(this.rimLight);
    this.fill.position.set(4, 1, -3);
    this.scene.add(this.fill);
    this.scene.add(new THREE.HemisphereLight('#879aae', '#17110d', 0.035));
    this.coreLight.position.set(0, 0, 0.5);
    this.root.add(this.energy, this.coreLight);
    this.scene.add(this.root, this.lab.group);
    this.lab.group.visible = false;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.15, 0.35, 1.8);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.low = window.innerWidth <= 800;
    this.events.quality(this.low);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointerleave', this.onLeave);
    el.addEventListener('keydown', this.onKey);
    el.addEventListener('webglcontextlost', this.onContextLost);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.raf = requestAnimationFrame(this.frame);
    void this.load();
  }
  private setPhase(p: Phase) {
    this.phase = p;
    this.events.phase(p);
  }
  private async load() {
    try {
      const gltf = await new GLTFLoader().loadAsync(
        `${import.meta.env.BASE_URL}models/the-core-v1.5.glb`,
        (e) => {
          if (!this.dead && e.total) this.events.progress(Math.round((e.loaded / e.total) * 90));
        },
      );
      if (this.dead) {
        this.disposeObject(gltf.scene);
        return;
      }
      const originalMaterials = new Set<THREE.Material>();
      gltf.scene.traverse((o) => {
        if (Array.isArray(o.userData.explode)) {
          o.name = o.userData.assemblyId || o.name.replace(/\.\d+$/, '');
          this.assemblies.push({
            object: o,
            origin: o.position.clone(),
            direction: new THREE.Vector3(...(o.userData.explode as [number, number, number])),
            rotation: o.rotation.clone(),
            turn: new THREE.Vector3(...(o.userData.turn as [number, number, number])),
            stage: o.userData.stage ?? 3,
          });
        }
        if (o instanceof THREE.Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          this.targets.push(o);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            originalMaterials.add(m),
          );
          o.material = Array.isArray(o.material)
            ? o.material.map((m) => m.clone())
            : o.material.clone();
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          materials.forEach((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              m.userData.baseEmission = m.emissiveIntensity;
              if (!m.name.startsWith('Energy')) {
                m.roughnessMap = this.machining;
                m.bumpMap = this.machining;
                m.bumpScale = 0.0015;
              }
            }
          });
        }
      });
      originalMaterials.forEach((m) => m.dispose());
      this.root.add(gltf.scene);
      this.events.progress(95);
      this.lab.group.visible = true;
      await this.renderer.compileAsync(this.scene, this.camera);
      if (this.dead) return;
      this.lab.group.visible = false;
      this.events.progress(100);
      this.awaken();
    } catch (e) {
      if (!this.dead) {
        this.setPhase('error');
        this.events.error(`模型或渲染初始化失败：${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  private awaken() {
    this.setPhase('awakening');
    this.state.spread = 0;
    if (!this.reduced) this.camera.position.set(4, 0.7, 13);
    this.timeline = gsap
      .timeline({
        onComplete: () => {
          this.setPhase('core');
          this.controls.enabled = true;
        },
      })
      .to(this.state, { wake: 1, duration: this.reduced ? 0.1 : 2.8, ease: 'power2.out' })
      .to(
        this.state,
        { energy: 1, duration: this.reduced ? 0.1 : 1.5, ease: 'expo.inOut' },
        this.reduced ? 0 : 1.1,
      )
      .to(
        this.camera.position,
        { x: 3.2, y: 1.2, z: 11, duration: this.reduced ? 0.1 : 3.4, ease: 'sine.inOut' },
        0,
      );
  }
  toggleExplode() {
    if (this.phase !== 'core') return;
    this.exploded = !this.exploded;
    this.events.spread(this.exploded);
    gsap.to(this.state, {
      spread: this.exploded ? 1 : 0,
      duration: this.reduced ? 0.12 : 3.2,
      ease: 'none',
      overwrite: 'auto',
    });
  }
  select(name: string) {
    this.selected = name;
    this.events.select(name);
  }
  enter() {
    if (this.phase !== 'core') return;
    this.setPhase('entering');
    this.labSelection = -1;
    this.controls.enabled = false;
    this.onLeave();
    this.lab.group.visible = true;
    gsap.killTweensOf(this.state);
    this.timeline?.kill();
    this.focusTweens.forEach((t) => t.kill());
    this.timeline = gsap.timeline({
      onComplete: () => {
        this.root.visible = false;
        this.setPhase('lab');
      },
    });
    if (this.reduced) {
      this.state.lab = 1;
      this.camera.position.set(2, 1, -8);
      this.controls.target.set(0, 0, -39);
      this.camera.lookAt(this.controls.target);
      this.state.offset = 0;
      this.resize();
      this.root.visible = false;
      this.setPhase('lab');
      return;
    }
    this.timeline
      .to(this.state, { spread: 1, offset: 0, duration: 1.8, ease: 'none' }, 0)
      .to(this.camera.position, { x: 0, y: 0, z: 5.8, duration: 1.8, ease: 'power2.inOut' }, 0)
      .to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.8 }, 0)
      .to(this.energy.scale, { x: 0.03, y: 1, z: 0.03, duration: 0.8, ease: 'expo.in' }, 1.3)
      .to(this.camera.position, { x: 2, z: -8, y: 1, duration: 3.2, ease: 'power3.inOut' }, 1.8)
      .to(this.controls.target, { z: -39, duration: 3.0, ease: 'sine.inOut' }, 1.8);
    this.timeline.to(this.state, { lab: 1, duration: 2, ease: 'sine.inOut' }, 2.3);
  }
  exit() {
    if (this.phase !== 'lab') return;
    this.setPhase('returning');
    this.focusTweens.forEach((t) => t.kill());
    this.root.visible = true;
    this.timeline?.kill();
    this.timeline = gsap
      .timeline({
        onComplete: () => {
          this.lab.group.visible = false;
          this.controls.enabled = true;
          this.exploded = false;
          this.events.spread(false);
          this.setPhase('core');
        },
      })
      .to(
        this.camera.position,
        { x: 3.2, y: 1.2, z: 11, duration: this.reduced ? 0.1 : 3.4, ease: 'power3.inOut' },
        0,
      )
      .to(
        this.controls.target,
        { x: 0, y: 0, z: 0, duration: this.reduced ? 0.1 : 1.9, ease: 'power3.inOut' },
        0,
      )
      .to(
        this.state,
        { offset: 1, spread: 0, lab: 0, duration: this.reduced ? 0.1 : 3.4, ease: 'none' },
        0,
      )
      .to(this.energy.scale, { x: 1, y: 1, z: 1, duration: this.reduced ? 0.1 : 1.8 }, 0);
  }
  focusExperiment(i: number) {
    if (this.phase !== 'lab') return;
    this.labSelection = i;
    const target = this.lab.focuses[i];
    this.events.experiment(i);
    this.focusTweens.forEach((t) => t.kill());
    this.focusTweens = [
      gsap.to(this.camera.position, {
        x: target.x + 1.5,
        y: target.y + 0.8,
        z: target.z + 9,
        duration: this.reduced ? 0 : 1.8,
        ease: 'power3.inOut',
      }),
      gsap.to(this.controls.target, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: this.reduced ? 0 : 1.8,
      }),
    ];
  }
  overviewLab() {
    if (this.phase !== 'lab') return;
    this.labSelection = -1;
    this.focusTweens.forEach((t) => t.kill());
    this.focusTweens = [
      gsap.to(this.camera.position, { x: 2, y: 1, z: -8, duration: this.reduced ? 0 : 1.8, ease: 'power3.inOut' }),
      gsap.to(this.controls.target, { x: 0, y: 0, z: -39, duration: this.reduced ? 0 : 1.8, ease: 'sine.inOut' }),
    ];
  }
  resetView() {
    if (this.phase !== 'core') return;
    this.controls.reset();
    this.camera.position.set(3.2, 1.2, 11);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }
  setQuality(low: boolean) {
    this.low = low;
    this.slow = 0;
    this.events.quality(low);
    this.resize();
  }
  setReduced(value: boolean) {
    this.reduced = value;
    this.controls.enableDamping = !value;
    if (value) {
      if (this.timeline?.isActive()) this.timeline.progress(1);
      this.focusTweens.forEach((t) => t.progress(1));
    }
    gsap.killTweensOf(this.state);
    this.state.spread = this.exploded ? 1 : 0;
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    const dpr = this.low ? 1 : Math.min(window.devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.shadowMap.enabled = !this.low;
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.root.scale.setScalar(w <= 800 ? 0.72 : 1);
    this.updateOffset();
    this.camera.updateProjectionMatrix();
  }
  private updateOffset() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.camera.setViewOffset(w, h, w > 800 ? -w * 0.15 * this.state.offset : 0, 0, w, h);
  }
  private assemblyOf(obj: THREE.Object3D): string {
    let o: THREE.Object3D | null = obj;
    while (o) {
      if (o.userData.explode) return o.name;
      o = o.parent;
    }
    return '';
  }
  private experimentOf(obj: THREE.Object3D): number {
    let o: THREE.Object3D | null = obj;
    while (o) {
      if (typeof o.userData.experiment === 'number') return o.userData.experiment;
      o = o.parent;
    }
    return -1;
  }
  private onMove = (e: PointerEvent) => {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
  };
  private onDown = (e: PointerEvent) => {
    this.down.set(e.clientX, e.clientY);
    this.onMove(e);
  };
  private onUp = (e: PointerEvent) => {
    if (this.down.distanceTo(new THREE.Vector2(e.clientX, e.clientY)) > 6) return;
    this.onMove(e);
    this.ray.setFromCamera(this.pointer, this.camera);
    const hit = this.ray.intersectObjects(
      this.phase === 'lab' ? this.lab.targets : this.targets,
      false,
    )[0];
    if (!hit) return;
    if (this.phase === 'lab') {
      const i = this.experimentOf(hit.object);
      if (i >= 0) this.focusExperiment(i);
    } else if (this.phase === 'core') this.select(this.assemblyOf(hit.object));
  };
  private onLeave = () => {
    this.pointer.set(-9, -9);
    this.hovered = '';
    this.events.hover('');
    this.renderer.domElement.style.cursor = 'grab';
  };
  private onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.phase === 'lab') {
      e.preventDefault();
      this.exit();
      return;
    }
    if (this.phase !== 'core') return;
    if (e.key.toLowerCase() === 'd') {
      e.preventDefault();
      this.toggleExplode();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      this.enter();
      return;
    }
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      this.resetView();
      return;
    }
    if (e.key.toLowerCase() === 'c') {
      e.preventDefault();
      const i = this.assemblies.findIndex((a) => a.object.name === this.selected);
      this.select(this.assemblies[(i + 1) % this.assemblies.length].object.name);
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const s = new THREE.Spherical().setFromVector3(
        this.camera.position.clone().sub(this.controls.target),
      );
      s.theta += e.key === 'ArrowLeft' ? 0.12 : e.key === 'ArrowRight' ? -0.12 : 0;
      s.phi = THREE.MathUtils.clamp(
        s.phi + (e.key === 'ArrowUp' ? -0.1 : e.key === 'ArrowDown' ? 0.1 : 0),
        0.45,
        2.7,
      );
      this.camera.position.setFromSpherical(s).add(this.controls.target);
      this.controls.update();
    }
  };
  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.setPhase('error');
    this.events.error('图形上下文已中断。可重新加载体验，或继续查看文字实验目录。');
  };
  private onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(this.raf);
    else {
      this.then = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  };
  private frame = (now: number) => {
    if (this.dead) return;
    const dt = this.then ? Math.min((now - this.then) / 1000, 0.1) : 0.016;
    this.then = now;
    if (!this.reduced) this.time += dt;
    if (this.phase === 'core' && !this.low) {
      this.slow = dt > 0.036 ? this.slow + 1 : Math.max(0, this.slow - 1);
      if (this.slow > 100) this.setQuality(true);
    }
    this.keyLight.intensity = this.state.wake * 3.4 * (1 - this.state.lab * 0.85);
    this.rimLight.intensity = this.state.wake * 36;
    this.fill.intensity = this.state.wake * 0.65;
    this.coreLight.intensity = this.state.energy * (4 + this.state.spread * 5);
    this.scene.environmentIntensity = this.state.wake * (0.65 - this.state.lab * 0.25);
    const compact = this.host.clientWidth <= 800;
    const baseScale = compact
      ? Math.min(0.72, (this.host.clientWidth / this.host.clientHeight) * 1.3)
      : 1;
    this.root.scale.setScalar(baseScale * (1 - Math.min(this.state.spread, 1) * 0.26));
    this.energy.material.uniforms.power.value = this.state.energy;
    this.energy.material.uniforms.time.value = this.time;
    this.energy.material.uniforms.reveal.value = this.state.spread;
    this.root.rotation.z = (1 - this.state.wake) * -0.3;
    this.targets.forEach((o) => {
      const m = (o as THREE.Mesh).material;
      const materials = Array.isArray(m) ? m : [m];
      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial && mat.name.startsWith('Energy'))
          mat.emissiveIntensity = mat.userData.baseEmission * this.state.energy * 0.7;
      });
    });
    this.assemblies.forEach(({ object, origin, direction, rotation, turn, stage }) => {
      const p = mechanismProgress(this.state.spread, stage);
      object.position.copy(origin).addScaledVector(direction, p);
      object.rotation.set(
        rotation.x + turn.x * p,
        rotation.y + turn.y * p,
        rotation.z + turn.z * p,
      );
    });
    const label = mechanismStage(this.state.spread);
    if (label !== this.lastMechanism) {
      this.lastMechanism = label;
      this.events.mechanism(label);
    }
    this.root.position.y = this.reduced ? 0 : Math.sin(this.time * 0.6) * 0.035;
    if (this.phase === 'core') this.controls.update();
    else if (this.phase !== 'loading') {
      this.camera.lookAt(this.controls.target);
      this.updateOffset();
    }
    this.lab.update(
      this.time,
      this.labSelection,
      this.hovered.startsWith('PORTAL') ? Number(this.hovered.split(' ')[1]) - 1 : -1,
      this.reduced,
      dt,
    );
    if (this.phase === 'core' || this.phase === 'lab') {
      this.ray.setFromCamera(this.pointer, this.camera);
      const hit = this.ray.intersectObjects(
        this.phase === 'lab' ? this.lab.targets : this.targets,
        false,
      )[0];
      const name = hit
        ? this.phase === 'core'
          ? this.assemblyOf(hit.object)
          : `PORTAL ${this.experimentOf(hit.object) + 1}`
        : '';
      if (name !== this.hovered) {
        this.hovered = name;
        this.events.hover(name);
        this.renderer.domElement.style.cursor = name ? 'pointer' : 'grab';
      }
      this.targets.forEach((o) => {
        const mesh = o as THREE.Mesh;
        const active = this.assemblyOf(o) === (this.hovered || this.selected);
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m instanceof THREE.MeshStandardMaterial && !m.name.startsWith('Energy')) {
            m.emissive.set(active ? '#7dacc8' : '#000000');
            m.emissiveIntensity = active ? 0.18 : 0;
          }
        });
      });
    }
    this.renderer.info.reset();
    if (this.low) this.renderer.render(this.scene, this.camera);
    else this.composer.render();
    this.sampleFrames++;
    this.sampleTime += dt;
    if (this.sampleTime >= 1) {
      const el = this.renderer.domElement;
      el.dataset.fps = String(Math.round(this.sampleFrames / this.sampleTime));
      el.dataset.drawCalls = String(this.renderer.info.render.calls);
      el.dataset.triangles = String(this.renderer.info.render.triangles);
      el.dataset.quality = this.low ? 'eco' : 'studio';
      this.sampleFrames = 0;
      this.sampleTime = 0;
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  private disposeObject(root: THREE.Object3D) {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.timeline?.kill();
    gsap.killTweensOf(this.state);
    this.focusTweens.forEach((t) => t.kill());
    this.observer.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibility);
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onMove);
    el.removeEventListener('pointerdown', this.onDown);
    el.removeEventListener('pointerup', this.onUp);
    el.removeEventListener('pointerleave', this.onLeave);
    el.removeEventListener('keydown', this.onKey);
    el.removeEventListener('webglcontextlost', this.onContextLost);
    this.controls.dispose();
    this.disposeObject(this.scene);
    this.env.dispose();
    this.machining.dispose();
    this.keyLight.shadow.dispose();
    this.composer.passes.forEach((p) => p.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
