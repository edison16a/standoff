import * as THREE from "three";
import { DRIP_TILES, ROUND_TILES, splatAtlas } from "./splat-art";

/** The most splats on the field at once. Past this the oldest is painted over. */
export const MAX_SPLATS = 360;
/** Seconds a drip takes to run its full length down a wall. */
const DRIP_TIME = 2.4;
const Z = new THREE.Vector3(0, 0, 1);
const DOWN = new THREE.Vector3(0, -1, 0);
const m = new THREE.Matrix4();
const q = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const s = new THREE.Vector3();
const p = new THREE.Vector3();
const c = new THREE.Color();
const x = new THREE.Vector3();
const y = new THREE.Vector3();
const basis = new THREE.Matrix4();

/** Swaps the standard map for the atlas: picks the tile, lets drips run over time, and shades thick paint wetter. */
function patch(shader: THREE.WebGLProgramParametersWithUniforms, time: { value: number }, atlas: THREE.Texture): void {
  shader.uniforms.uTime = time;
  shader.uniforms.uAtlas = { value: atlas };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nattribute float aTile;\nattribute float aBorn;\nattribute vec2 aCorner;\nuniform float uTime;\nvarying vec2 vAtlas;\nvarying float vAge;")
    .replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vAge = uTime - aBorn;
      // A splat lands with a quick spread from small.
      transformed.xy *= 0.55 + 0.45 * smoothstep(0.0, 0.07, vAge);
      vAtlas = (vec2(mod(aTile, 4.0), 3.0 - floor(aTile / 4.0)) + aCorner) / 4.0;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\nuniform sampler2D uAtlas;\nvarying vec2 vAtlas;\nvarying float vAge;`)
    .replace(
      "#include <map_fragment>",
      `vec4 splat = texture2D(uAtlas, vAtlas);
      float drip = splat.r;
      // A drip shows only as far down as it has run.
      float run = clamp(vAge / ${DRIP_TIME.toFixed(1)}, 0.0, 1.0);
      float shown = drip > 0.03 ? step(drip, run * run * (3.0 - 2.0 * run)) : 1.0;
      float cover = smoothstep(0.38, 0.62, splat.g) * shown;
      if (cover < 0.01) discard;
      float thick = splat.b;
      diffuseColor.rgb *= mix(0.72, 1.12, thick);
      diffuseColor.a *= cover;`,
    )
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.55, 0.12, thick);");
}

/**
 * Paint splats where shots land, on the bunkers and the turf, in the
 * shooter's team colour. Each is a tile from the splat atlas, turned at
 * random. On walls the tile's drips point down the wall and run down it
 * over a couple of seconds. One instanced draw for the lot, capped, with
 * the oldest reused first. They stay until the round is over.
 */
export class Splats {
  readonly mesh: THREE.InstancedMesh;
  private next = 0;
  private used = 0;
  private readonly atlas = splatAtlas();
  private readonly time = { value: 0 };
  private readonly tile = new Float32Array(MAX_SPLATS);
  private readonly born = new Float32Array(MAX_SPLATS).fill(-100);
  private readonly geo = new THREE.PlaneGeometry(1, 1);
  private readonly mat = new THREE.MeshStandardMaterial({ transparent: true, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });

  constructor() {
    // The plane's own corners under a name of ours: the standard uv is only declared when a map is set.
    this.geo.setAttribute("aCorner", this.geo.getAttribute("uv").clone());
    this.geo.setAttribute("aTile", new THREE.InstancedBufferAttribute(this.tile, 1));
    this.geo.setAttribute("aBorn", new THREE.InstancedBufferAttribute(this.born, 1));
    this.mat.onBeforeCompile = (shader) => patch(shader, this.time, this.atlas);
    this.mesh = new THREE.InstancedMesh(this.geo, this.mat, MAX_SPLATS);
    // Colours from the start, so the material is built for them once.
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_SPLATS * 3).fill(1), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.renderOrder = 1;
  }

  /**
   * A splat of `size` metres at `at`, flat on the surface facing `normal`.
   * `pick` and `spin` are 0 to 1 random numbers choosing its shape and turn.
   */
  add(at: THREE.Vector3, normal: THREE.Vector3, colour: THREE.ColorRepresentation, size: number, pick: number, spin: number, now: number): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX_SPLATS;
    this.used = Math.min(MAX_SPLATS, this.used + 1);
    const wall = Math.abs(normal.y) < 0.6;
    if (wall) {
      // The tile's own down is turned to run down the wall, with a little lean.
      y.copy(DOWN).addScaledVector(normal, -DOWN.dot(normal)).normalize().negate();
      y.applyAxisAngle(normal, (spin - 0.5) * 0.3);
      x.crossVectors(y, normal).normalize();
      basis.makeBasis(x, y, normal);
      q.setFromRotationMatrix(basis);
      this.tile[i] = ROUND_TILES + Math.floor(pick * DRIP_TILES);
    } else {
      q.setFromUnitVectors(Z, normal);
      q.multiply(q2.setFromAxisAngle(Z, spin * Math.PI * 2));
      this.tile[i] = Math.floor(pick * ROUND_TILES);
    }
    this.born[i] = now;
    // Stood a little off the surface, since the rounded bunkers curve away under a flat splat.
    p.copy(at).addScaledVector(normal, 0.012);
    s.setScalar(size * (wall ? 1.35 : 1));
    m.compose(p, q, s);
    this.mesh.setMatrixAt(i, m);
    this.mesh.setColorAt(i, c.set(colour));
    this.mesh.count = this.used;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    (this.geo.getAttribute("aTile") as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.geo.getAttribute("aBorn") as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  update(now: number): void {
    this.time.value = now;
  }

  /** The atlas, shared with the splats on fighters. */
  get texture(): THREE.Texture {
    return this.atlas;
  }

  clear(): void {
    this.next = 0;
    this.used = 0;
    this.mesh.count = 0;
  }

  dispose(): void {
    this.atlas.dispose();
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.dispose();
  }
}
