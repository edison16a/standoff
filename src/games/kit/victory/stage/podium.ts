import * as THREE from "three";
import { disposeGeometries, shadowAll } from "../trophies/materials";
import { plate, roundedRect } from "../trophies/shapes";

export interface PodiumOptions {
  /** How many places: 1 makes a single pedestal, 3 the classic podium. */
  places?: 1 | 2 | 3;
  /** Width of each step in metres. */
  width?: number;
  /** Height of the top step. The others are lower. */
  height?: number;
  /** Colour of the steps. Their trims are gold, silver and bronze. */
  colour?: THREE.ColorRepresentation;
}

export interface Podium {
  group: THREE.Group;
  /** The middle of each step's top, first place first, in the group's space. */
  spots: THREE.Vector3[];
  dispose(): void;
}

const TRIMS = ["#f3c552", "#d9dde4", "#c9824a"];
/** Step heights as shares of the top step. */
const HEIGHTS = [1, 0.7, 0.45];

/**
 * A winners' podium: first in the middle and highest, second on its
 * left as the audience sees it, third on the right, each with a metal
 * trim and its number on the front. With one place it is a pedestal.
 * Stands on y 0 and faces +z.
 */
export function createPodium(options: PodiumOptions = {}): Podium {
  const places = options.places ?? 3;
  const width = options.width ?? 1.4;
  const top = options.height ?? 1.1;
  const group = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: options.colour ?? "#1b1d2a", roughness: 0.32, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.15 });
  const trims = TRIMS.map((colour) => new THREE.MeshPhysicalMaterial({ color: colour, metalness: 1, roughness: 0.2, envMapIntensity: 1.4 }));
  const numbers: THREE.Material[] = [];
  const spots: THREE.Vector3[] = [];
  // First in the middle, second to the audience's left (-x), third to the right.
  const xs = places === 1 ? [0] : places === 2 ? [width * 0.51, -width * 0.51] : [0, -width * 1.02, width * 1.02];
  for (let i = 0; i < places; i++) {
    const height = top * HEIGHTS[i]!;
    const step = new THREE.Mesh(plate(roundedRect(width, height, 0.04), width * 0.9, 0.02), body);
    // The extruded outline stands up; turn it so its depth runs front to back.
    step.position.set(xs[i]!, height / 2, -width * 0.45);
    group.add(step);
    // A metal band just under a dark lid, so the top stays a stage for the winner and the band shines.
    const trim = new THREE.Mesh(new THREE.BoxGeometry(width + 0.06, 0.05, width * 0.9 + 0.09), trims[i]!);
    trim.position.set(xs[i]!, height - 0.03, 0);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.03, width * 0.9 + 0.11), body);
    lid.position.set(xs[i]!, height + 0.01, 0);
    group.add(trim, lid);
    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 0.05, 0.04, width * 0.9 + 0.08), trims[i]!);
    base.position.set(xs[i]!, 0.02, 0);
    group.add(base);
    const number = numberMaterial(i + 1, TRIMS[i]!);
    if (number) {
      numbers.push(number);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.5, width * 0.5), number);
      face.position.set(xs[i]!, height * 0.5, width * 0.45 + 0.025);
      group.add(face);
    }
    spots.push(new THREE.Vector3(xs[i]!, height + 0.03, 0));
  }
  shadowAll(group);
  return {
    group,
    spots,
    dispose() {
      disposeGeometries(group);
      for (const material of [body, ...trims, ...numbers]) {
        (material as THREE.MeshStandardMaterial).map?.dispose();
        material.dispose();
      }
    },
  };
}

/** A big metal number for the front of a step, lit from within a little so it reads in the dark. */
function numberMaterial(place: number, colour: string): THREE.Material | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.font = "900 210px 'Arial Black', Impact, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = colour;
  ctx.shadowColor = colour;
  ctx.shadowBlur = 18;
  ctx.fillText(String(place), 128, 140);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, transparent: true, metalness: 0.6, roughness: 0.3, emissive: colour, emissiveMap: texture, emissiveIntensity: 0.35 });
}
