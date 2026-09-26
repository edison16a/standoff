import * as THREE from "three";
import { glowTexture, seeded } from "../kit/textures";
import type { ArenaTheme } from "./arena-theme";

const RADIUS = 120;

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 zenith;
  uniform vec3 horizon;
  varying vec3 vDir;
  void main() {
    float up = clamp(vDir.y, 0.0, 1.0);
    gl_FragColor = vec4(mix(horizon, zenith, pow(up, 0.55)), 1.0);
  }
`;

/**
 * The open sky over the arena: a gradient dome, a hazy sun and drifting
 * clouds by day, stars and a big pale moon by night.
 */
export class Sky {
  readonly group = new THREE.Group();
  /** Where the sun or moon hangs, which is where their light comes from. */
  readonly lightFrom = new THREE.Vector3(-30, 60, 40);
  private readonly clouds: THREE.Sprite[] = [];

  constructor(theme: ArenaTheme) {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: { zenith: { value: new THREE.Color(theme.zenith) }, horizon: { value: new THREE.Color(theme.horizon) } },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    dome.renderOrder = -10;
    this.group.add(dome);
    const rand = seeded(77);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: theme.dark ? 0xdde6ff : 0xfff3d0, fog: false, depthWrite: false, toneMapped: false }));
    disc.position.copy(this.lightFrom).setLength(RADIUS * 0.9);
    disc.scale.setScalar(theme.dark ? 16 : 30);
    this.group.add(disc);

    if (theme.stars) {
      const positions: number[] = [];
      for (let i = 0; i < 900; i++) {
        const a = rand() * Math.PI * 2;
        const y = 0.12 + rand() * 0.88;
        const r = Math.sqrt(1 - y * y);
        positions.push(Math.cos(a) * r * RADIUS * 0.95, y * RADIUS * 0.95, Math.sin(a) * r * RADIUS * 0.95);
      }
      const stars = new THREE.BufferGeometry();
      stars.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      this.group.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, sizeAttenuation: true, fog: false, depthWrite: false })));
    } else {
      // A few soft clouds drifting high over the stands.
      for (let i = 0; i < 14; i++) {
        const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffffff, opacity: 0.55, transparent: true, fog: false, depthWrite: false }));
        const a = rand() * Math.PI * 2;
        cloud.position.set(Math.cos(a) * 80, 28 + rand() * 22, Math.sin(a) * 80);
        cloud.scale.set(30 + rand() * 30, 8 + rand() * 6, 1);
        this.clouds.push(cloud);
        this.group.add(cloud);
      }
    }
  }

  update(t: number): void {
    // The clouds drift slowly round.
    this.clouds.forEach((cloud, i) => {
      const a = t / 400000 + i * 0.45;
      cloud.position.x = Math.cos(a) * 80;
      cloud.position.z = Math.sin(a) * 80;
    });
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) object.geometry.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Sprite) (object.material as THREE.Material).dispose();
    });
  }
}
