import * as THREE from "three";
import { stationSignTexture, tunnelTileTexture } from "../art/scenery-art";
import { MeshBuilder } from "../mesh-builder";
import { prefab, repeated, textured } from "../prefabs";
import { brickTexture } from "../textures";
import { toon } from "../toon";
import { TUNNEL_TOP, VAULT_HALF, VAULT_SPRING } from "./overhead";
import { CHUNK, glow, lampGlow } from "./track";

const LAMP = 0xffd98a;

/** One chunk of tunnel: tiled walls with a coloured band, cables, warm lamps in cages and a vault over all three tracks. */
export function tunnel(): THREE.Group {
  return prefab("tunnel", () => {
    const b = new MeshBuilder();
    const wall = textured("tunnel-wall", () => toon({ map: repeated(tunnelTileTexture(), "tunnel-wall", 6, 1), side: THREE.DoubleSide }));
    const vault = textured("tunnel-vault", () => toon({ color: 0x8a8378, side: THREE.DoubleSide }));
    for (const side of [-1, 1]) {
      b.panel(CHUNK, 7, wall, [side * 5.4, 3.5, -CHUNK / 2], [0, (-side * Math.PI) / 2, 0]);
      b.box(0.5, 0.6, CHUNK, { color: 0x9a948a, finish: "matte" }, [side * 5.1, 0.3, -CHUNK / 2]);
      // A bundle of cables along each wall, and lamps in cages every few metres.
      for (const y of [4.6, 4.8, 5.0]) b.tube(0.05, CHUNK, { color: y === 4.8 ? 0x3b3f4a : 0x23252c, finish: "satin" }, [side * 5.3, y, -CHUNK / 2], 6);
      for (let z = -3; z > -CHUNK; z -= 7.5) {
        b.box(0.2, 0.5, 0.7, { color: 0x3b3f4a, finish: "metal" }, [side * 5.28, 3.6, z], undefined, 0.05);
        b.box(0.1, 0.34, 0.54, glow(LAMP), [side * 5.2, 3.6, z]);
      }
    }
    b.add(vaultGeometry(), vault);
    for (let z = -2; z > -CHUNK; z -= 6) b.box(10.8, 0.3, 0.45, { color: 0x6e685f, finish: "matte" }, [0, TUNNEL_TOP - 0.3, z]);
    const inside = b.build("tunnel");
    for (let z = -3; z > -CHUNK; z -= 7.5) {
      for (const side of [-1, 1]) {
        const halo = lampGlow(2.4, LAMP, 0.45);
        halo.position.set(side * 5.05, 3.6, z);
        inside.add(halo);
      }
    }
    return inside;
  });
}

/**
 * The vault over one chunk: a half tube laid along the track, arching up
 * from the tops of the walls to the crown. Turned the other way it hung
 * down into the space over the trains and walled in a runner on a roof.
 */
export function vaultGeometry(): THREE.BufferGeometry {
  const vault = new THREE.CylinderGeometry(VAULT_HALF, VAULT_HALF, CHUNK, 20, 1, true, -Math.PI / 2, Math.PI);
  const rise = (TUNNEL_TOP - VAULT_SPRING) / VAULT_HALF;
  const place = new THREE.Matrix4().compose(
    new THREE.Vector3(0, VAULT_SPRING, -CHUNK / 2),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
    new THREE.Vector3(1, 1, rise),
  );
  return vault.applyMatrix4(place);
}

/** The mouth of a tunnel: a red brick portal facing the runner at z = 0, a stone arch round the opening and a name plate. */
export function portal(): THREE.Group {
  return prefab("portal", () => {
    const b = new MeshBuilder();
    const brick = textured("portal-brick", () => toon({ map: repeated(brickTexture(), "portal-brick", 5, 3) }));
    const shape = new THREE.Shape();
    shape.moveTo(-16, 0);
    shape.lineTo(16, 0);
    shape.lineTo(16, 13);
    shape.lineTo(-16, 13);
    shape.lineTo(-16, 0);
    const hole = new THREE.Path();
    // The opening follows the vault behind it, so no sky shows between the arch and the roof.
    const rise = TUNNEL_TOP - VAULT_SPRING;
    hole.moveTo(-VAULT_HALF, 0);
    hole.lineTo(-VAULT_HALF, VAULT_SPRING);
    hole.absellipse(0, VAULT_SPRING, VAULT_HALF, rise, Math.PI, 0, true, 0);
    hole.lineTo(VAULT_HALF, 0);
    hole.lineTo(-VAULT_HALF, 0);
    shape.holes.push(hole);
    const face = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
    const uv = face.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 32, uv.getY(i) / 13);
    b.add(face, brick, [0, 0, -1.2]);
    const stone = { color: 0xd8cfbf, finish: "matte" as const };
    b.outline(0.05);
    b.box(33, 0.8, 1.8, stone, [0, 13, -0.6]);
    b.add(new THREE.TorusGeometry(VAULT_HALF + 0.35, 0.35, 8, 40, Math.PI), stone, [0, VAULT_SPRING, 0.05], [0, 0, 0], [1, (rise + 0.35) / (VAULT_HALF + 0.35), 1]);
    for (const x of [-1, 1]) b.box(0.7, VAULT_SPRING, 0.5, stone, [x * (VAULT_HALF + 0.35), VAULT_SPRING / 2, 0.05]);
    b.box(5.4, 1.3, 0.3, { color: 0x1f6fd6, finish: "satin" }, [0, 11.4, 0.1], undefined, 0.1);
    b.outline(0);
    const plate = textured("tunnel-plate", () => toon({ map: stationSignTexture("CITY LINE") }));
    b.panel(5, 0.94, plate, [0, 11.4, 0.27]);
    return b.build("portal");
  });
}
