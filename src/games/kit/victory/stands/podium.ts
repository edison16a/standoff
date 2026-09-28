import * as THREE from "three";
import { metal } from "../trophies/materials";

export interface PodiumOptions {
  /** Width of each step, metres. */
  width?: number;
  /** Height of first place. Second and third are lower. */
  height?: number;
  /** The steps' colour. */
  colour?: string;
  /** Trim colour for each place, first to third. */
  trims?: readonly [string, string, string];
}

/** Heights of second and third, as shares of first. */
const STEP = [1, 0.66, 0.42] as const;
/** Across the podium, left to right as seen from the front: second, first, third. */
const ACROSS = [0, -1, 1] as const;

export interface Podium {
  object: THREE.Group;
  /** Where to stand the winner of a place, 1 to 3: the middle of that step's top. */
  topOf(place: 1 | 2 | 3): THREE.Vector3;
  dispose(): void;
}

/**
 * The three step podium: first in the middle and highest, second on its
 * left and third on its right as seen from the front (+z). Each step has
 * its number on the front and a metal trim, gold, silver and bronze.
 */
export function createPodium(options: PodiumOptions = {}): Podium {
  const width = options.width ?? 1.4;
  const height = options.height ?? 0.9;
  const trims = options.trims ?? ["#f6c453", "#dfe3ea", "#c8804a"];
  const object = new THREE.Group();
  object.name = "podium";
  const body = new THREE.MeshPhysicalMaterial({ color: options.colour ?? "#f4f5f8", roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const disposables: { dispose(): void }[] = [body];
  for (let i = 0; i < 3; i++) {
    const h = height * STEP[i]!;
    const x = ACROSS[i]! * width;
    const front = new THREE.MeshPhysicalMaterial({ map: numberTexture(i + 1, trims[i]!), roughness: 0.35, clearcoat: 0.8 });
    if (front.map) {
      // The square number stays square on a wide step; the plain edges of the drawing fill the sides.
      const aspect = (width * 0.98) / h;
      front.map.repeat.set(aspect, 1);
      front.map.offset.set(-(aspect - 1) / 2, 0);
    }
    const box = new THREE.BoxGeometry(width * 0.98, h, width * 0.9);
    const step = new THREE.Mesh(box, [body, body, body, body, front, body]);
    step.position.set(x, h / 2, 0);
    step.receiveShadow = true;
    step.castShadow = true;
    const trimMaterial = metal(i === 0 ? "gold" : i === 1 ? "silver" : "bronze", 0.25);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(width * 0.99, 0.035, width * 0.91), trimMaterial);
    trim.position.set(x, h - 0.02, 0);
    object.add(step, trim);
    disposables.push(front, box, trim.geometry, trimMaterial);
  }
  return {
    object,
    topOf(place) {
      const i = place - 1;
      return new THREE.Vector3(ACROSS[i]! * width, height * STEP[i]!, 0).applyMatrix4(object.matrixWorld);
    },
    dispose() {
      for (const d of disposables) d.dispose();
      for (const m of disposables) if (m instanceof THREE.MeshPhysicalMaterial) m.map?.dispose();
    },
  };
}

/** A round pedestal for a single winner, with a gold band. Its top is at `height`. */
export function createPedestal(options: { radius?: number; height?: number; colour?: string } = {}): THREE.Group {
  const radius = options.radius ?? 0.8;
  const height = options.height ?? 0.7;
  const object = new THREE.Group();
  object.name = "pedestal";
  const body = new THREE.MeshPhysicalMaterial({ color: options.colour ?? "#191b24", roughness: 0.28, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.1 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, height, 72), body);
  drum.position.y = height / 2;
  const gold = metal("gold", 0.2);
  const bandTop = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.005, 0.025, 12, 96).rotateX(Math.PI / 2), gold);
  bandTop.position.y = height - 0.02;
  const bandLow = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.075, 0.03, 12, 96).rotateX(Math.PI / 2), gold);
  bandLow.position.y = 0.03;
  for (const mesh of [drum, bandTop, bandLow]) {
    mesh.castShadow = mesh.receiveShadow = true;
    object.add(mesh);
  }
  object.userData.top = height;
  return object;
}

function numberTexture(place: number, trim: string): THREE.Texture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#f4f5f8";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = trim;
  ctx.fillRect(0, 0, 256, 14);
  ctx.font = "900 150px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.strokeText(String(place), 128, 140);
  ctx.fillStyle = trim;
  ctx.fillText(String(place), 128, 140);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
