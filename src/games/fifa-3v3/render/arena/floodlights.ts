import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { merge, paint, rod } from "../models/geo";

const HEIGHT = 25;

/**
 * Four floodlight towers at the corners: steel masts with a bank of
 * lamps each, a soft halo round the lamps and a faint beam of light
 * falling onto the pitch, like the haze on a cold match night.
 */
export function buildFloodlights(glowMap: THREE.Texture, beams = true): { group: THREE.Group; dispose(): void } {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const steel = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 });
  const lamp = new THREE.MeshBasicMaterial({ color: "#fffaf0", toneMapped: false });
  const halo = new THREE.SpriteMaterial({ map: glowMap, color: "#fff1d0", blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
  const beamMap = beamTexture();
  const beam = new THREE.MeshBasicMaterial({ map: beamMap, color: "#fff3d6", transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  disposables.push(steel, lamp, halo, beamMap, beam);
  const x = PITCH.halfLength + 10;
  const z = PITCH.halfWidth + 8.5;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    const tower = new THREE.Group();
    tower.position.set(sx * x, 0, sz * z);
    const mast = merge([
      rod([0, 0, 0], [0, HEIGHT, 0], 0.35, "#8a8f99", 12),
      ...[0.25, 0.5, 0.75].map((f) => rod([-0.9, HEIGHT * f, 0], [0.9, HEIGHT * f + 1.2, 0], 0.08, "#6b707a", 6)),
      paint(new THREE.BoxGeometry(5.4, 3.2, 0.45), "#3b3f48", { at: [0, HEIGHT + 1.2, 0] }),
    ]);
    const mastMesh = new THREE.Mesh(mast, steel);
    disposables.push(mast);
    tower.add(mastMesh);
    // The lamp bank faces the middle of the pitch, tipped down toward it.
    const head = new THREE.Group();
    head.position.set(0, HEIGHT + 1.2, 0);
    tower.add(head);
    head.lookAt(0, 0, 0);
    const lamps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.62, 0.12), lamp, 12);
    disposables.push(lamps.geometry);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 12; i++) {
      m.makeTranslation(-1.8 + (i % 4) * 1.2, -0.9 + Math.floor(i / 4) * 0.85, 0.28);
      lamps.setMatrixAt(i, m);
    }
    head.add(lamps);
    const glow = new THREE.Sprite(halo);
    glow.scale.set(16, 12, 1);
    glow.position.set(0, 0, 0.8);
    head.add(glow);
    const toPitch = new THREE.Vector3(-sx * x * 0.75, -(HEIGHT + 1.2), -sz * z * 0.75);
    const cone = new THREE.ConeGeometry(9, toPitch.length(), 24, 1, true);
    disposables.push(cone);
    const beamMesh = new THREE.Mesh(cone, beam);
    beamMesh.position.copy(toPitch.clone().multiplyScalar(0.5)).add(new THREE.Vector3(0, HEIGHT + 1.2, 0));
    beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), toPitch.clone().normalize());
    beamMesh.renderOrder = 5;
    if (beams) tower.add(beamMesh);
    group.add(tower);
  }
  return { group, dispose: () => disposables.forEach((d) => d.dispose()) };
}

/** Bright at the lamp, fading out toward the ground, for the light beams. */
function beamTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.5, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  return new THREE.CanvasTexture(canvas);
}
