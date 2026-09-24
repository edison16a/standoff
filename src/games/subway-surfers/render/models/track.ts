import * as THREE from "three";
import { LANES, laneX } from "../../engine/tuning";
import { MeshBuilder } from "../mesh-builder";
import { tunnelTileTexture } from "../art/scenery-art";
import { brickTexture, glowTexture, gravelTexture } from "../textures";

/** Scenery is laid in chunks of this many metres, each built from shared prefabs. */
export const CHUNK = 30;
/** The tunnel roof, above a jetpack's flight. */
export const TUNNEL_TOP = 9.2;
const GAUGE = 0.72;

const prefabs = new Map<string, THREE.Group>();
const materials = new Map<string, THREE.Material>();

export function cached(key: string, build: () => THREE.Group): THREE.Group {
  let prefab = prefabs.get(key);
  if (!prefab) {
    prefab = build();
    prefab.userData.sharedGeometry = true;
    prefab.traverse((node) => (node.userData.sharedGeometry = true));
    prefabs.set(key, prefab);
  }
  return prefab.clone();
}

export function textured(key: string, make: () => THREE.Material): THREE.Material {
  let material = materials.get(key);
  if (!material) {
    material = make();
    material.userData.shared = true;
    materials.set(key, material);
  }
  return material;
}

function repeated(texture: THREE.Texture, key: string, x: number, y: number): THREE.Texture {
  const copy = texture.clone();
  copy.repeat.set(x, y);
  copy.needsUpdate = true;
  copy.userData.shared = true;
  copy.name = key;
  return copy;
}

/** One chunk of the three tracks: the gravel bed, sleepers and shining rails, from z = 0 back to -30. */
export function trackTile(verge: number): THREE.Group {
  return cached(`track-${verge}`, () => {
    const b = new MeshBuilder();
    const gravel = textured("gravel-bed", () => new THREE.MeshStandardMaterial({ map: repeated(gravelTexture(), "gravel-bed", 5, 16), roughness: 0.95 }));
    b.panel(9.6, CHUNK, gravel, [0, 0, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) b.panel(60, CHUNK, { color: verge, finish: "matte" }, [side * 34.8, -0.02, -CHUNK / 2], [-Math.PI / 2, 0, 0]);
    const wood = { color: 0x6b4a33, finish: "matte" as const };
    const steel = { color: 0xd7dde5, finish: "metal" as const };
    const base = { color: 0x5b4f45, finish: "matte" as const };
    for (const lane of LANES) {
      const x = laneX(lane);
      for (let z = -0.3; z > -CHUNK; z -= 0.75) b.box(1.95, 0.1, 0.24, wood, [x, 0.05, z]);
      for (const g of [-GAUGE, GAUGE]) {
        b.box(0.16, 0.04, CHUNK, base, [x + g, 0.12, -CHUNK / 2]);
        b.box(0.07, 0.14, CHUNK, steel, [x + g, 0.19, -CHUNK / 2]);
      }
    }
    return b.build("track");
  });
}

/** A gantry over the tracks carrying the wires, with signal lamps over each track on some. */
export function gantry(signals: number | null): THREE.Group {
  return cached(`gantry-${signals}`, () => {
    const b = new MeshBuilder();
    const steel = { color: 0x6f7a88, finish: "metal" as const };
    const dark = { color: 0x2a2d35, finish: "satin" as const };
    for (const x of [-5.1, 5.1]) {
      b.box(0.34, 7, 0.34, steel, [x, 3.5, 0], undefined, 0.04);
      b.box(0.7, 0.3, 0.7, { color: 0x8a8f98, finish: "matte" }, [x, 0.15, 0]);
    }
    b.box(10.6, 0.36, 0.3, steel, [0, 6.9, 0], undefined, 0.04);
    b.box(10.2, 0.08, 0.08, steel, [0, 6.4, 0]);
    for (const lane of LANES) {
      const x = laneX(lane);
      b.box(0.05, 0.9, 0.05, dark, [x, 6.3, 0]);
      // The contact wire runs the whole chunk.
      b.box(0.04, 0.04, CHUNK, dark, [x, 5.9, -CHUNK / 2]);
      b.box(0.03, 0.03, CHUNK, dark, [x, 6.5, -CHUNK / 2]);
      if (signals === null) continue;
      // Signal heads hang over each track: green, or red over a track that is blocked ahead.
      b.box(0.5, 1.1, 0.34, dark, [x, 6.1, 0.1], undefined, 0.08);
      const red = (signals >> (lane + 1)) & 1;
      b.sphere(0.13, { color: red ? 0xff3b30 : 0x3a1a1a, finish: red ? "glow" : "satin" }, [x, 6.38, 0.28]);
      b.sphere(0.13, { color: red ? 0x1a3a1a : 0x3ddc84, finish: red ? "satin" : "glow" }, [x, 5.9, 0.28]);
      b.box(0.44, 0.05, 0.2, dark, [x, 6.55, 0.36]);
    }
    return b.build("gantry");
  });
}

/** One chunk of tunnel: lined walls with lamps, a vaulted roof over all three tracks. */
export function tunnel(): THREE.Group {
  return cached("tunnel", () => {
    const b = new MeshBuilder();
    const wall = textured("tunnel-wall", () => new THREE.MeshStandardMaterial({ map: repeated(tunnelTileTexture(), "tunnel-wall", 6, 1), roughness: 0.35 }));
    for (const side of [-1, 1]) {
      b.panel(CHUNK, 7, wall, [side * 5.4, 3.5, -CHUNK / 2], [0, -side * Math.PI / 2, 0]);
      b.box(0.5, 0.6, CHUNK, { color: 0x3a3d48, finish: "matte" }, [side * 5.1, 0.3, -CHUNK / 2]);
      for (let z = -3; z > -CHUNK; z -= 7.5) {
        b.box(0.12, 0.3, 1.6, { color: 0xfff1c8, finish: "glow" }, [side * 5.3, 4.2, z]);
        b.box(0.2, 0.42, 1.8, { color: 0x2a2d35, finish: "satin" }, [side * 5.36, 4.2, z]);
      }
      b.box(0.1, 0.1, CHUNK, { color: 0xffb627, finish: "glow" }, [side * 5.33, 1.1, -CHUNK / 2]);
    }
    // The vault: a half tube laid along the track.
    const vault = new THREE.CylinderGeometry(5.5, 5.5, CHUNK, 20, 1, true, -Math.PI / 2, Math.PI);
    b.add(vault, { color: 0xb8b2a4, finish: "matte" }, [0, 7, -CHUNK / 2], [Math.PI / 2, 0, 0], [1, 1, 0.4]);
    for (let z = -2; z > -CHUNK; z -= 6) b.box(10.8, 0.25, 0.4, { color: 0x6a6d78, finish: "satin" }, [0, TUNNEL_TOP - 0.3, z]);
    // A strip of lamps along the crown lights the way.
    for (let z = -5; z > -CHUNK; z -= 10) b.box(0.5, 0.08, 3, { color: 0xfff4d6, finish: "glow" }, [0, TUNNEL_TOP - 0.05, z]);
    const inside = b.build("tunnel");
    // Backfaces show from inside, so the vault is drawn double sided.
    inside.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material) && (mesh.material as THREE.MeshStandardMaterial).vertexColors) {
        const own = (mesh.material as THREE.MeshStandardMaterial).clone();
        own.side = THREE.DoubleSide;
        own.userData.shared = true;
        mesh.material = own;
      }
    });
    return inside;
  });
}

