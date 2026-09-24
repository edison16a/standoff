import * as THREE from "three";
import { PAD_LENGTH, PAD_WIDTH, type BoostPad } from "../../engine/pickups";
import type { Track } from "../../engine/track";
import { arrowTexture, checkerTexture, chevronTexture, padTexture } from "../textures";
import type { Theme } from "../themes";
import { sweep } from "./sweep";

/** Bends tighter than this radius get chevron boards and a painted arrow. */
const SIGN_RADIUS = 55;

/** Puts a flat object on the road at (s, d), facing along the track. */
export function placeOnTrack(object: THREE.Object3D, track: Track, s: number, d: number, lift: number): void {
  const p = track.pointAt(s, d);
  const f = track.frameAt(s);
  object.position.set(p.x, p.y + lift, p.z);
  object.rotation.set(0, Math.atan2(f.tx, f.tz), 0);
}

interface Bend {
  start: number;
  end: number;
  dir: number;
}

/** Stretches of road that bend hard enough to need a warning, and which way. */
export function findBends(track: Track): Bend[] {
  const bends: Bend[] = [];
  let current: Bend | null = null;
  for (let s = 0; s < track.length; s += 2) {
    const bend = track.frameAt(s).bend;
    const sharp = Math.abs(bend) > 1 / SIGN_RADIUS;
    const dir = Math.sign(bend);
    if (sharp && current && current.dir === dir) current.end = s;
    else if (sharp) {
      current = { start: s, end: s, dir };
      bends.push(current);
    } else current = null;
  }
  return bends.filter((b) => b.end - b.start >= 6);
}

/**
 * Everything painted on or stood beside the road to make it readable:
 * the chequered line and grid boxes, chevron boards on the outside of
 * every tight bend, arrows painted before them, striped ramps and the
 * glowing boost pads. Returns an update for the pads' rushing chevrons.
 */
export function buildMarkings(track: Track, theme: Theme, pads: readonly BoostPad[]): { group: THREE.Group; update(time: number): void } {
  const group = new THREE.Group();
  const flatDecal = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

  const line = new THREE.Mesh(new THREE.PlaneGeometry(track.halfWidth * 2, 2.4), flatDecal(checkerTexture()));
  line.geometry.rotateX(-Math.PI / 2);
  placeOnTrack(line, track, 0, 0, 0.02);
  group.add(line);
  const slot = new THREE.PlaneGeometry(3.2, 0.25).rotateX(-Math.PI / 2);
  const white = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.85, depthWrite: false });
  for (let i = 0; i < 8; i++) {
    const mark = new THREE.Mesh(slot, white);
    placeOnTrack(mark, track, track.wrap(-7 - Math.floor(i / 2) * 7.5 - (i % 2) * 2 + 1.6), (i % 2 ? 1 : -1) * track.halfWidth * 0.42, 0.02);
    group.add(mark);
  }

  const boardGeo = new THREE.PlaneGeometry(2.6, 1.3);
  const boardMat = new THREE.MeshBasicMaterial({ map: chevronTexture(theme), side: THREE.DoubleSide });
  const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6);
  const postMat = new THREE.MeshStandardMaterial({ color: "#d8d8e0" });
  const arrowMat = flatDecal(arrowTexture(theme.line));
  const arrowGeo = new THREE.PlaneGeometry(3.4, 6.8).rotateX(-Math.PI / 2);
  for (const bend of findBends(track)) {
    for (let s = bend.start; s <= bend.end + 4; s += 9) {
      if (!track.hasWall(s) || track.inGap(s)) continue;
      const outside = -bend.dir;
      const board = new THREE.Mesh(boardGeo, boardMat);
      const p = track.pointAt(s, outside * (track.edge + 0.25));
      const f = track.frameAt(s);
      board.position.set(p.x, p.y + 1.75, p.z);
      // Face the drivers coming toward it, turned a little toward the road.
      board.rotation.set(0, Math.atan2(-f.tx, -f.tz) + outside * 0.35, 0);
      // The texture points right, so mirror it for left hand bends.
      board.scale.x = bend.dir > 0 ? 1 : -1;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(p.x, p.y + 0.9, p.z);
      group.add(board, post);
    }
    const before = track.wrap(bend.start - 24);
    if (track.inGap(before) || track.rampHeight(before) > 0) continue;
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    placeOnTrack(arrow, track, before, 0, 0.025);
    arrow.scale.x = bend.dir > 0 ? 1 : -1;
    group.add(arrow);
  }

  for (const ramp of track.ramps) {
    const stripes = sweep(track, [{ d: -track.halfWidth, y: 0.04 }, { d: track.halfWidth, y: 0.04 }], {
      step: 0.75,
      skip: (s) => track.rampHeight(s) <= 0.02 || track.forward(ramp.start, s) < 0,
      color: (s) => (Math.floor(s / 1.5) % 2 === 0 ? theme.pad : "#ffffff"),
    });
    group.add(new THREE.Mesh(stripes, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 })));
  }

  const padMap = padTexture(theme.pad);
  padMap.repeat.set(1, 2);
  const padMat = new THREE.MeshBasicMaterial({ map: padMap, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const padGeo = new THREE.PlaneGeometry(PAD_WIDTH, PAD_LENGTH).rotateX(-Math.PI / 2);
  for (const pad of pads) {
    const mesh = new THREE.Mesh(padGeo, padMat);
    placeOnTrack(mesh, track, pad.s, pad.d, 0.05);
    group.add(mesh);
  }
  return {
    group,
    update(time: number) {
      padMap.offset.y = -time * 1.6;
    },
  };
}
