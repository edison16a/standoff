import * as THREE from "three";
import { MeshBuilder } from "./mesh-builder";
import { glowTexture } from "./textures";

const FOG = 0x1a222e;

/**
 * Night over the dead city: thick blue grey fog, a sky that fades from
 * black overhead to the fog's colour at the horizon, a hazy moon, dim
 * moonlight and sky light, a skyline of towers far off, and the team's
 * flashlight pushing into the fog ahead.
 */
export class Atmosphere {
  readonly group = new THREE.Group();
  readonly flashlight: THREE.SpotLight;
  /** A soft warm fill near the guns so they read against the dark street. */
  readonly gunLight: THREE.PointLight;
  private readonly sky: THREE.Mesh;
  private readonly skyline: THREE.Group;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    scene.fog = new THREE.FogExp2(FOG, 0.022);
    scene.background = new THREE.Color(0x07090d);
    this.sky = this.makeSky();
    this.skyline = this.makeSkyline();
    this.group.add(this.sky, this.skyline);
    const hemi = new THREE.HemisphereLight(0x4a5a78, 0x1a1612, 1.2);
    const moon = new THREE.DirectionalLight(0x8ea4c8, 0.5);
    moon.position.set(-30, 60, -40);
    this.group.add(hemi, moon);

    // Wide enough to catch the dead coming in from the sides of the road, not just down the middle.
    this.flashlight = new THREE.SpotLight(0xdfe8ff, 85, 60, 0.7, 0.75, 1.15);
    this.flashlight.position.set(0.25, -0.2, 0);
    this.flashlight.target.position.set(0, -0.6, -10);
    camera.add(this.flashlight, this.flashlight.target);
    this.gunLight = new THREE.PointLight(0xffd2a0, 1.6, 3, 1.5);
    this.gunLight.position.set(0, 0.2, 0.3);
    camera.add(this.gunLight);
  }

  /** The sky and skyline follow the camera so they are never reached. */
  follow(camera: THREE.Vector3): void {
    this.sky.position.copy(camera);
    this.skyline.position.set(camera.x, 0, camera.z);
  }

  private makeSky(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(150, 32, 16);
    const colours: number[] = [];
    const top = new THREE.Color(0x020306);
    const horizon = new THREE.Color(FOG);
    const pos = geo.attributes.position!;
    for (let i = 0; i < pos.count; i++) {
      const k = Math.max(0, pos.getY(i) / 150);
      const c = horizon.clone().lerp(top, Math.pow(k, 0.5));
      colours.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
    const sky = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.renderOrder = -10;
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x9fb4d8, fog: false, depthWrite: false, transparent: true, opacity: 0.55 }));
    moon.position.set(-60, 80, -90);
    moon.scale.setScalar(40);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xdfe8ff, fog: false, depthWrite: false }));
    disc.position.copy(moon.position);
    disc.scale.setScalar(9);
    sky.add(moon, disc);
    return sky;
  }

  /** Far towers as dark silhouettes against the glow of the fog, a few windows still lit. */
  private makeSkyline(): THREE.Group {
    const b = new MeshBuilder();
    const mat = new THREE.MeshBasicMaterial({ color: 0x0c1016, fog: false });
    const lit = new THREE.MeshBasicMaterial({ color: 0x6a5a3a, fog: false });
    let s = 7;
    const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2 + rand() * 0.05;
      const r = 120 + rand() * 15;
      const h = 15 + rand() * 45;
      const w = 6 + rand() * 12;
      const face = Math.atan2(-Math.cos(a), -Math.sin(a));
      b.box(w, h, w, mat, [Math.cos(a) * r, h / 2 - 4, Math.sin(a) * r], [0, face, 0]);
      for (let j = 0; j < 3; j++) {
        if (rand() < 0.5) continue;
        const inner = r - w / 2 - 0.05;
        b.add(new THREE.PlaneGeometry(1.2, 1.4), lit, [Math.cos(a) * inner + (rand() - 0.5) * w * 0.3, 2 + rand() * (h - 6), Math.sin(a) * inner], [0, face, 0]);
      }
    }
    return b.build("skyline");
  }
}
