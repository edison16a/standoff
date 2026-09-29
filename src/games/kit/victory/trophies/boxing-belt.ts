import * as THREE from "three";
import { bendAt, bendVertex, type BeltBend } from "./belt-shape";
import { centrePlate, sidePlate, type PlateMaterials } from "./belt-plates";
import { bannerTexture, leatherTextures } from "./belt-textures";
import { disposeGeometries, shadowAll } from "./materials";

export interface BeltOptions {
  /** The leather. Black by default. */
  strap?: string;
  /** The enamel ring round the medallion. */
  enamel?: string;
  /** Engraved on the banner under the medallion. */
  title?: string;
  /** How the strap bends: `HELD_BEND` for lifting it overhead, `DISPLAY_BEND` for a gentle curve. */
  bend?: BeltBend;
  /** Scale on top of the real size, a strap about 1.1 metres long. */
  scale?: number;
}

/** Ends curled right back behind the hands, as a belt lifted overhead by its sides. */
export const HELD_BEND: BeltBend = { flat: 0.26, radius: 0.12 };
/** A soft curve, as a belt stood on a table. */
export const DISPLAY_BEND: BeltBend = { flat: 0.2, radius: 0.34 };

const LENGTH = 1.1;
const WIDTH = 0.17;
const THICK = 0.012;

export interface Belt {
  /** The strap runs along x with the centre plate facing +z, centred on the origin. */
  group: THREE.Group;
  /** Where each hand takes hold, just outside the centre plate, in the group's space. Left is +x as the wearer sees it facing the viewer. */
  hands: { left: THREE.Vector3; right: THREE.Vector3 };
  dispose(): void;
}

/**
 * A boxing championship belt: a stitched leather strap, a big crested
 * gold centre plate with an enamel ring, star and title, gold side
 * plates set with stones, and gems all round. The strap bends like
 * leather (see `belt-shape.ts`), and the side plates ride on it.
 */
export function createBoxingBelt(options: BeltOptions = {}): Belt {
  const bend = options.bend ?? DISPLAY_BEND;
  const group = new THREE.Group();
  const root = new THREE.Group();
  root.scale.setScalar(options.scale ?? 1);
  group.add(root);

  const leather = leatherTextures(options.strap ?? "#141418", "#e3b547");
  const strapMaterial = new THREE.MeshPhysicalMaterial({ color: leather.map ? "#ffffff" : options.strap ?? "#141418", map: leather.map, bumpMap: leather.bump, bumpScale: 2, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const banner = bannerTexture(options.title ?? "CHAMPION");
  const materials: PlateMaterials = {
    // Softer than the trophies' gold: a flat plate mirrors one direction only, often dark, and would read black.
    gold: new THREE.MeshPhysicalMaterial({ color: "#f3c552", metalness: 1, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 1.6 }),
    satin: new THREE.MeshPhysicalMaterial({ color: "#d4a13a", metalness: 1, roughness: 0.55, envMapIntensity: 1.2 }),
    enamel: new THREE.MeshPhysicalMaterial({ color: options.enamel ?? "#c8102e", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03 }),
    banner: new THREE.MeshPhysicalMaterial({ map: banner, color: banner ? "#ffffff" : "#e2b448", metalness: 0.85, roughness: 0.3, envMapIntensity: 1.2 }),
    gems: [
      gemMaterial("#e0115f"),
      gemMaterial("#e8f4ff"),
      gemMaterial("#1f5fff"),
    ],
  };

  root.add(new THREE.Mesh(strapGeometry(bend), strapMaterial));
  const centre = centrePlate(materials);
  centre.position.z = THICK / 2;
  root.add(centre);
  // Two side plates each side, riding the strap's curl.
  const slots = [0.23, 0.36];
  for (const side of [1, -1]) {
    slots.forEach((along, i) => {
      const plateGroup = sidePlate(materials, 0.085, 0.125, i + (side > 0 ? 0 : 1));
      const at = bendAt(side * along, bend);
      plateGroup.position.set(at.x + Math.sin(at.angle) * THICK * 0.5, 0, at.z + Math.cos(at.angle) * THICK * 0.5);
      plateGroup.rotation.y = at.angle;
      root.add(plateGroup);
    });
  }

  shadowAll(group);
  const grip = bendAt(bend.flat + 0.01, bend);
  const scale = options.scale ?? 1;
  const all = [strapMaterial, materials.gold, materials.satin, materials.enamel, materials.banner, ...materials.gems];
  return {
    group,
    hands: { left: new THREE.Vector3(grip.x * scale, 0, grip.z * scale), right: new THREE.Vector3(-grip.x * scale, 0, grip.z * scale) },
    dispose() {
      disposeGeometries(group);
      for (const texture of [leather.map, leather.bump, banner]) texture?.dispose();
      for (const material of all) material.dispose();
    },
  };
}

function gemMaterial(colour: string): THREE.MeshPhysicalMaterial {
  // Flat shading and a strong clearcoat make each facet flash as the belt turns under the lights.
  return new THREE.MeshPhysicalMaterial({ color: colour, metalness: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0, iridescence: 0.4, emissive: colour, emissiveIntensity: 0.12, flatShading: true, envMapIntensity: 2.2 });
}

/** The strap: a thin box with many cuts along its length, bent into shape vertex by vertex. */
function strapGeometry(bend: BeltBend): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(LENGTH, WIDTH, THICK, 120, 1, 1);
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < positions.count; i++) {
    const bent = bendVertex(positions.getX(i), positions.getZ(i), bend);
    positions.setXYZ(i, bent.x, positions.getY(i), bent.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}
