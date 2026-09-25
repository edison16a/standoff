import * as THREE from "three";
import { tunnelTileTexture } from "../art/scenery-art";
import { MeshBuilder } from "../mesh-builder";
import { brickTexture } from "../textures";
import type { Theme } from "../world/themes";
import { cached, CHUNK, glow, repeated, textured, TUNNEL_TOP } from "./track";

/** One chunk of tunnel: dark tiled walls, strips of neon along them and down the crown, a vault over all three tracks. */
export function tunnel(theme: Theme): THREE.Group {
  const [strip, crown] = theme.neon;
  return cached(`tunnel-${strip}-${crown}`, () => {
    const b = new MeshBuilder();
    const wall = textured("tunnel-wall", () => new THREE.MeshLambertMaterial({ map: repeated(tunnelTileTexture(), "tunnel-wall", 6, 1), color: 0x6a6480 }));
    for (const side of [-1, 1]) {
      b.panel(CHUNK, 7, wall, [side * 5.4, 3.5, -CHUNK / 2], [0, -side * Math.PI / 2, 0]);
      b.box(0.5, 0.6, CHUNK, { color: 0x1f1d2a, finish: "matte" }, [side * 5.1, 0.3, -CHUNK / 2]);
      // Two long tubes of light down each wall: what lights the way, and what a runner steers by.
      b.box(0.08, 0.08, CHUNK, glow(strip), [side * 5.3, 1.1, -CHUNK / 2]);
      b.box(0.08, 0.08, CHUNK, glow(crown), [side * 5.3, 4.2, -CHUNK / 2]);
    }
    // The vault: a half tube laid along the track.
    const vault = new THREE.CylinderGeometry(5.5, 5.5, CHUNK, 20, 1, true, -Math.PI / 2, Math.PI);
    b.add(vault, { color: 0x3a3548, finish: "matte" }, [0, 7, -CHUNK / 2], [Math.PI / 2, 0, 0], [1, 1, 0.4]);
    for (let z = -2; z > -CHUNK; z -= 6) {
      b.box(10.8, 0.25, 0.4, { color: 0x25222f, finish: "satin" }, [0, TUNNEL_TOP - 0.3, z]);
      b.box(10.2, 0.05, 0.05, glow(z % 12 === -2 ? strip : crown), [0, TUNNEL_TOP - 0.45, z + 0.2]);
    }
    const inside = b.build("tunnel");
    // Backfaces show from inside, so the vault is drawn double sided.
    inside.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh && !Array.isArray(mesh.material) && (mesh.material as THREE.MeshLambertMaterial).vertexColors && !(mesh.material instanceof THREE.MeshBasicMaterial)) {
        const own = (mesh.material as THREE.MeshLambertMaterial).clone();
        own.side = THREE.DoubleSide;
        own.userData.shared = true;
        mesh.material = own;
      }
    });
    return inside;
  });
}

/** The mouth of a tunnel, a dark brick portal facing the runner at z = 0, its arch traced in neon. */
export function portal(theme: Theme): THREE.Group {
  const [edge, sign] = theme.neon;
  return cached(`portal-${edge}-${sign}`, () => {
    const b = new MeshBuilder();
    const brick = textured("portal-brick", () => new THREE.MeshLambertMaterial({ map: repeated(brickTexture(), "portal-brick", 5, 3), color: 0x5a5068 }));
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
    b.box(33, 0.8, 1.8, { color: 0x2a2636, finish: "matte" }, [0, 13, -0.6]);
    // The arch and its jambs, outlined in light.
    b.add(new THREE.TorusGeometry(5.7, 0.1, 8, 40, Math.PI), glow(edge), [0, 7, 0.05]);
    for (const x of [-5.7, 5.7]) b.box(0.2, 7, 0.2, glow(edge), [x, 3.5, 0.05]);
    b.box(3.4, 1.2, 0.3, glow(sign), [0, 11.2, 0.1]);
    b.box(3.8, 1.5, 0.3, { color: 0x14121c, finish: "satin" }, [0, 11.2, -0.05]);
    return b.build("portal");
  });
}
