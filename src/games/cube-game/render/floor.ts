import * as THREE from "three";
import type { Solid } from "../engine/types";
import type { Theme } from "./themes";

/** How far the floor grid runs back from the play, toward the horizon. */
const REACH = 150;
/** The grid itself fades out over this much of it, leaving dark ground to the horizon. */
const GRID = 34;

/**
 * The glowing grid the level runs on, stretching away behind the play
 * like an old synthwave cover. Lines sit on whole blocks in the world,
 * so they scroll past as the camera follows, and they flare on the beat.
 * Pits leave a gap in it, with a faint glow down in the dark.
 */
export class Floor {
  readonly group = new THREE.Group();
  private readonly material: THREE.ShaderMaterial;
  private readonly abyss: THREE.MeshBasicMaterial;
  private readonly geometries: THREE.BufferGeometry[] = [];

  constructor(grounds: readonly Solid[], theme: Theme) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        line: { value: new THREE.Color(theme.grid) },
        base: { value: new THREE.Color(theme.fill).multiplyScalar(0.6) },
        haze: { value: new THREE.Color(theme.skyLow) },
        pulse: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 line;
        uniform vec3 base;
        uniform vec3 haze;
        uniform float pulse;
        varying vec3 vWorld;
        void main() {
          vec2 cell = abs(fract(vWorld.xz * 0.5) - 0.5);
          vec2 width = fwidth(vWorld.xz * 0.5) * 1.2;
          vec2 lines = 1.0 - smoothstep(vec2(0.0), width + 0.012, 0.5 - cell);
          float grid = max(lines.x, lines.y);
          float near = clamp(-vWorld.z / ${GRID.toFixed(1)}, 0.0, 1.0);
          float far = clamp(-vWorld.z / ${REACH.toFixed(1)}, 0.0, 1.0);
          vec3 colour = base + line * grid * (0.8 + pulse * 1.1) * pow(1.0 - near, 1.5);
          colour = mix(colour, haze, smoothstep(0.2, 1.0, far) * 0.9);
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
    });
    for (const ground of grounds) {
      const geometry = new THREE.PlaneGeometry(ground.w, REACH);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(ground.x + ground.w / 2, 0, -0.5 - REACH / 2);
      this.geometries.push(geometry);
      this.group.add(new THREE.Mesh(geometry, this.material));
    }
    // Down in a pit: darkness with the level's colour glowing faintly.
    const deep = new THREE.PlaneGeometry(4000, REACH);
    deep.rotateX(-Math.PI / 2);
    deep.translate(1000, -7.5, -REACH / 2);
    this.geometries.push(deep);
    this.abyss = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.edge).multiplyScalar(0.12) });
    this.group.add(new THREE.Mesh(deep, this.abyss));
  }

  update(pulse: number): void {
    this.material.uniforms.pulse!.value = pulse;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.material.dispose();
    this.abyss.dispose();
  }
}
