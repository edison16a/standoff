import * as THREE from "three";
import { FLOOR, floorTexture } from "./floor-texture";
import type { FloorMirror } from "./floor-mirror";
import { mapleBoards } from "./maple";

/** The maple detail tile: 1024 by 2048 pixels over 3.75 by 7.5 metres, about 2.7 pixels a centimetre. */
const TILE = { w: 1024, h: 2048, x: 3.75, z: 7.5 };

function woodTexture(): THREE.DataTexture {
  const t = new THREE.DataTexture(mapleBoards(TILE.w, TILE.h), TILE.w, TILE.h, THREE.RGBAFormat);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/**
 * The court's floor: one plane with the paint (`floor-texture.ts`) over
 * tiling maple boards (`maple.ts`), lacquered. The shader takes the
 * boards' tint where the paint lets the grain through, sinks the joints
 * into the normal so they catch the light, roughens them, and adds the
 * floor's mirror (`floor-mirror.ts`): blurred, distorted a touch by the
 * joints, and stronger toward grazing angles as a real gloss coat is.
 */
export class Floor {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.MeshStandardMaterial;
  private readonly wood = woodTexture();
  private readonly uniforms = {
    tWood: { value: this.wood as THREE.Texture },
    uWoodScale: { value: new THREE.Vector2(1 / TILE.x, 1 / TILE.z) },
    uWoodTexel: { value: new THREE.Vector2(1 / TILE.w, 1 / TILE.h) },
    tMirror: { value: null as THREE.Texture | null },
    uMirrorMatrix: { value: new THREE.Matrix4() },
    uMirror: { value: 0 },
  };

  constructor(private readonly mirror: FloorMirror | null) {
    this.material = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.17, metalness: 0, envMapIntensity: 1 });
    if (mirror) this.uniforms.tMirror.value = mirror.target.texture;
    this.uniforms.uMirrorMatrix.value = mirror?.matrix ?? new THREE.Matrix4();
    this.material.onBeforeCompile = (shader) => this.patch(shader);
    this.material.customProgramCacheKey = () => (mirror ? "nba-floor-mirror" : "nba-floor");
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR.maxX - FLOOR.minX, FLOOR.maxZ - FLOOR.minZ), this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set((FLOOR.maxX + FLOOR.minX) / 2, 0, (FLOOR.maxZ + FLOOR.minZ) / 2);
    this.mesh.receiveShadow = true;
  }

  /** Each frame, after the mirror is drawn. */
  update(): void {
    this.uniforms.uMirror.value = this.mirror?.active ? 1 : 0;
  }

  private patch(shader: THREE.WebGLProgramParametersWithUniforms): void {
    Object.assign(shader.uniforms, this.uniforms);
    const mirror = !!this.mirror;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vFloorWorld;\nvarying vec4 vMirror;\nuniform mat4 uMirrorMatrix;")
      .replace(
        "#include <fog_vertex>",
        "#include <fog_vertex>\nvec4 floorWorld = modelMatrix * vec4(transformed, 1.0);\nvFloorWorld = floorWorld.xyz;\nvMirror = uMirrorMatrix * floorWorld;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFloorWorld;
        varying vec4 vMirror;
        uniform sampler2D tWood;
        uniform sampler2D tMirror;
        uniform vec2 uWoodScale;
        uniform vec2 uWoodTexel;
        uniform float uMirror;`,
      )
      .replace(
        "#include <map_fragment>",
        `vec2 woodUv = vFloorWorld.xz * uWoodScale;
        vec4 wood = texture2D(tWood, woodUv);
        vec4 paint = texture2D(map, vMapUv);
        // A slow swell of tone across the floor, so the repeating tile never shows.
        float swell = 1.0 + 0.05 * sin(vFloorWorld.x * 0.37 + sin(vFloorWorld.z * 0.21) * 2.0) * sin(vFloorWorld.z * 0.29 + 1.7);
        diffuseColor.rgb *= paint.rgb * mix(vec3(1.0), wood.rgb * 2.0 * swell, paint.a);`,
      )
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = roughness + (1.0 - wood.a) * 0.45;")
      .replace(
        "#include <normal_fragment_maps>",
        `float hx = texture2D(tWood, woodUv + vec2(uWoodTexel.x, 0.0)).a - wood.a;
        float hz = texture2D(tWood, woodUv + vec2(0.0, uWoodTexel.y)).a - wood.a;
        vec3 floorNormal = normalize(vec3(-hx * 0.35, 1.0, -hz * 0.35));
        normal = normalize((viewMatrix * vec4(floorNormal, 0.0)).xyz);`,
      );
    if (!mirror) return;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `if (uMirror > 0.5) {
        vec2 mirrorUv = vMirror.xy / vMirror.w + floorNormal.xz * 0.03;
        vec4 seen = textureLod(tMirror, mirrorUv, 0.6);
        float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        float fresnel = 0.04 + 0.96 * pow(1.0 - facing, 5.0);
        // A fresh gloss coat under arena lamps reads stronger than bare physics says, as on any broadcast; the floor of 0.35 is that.
        float gloss = mix(0.35, 1.0, fresnel) * (1.0 - roughnessFactor);
        outgoingLight += seen.rgb * gloss - reflectedLight.indirectSpecular * seen.a;
      }
      #include <opaque_fragment>`,
    );
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.map?.dispose();
    this.material.dispose();
    this.wood.dispose();
  }
}
