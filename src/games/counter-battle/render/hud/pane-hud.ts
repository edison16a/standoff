import * as THREE from "three";

const VIGNETTE_FRAG = `
uniform float uHurt;
uniform float uLow;
uniform float uDead;
uniform float uAspect;
varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float d = length(p) / length(vec2(uAspect, 1.0) * 0.5);
  float edge = smoothstep(0.45, 1.0, d);
  float red = clamp(uHurt + uLow, 0.0, 1.0) * edge;
  vec3 col = mix(vec3(0.85, 0.02, 0.05), vec3(0.05, 0.05, 0.08), uDead);
  float a = max(red * 0.85, uDead * (0.35 + 0.35 * edge));
  gl_FragColor = vec4(col, a);
}`;

const VIGNETTE_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export type MarkKind = "hit" | "head" | "kill";

/**
 * The flat layer drawn over one player's view: the crosshair in their
 * colour, opening with the spread and following the kick; a hit marker
 * when their shot lands (bigger for a head shot, red for a kill); and a
 * red vignette round the edges when they are hurt, which stays faintly
 * while their health is low and greys out the view once they are down.
 */
export class PaneHud {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  private readonly vignette: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly cross = new THREE.Group();
  private readonly bars: THREE.Mesh[] = [];
  private readonly marks = new THREE.Group();
  private readonly markMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthTest: false });
  private readonly owned: { dispose(): void }[] = [];
  private hurtAt = -Infinity;
  private hurtAmount = 0;
  private markAt = -Infinity;
  private markKind: MarkKind = "hit";

  constructor(colour: string) {
    const plane = new THREE.PlaneGeometry(1, 1);
    this.owned.push(plane, this.markMat);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VIGNETTE_VERT,
      fragmentShader: VIGNETTE_FRAG,
      uniforms: { uHurt: { value: 0 }, uLow: { value: 0 }, uDead: { value: 0 }, uAspect: { value: 1 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.owned.push(mat);
    this.vignette = new THREE.Mesh(plane, mat);
    const dark = new THREE.MeshBasicMaterial({ color: "#05060a", transparent: true, opacity: 0.75, depthTest: false });
    const bright = new THREE.MeshBasicMaterial({ color: colour, depthTest: false });
    this.owned.push(dark, bright);
    // Four ticks and a dot, each over a dark outline so it reads on sky and turf alike.
    for (const outline of [true, false]) {
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(plane, outline ? dark : bright);
        bar.userData = { tick: i, outline };
        bar.renderOrder = outline ? 1 : 2;
        this.bars.push(bar);
        this.cross.add(bar);
      }
    }
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(plane, this.markMat);
      m.rotation.z = Math.PI / 4 + (i * Math.PI) / 2;
      m.renderOrder = 3;
      this.marks.add(m);
    }
    this.scene.add(this.vignette, this.cross, this.marks);
  }

  /** The player took `damage` points: the edges flash red. */
  hurt(damage: number, now: number): void {
    this.hurtAt = now;
    this.hurtAmount = Math.min(1, 0.35 + damage / 60);
  }

  /** The player's shot landed. */
  mark(kind: MarkKind, now: number): void {
    if (kind === "hit" && this.markKind !== "hit" && now - this.markAt < 0.15) return;
    this.markAt = now;
    this.markKind = kind;
  }

  /**
   * Draws into the renderer's current viewport, `w` by `h` pixels.
   * `aim` is the crosshair in pane pixels from the bottom left, or null to
   * hide it; `gap` is how far the ticks stand off it.
   */
  draw(renderer: THREE.WebGLRenderer, w: number, h: number, aim: { x: number; y: number } | null, gap: number, health: number, alive: boolean, now: number): void {
    this.camera.right = w;
    this.camera.top = h;
    this.camera.updateProjectionMatrix();
    const u = this.vignette.material.uniforms;
    const since = now - this.hurtAt;
    u.uHurt!.value = alive ? this.hurtAmount * Math.max(0, 1 - since / 0.7) : 0;
    u.uLow!.value = alive && health < 0.35 ? (0.35 - health) * 1.2 * (0.8 + 0.2 * Math.sin(now * 5)) : 0;
    u.uDead!.value = alive ? 0 : 1;
    u.uAspect!.value = w / h;
    this.vignette.scale.set(w, h, 1);
    this.vignette.position.set(w / 2, h / 2, 0);
    this.cross.visible = alive && aim !== null;
    if (aim && alive) this.layoutCross(aim, gap, h);
    const mt = (now - this.markAt) / (this.markKind === "kill" ? 0.45 : 0.28);
    this.marks.visible = alive && aim !== null && mt >= 0 && mt < 1;
    if (this.marks.visible && aim) {
      const size = h * (this.markKind === "hit" ? 0.018 : 0.026) * (1 + 0.25 * (1 - mt));
      this.markMat.color.set(this.markKind === "kill" ? "#ff3048" : "#ffffff");
      this.markMat.opacity = 1 - mt * mt;
      this.marks.children.forEach((m, i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const r = gap + size * 0.9;
        m.position.set(aim.x + Math.cos(a) * r, aim.y + Math.sin(a) * r, 0);
        m.scale.set(size, Math.max(2, h * 0.004), 1);
      });
    }
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
  }

  private layoutCross(aim: { x: number; y: number }, gap: number, h: number): void {
    const len = Math.max(6, h * 0.018);
    const thick = Math.max(2, h * 0.0035);
    for (const bar of this.bars) {
      const { tick, outline } = bar.userData as { tick: number; outline: boolean };
      const pad = outline ? 2 : 0;
      if (tick === 4) {
        bar.position.set(aim.x, aim.y, 0);
        bar.scale.set(thick + pad, thick + pad, 1);
        continue;
      }
      const a = (tick * Math.PI) / 2;
      const r = gap + len / 2;
      bar.position.set(aim.x + Math.cos(a) * r, aim.y + Math.sin(a) * r, 0);
      bar.rotation.z = a;
      bar.scale.set(len + pad, thick + pad, 1);
    }
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