/** The mouth of a tunnel, a brick portal facing the runner, at z = 0. */
export function portal(): THREE.Group {
  return cached("portal", () => {
    const b = new MeshBuilder();
    const brick = textured("portal-brick", () => new THREE.MeshStandardMaterial({ map: repeated(brickTexture(), "portal-brick", 5, 3), roughness: 0.85 }));
    const shape = new THREE.Shape();
    shape.moveTo(-16, 0);
    shape.lineTo(16, 0);
    shape.lineTo(16, 13);
    shape.lineTo(-16, 13);
    shape.lineTo(-16, 0);
    const hole = new THREE.Path();
    hole.moveTo(-5.4, 0);
    hole.lineTo(-5.4, 7);
    hole.absarc(0, 7, 5.4, Math.PI, 0, true);
    hole.lineTo(5.4, 0);
    hole.lineTo(-5.4, 0);
    shape.holes.push(hole);
    const face = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
    const uv = face.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 32, uv.getY(i) / 13);
    b.add(face, brick, [0, 0, -1.2]);
    b.box(33, 0.8, 1.8, { color: 0xb9b2a6, finish: "matte" }, [0, 13, -0.6]);
    b.box(3.2, 1.2, 0.4, { color: 0xffd21f, finish: "satin" }, [0, 11.2, 0.1], undefined, 0.1);
    return b.build("portal");
  });
}

let lampMaterial: THREE.SpriteMaterial | null = null;

/** A warm halo around a lamp, which reads as light in fog and tunnels. */
export function lampGlow(size = 2.4): THREE.Sprite {
  lampMaterial ??= new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe2a8, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
  lampMaterial.userData.shared = true;
  const sprite = new THREE.Sprite(lampMaterial);
  sprite.scale.setScalar(size);
  sprite.userData.sharedGeometry = true;
  return sprite;
}
