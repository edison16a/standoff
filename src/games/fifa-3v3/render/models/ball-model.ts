import * as THREE from "three";
import { BALL } from "../../engine/tuning";
import type { BallView } from "../../engine/view";

/**
 * The classic ball: twelve black pentagons and twenty white hexagons,
 * painted texel by texel from the directions of an icosahedron's corners
 * (the pentagons) and a dodecahedron's (the hexagons), with dark seams
 * where two panels meet.
 */
function panelTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(w, h);
  const icosahedron = new THREE.IcosahedronGeometry(1, 0);
  const corners = icosahedron.getAttribute("position");
  const centres: { v: THREE.Vector3; pent: boolean }[] = [];
  const add = (v: THREE.Vector3, pent: boolean) => {
    if (!centres.some((c) => c.v.distanceTo(v) < 1e-3)) centres.push({ v: v.normalize(), pent });
  };
  const at = (i: number) => new THREE.Vector3(corners.getX(i), corners.getY(i), corners.getZ(i));
  // Pentagons sit on the corners, hexagons on the middle of each triangular face.
  for (let i = 0; i < corners.count; i++) add(at(i), true);
  for (let i = 0; i < corners.count; i += 3) add(at(i).add(at(i + 1)).add(at(i + 2)), false);
  icosahedron.dispose();
  const dir = new THREE.Vector3();
  for (let y = 0; y < h; y++) {
    const theta = (y / h) * Math.PI;
    for (let x = 0; x < w; x++) {
      const phi = (x / w) * Math.PI * 2;
      dir.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
      let best = -2;
      let second = -2;
      let pent = false;
      for (const c of centres) {
        const d = c.v.dot(dir);
        if (d > best) {
          second = best;
          best = d;
          pent = c.pent;
        } else if (d > second) second = d;
      }
      const seam = best - second < 0.012;
      const shade = seam ? 60 : pent ? 22 : 246;
      const i = (y * w + x) * 4;
      image.data[i] = shade;
      image.data[i + 1] = shade;
      image.data[i + 2] = seam ? 70 : pent ? 30 : 250;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

let sharedTexture: THREE.CanvasTexture | null = null;

/**
 * The match ball: rolls with the ground it covers, spins in the air, and
 * throws a soft blob of shadow on the turf that shrinks as it rises.
 */
export class BallModel {
  readonly group = new THREE.Group();
  private readonly mesh: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly last = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly spin = new THREE.Quaternion();
  private airSpin = 0;

  constructor(shadowTexture: THREE.Texture) {
    sharedTexture ??= panelTexture();
    const material = new THREE.MeshStandardMaterial({ map: sharedTexture, roughness: 0.38, metalness: 0.02 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL.radius, 32, 20), material);
    this.mesh.castShadow = true;
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false, opacity: 0.55, color: "#000000" }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.renderOrder = 2;
    this.group.add(this.mesh, this.shadow);
  }

  update(ball: BallView, dt: number): void {
    const pos = new THREE.Vector3(ball.x, ball.y, ball.z);
    const moved = pos.clone().sub(this.last);
    const ground = Math.hypot(moved.x, moved.z);
    if (ground > 1e-5 && ground < 3) {
      if (ball.y < BALL.radius + 0.05) {
        // Rolling: turn about the axis across the direction of travel.
        this.axis.set(moved.z, 0, -moved.x).normalize();
        this.spin.setFromAxisAngle(this.axis, ground / BALL.radius);
        this.mesh.quaternion.premultiply(this.spin);
        this.airSpin = ground / BALL.radius / Math.max(dt, 1e-3);
      } else {
        // In the air it keeps spinning, slowing a little.
        this.airSpin *= Math.exp(-dt * 0.4);
        this.axis.set(moved.z, 0.2, -moved.x).normalize();
        this.spin.setFromAxisAngle(this.axis, this.airSpin * dt);
        this.mesh.quaternion.premultiply(this.spin);
      }
    }
    this.last.copy(pos);
    this.mesh.position.copy(pos);
    const size = 0.34 + ball.y * 0.12;
    this.shadow.position.set(ball.x, 0.012, ball.z);
    this.shadow.scale.setScalar(size);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.6 - ball.y * 0.12);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.Material).dispose();
  }
}
