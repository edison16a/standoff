import * as THREE from "three";
import type { Solid } from "../engine/types";
import type { Theme } from "./themes";

/** How far the floor grid runs back from the play, toward the horizon. */
const REACH = 150;
/** The grid itself fades out over this much of it, leaving dark ground to the horizon. */
const GRID = 34;
/** How far back from the play a pit cuts into the floor. */
const NOTCH = 2.5;

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
    const plane = (x0: number, x1: number, z0: number, z1: number, y = 0) => {
      const geometry = new THREE.PlaneGeometry(x1 - x0, z0 - z1);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
      this.geometries.push(geometry);
      return geometry;
    };
    // A pit only notches the front of the floor. Behind it the grid carries on, so it reads as a hole, not a canyon.
    const from = Math.min(...grounds.map((g) => g.x));
    const to = Math.max(...grounds.map((g) => g.x + g.w));
    this.group.add(new THREE.Mesh(plane(from, to, -NOTCH, -0.5 - REACH), this.material));
    for (const ground of grounds) this.group.add(new THREE.Mesh(plane(ground.x, ground.x + ground.w, -0.5, -NOTCH), this.material));
    // Down in a pit: near darkness, with the level's colour glowing faintly.
    this.abyss = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.fill).multiplyScalar(0.5) });
    this.group.add(new THREE.Mesh(plane(from, to, 1, -NOTCH, -6), this.abyss));
    const back = new THREE.PlaneGeometry(to - from, 8);
    back.translate((from + to) / 2, -4, -NOTCH);
    this.geometries.push(back);
    this.group.add(new THREE.Mesh(back, this.abyss));
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
