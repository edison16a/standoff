import * as THREE from "three";
import { KERB_WIDTH, type Track } from "../../engine/track";
import { roadTexture } from "../textures";
import type { Theme } from "../themes";
import { sweep, type ProfilePoint, type SweepOptions } from "./sweep";

/** Metres per kerb stripe. Short stripes flicker past at speed, which sells the pace. */
const STRIPE = 2;
const WALL_HEIGHT = 0.9;

/**
 * The road itself: tarmac with painted lines, striped kerbs, the run
 * off strip and the barriers, with the barriers left out where the map
 * has an open edge. On the floating space track, a thick glowing slab
 * underneath shows there is nothing below.
 */
export function buildRoad(track: Track, theme: Theme): THREE.Group {
  const group = new THREE.Group();
  const hw = track.halfWidth;
  const edge = track.edge;
  const inGap = (s: number) => track.inGap(s);
  // The studio reflection is for the karts; the road and barriers barely take it, or they wash out.
  const vertexLit = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide, envMapIntensity: 0.25 });

  const road = sweep(track, [{ d: -hw, y: 0.01 }, { d: hw, y: 0.01 }], { skip: inGap, uvLength: 16 });
  const tarmac = new THREE.MeshStandardMaterial({ map: roadTexture(theme), roughness: theme.floating ? 0.45 : 0.9, metalness: theme.floating ? 0.2 : 0, envMapIntensity: 0.12 });
  group.add(new THREE.Mesh(road, tarmac));

  const kerbColors = theme.kerb;
  const kerb = sweep(track, [{ d: hw, y: 0.03 }, { d: hw + KERB_WIDTH * 0.6, y: 0.08 }, { d: hw + KERB_WIDTH, y: 0.03 }], {
    skip: inGap,
    bothSides: true,
    color: (s) => kerbColors[Math.floor(s / STRIPE) % kerbColors.length]!,
  });
  group.add(new THREE.Mesh(kerb, vertexLit));

  const shoulder = sweep(track, [{ d: hw + KERB_WIDTH, y: 0.02 }, { d: edge, y: 0.02 }], {
    skip: inGap,
    bothSides: true,
    color: () => theme.shoulder,
  });
  group.add(new THREE.Mesh(shoulder, vertexLit));

  // Barriers and skirts are built one side at a time, since a map can leave just one side open.
  const perSide = (profile: ProfilePoint[], skip: (s: number, side: number) => boolean, options: Omit<SweepOptions, "skip" | "bothSides">) =>
    [1, -1].map((side) =>
      sweep(track, profile.map((p) => ({ ...p, d: p.d * side })), { ...options, skip: (s) => skip(s, side) }),
    );
  const walled = (s: number, side: number) => inGap(s) || !track.hasWall(s, side);
  const wallProfile: ProfilePoint[] = [
    { d: edge, y: -0.2 },
    { d: edge, y: WALL_HEIGHT },
    { d: edge + 0.45, y: WALL_HEIGHT },
    { d: edge + 0.45, y: -0.2 },
  ];
  // Alternate the inner face in blocks, like painted barrier sections.
  const wallColor = (s: number, i: number) => (i === 1 ? theme.wallTop : Math.floor(s / 6) % 2 === 0 ? theme.wall : shade(theme.wall, 0.82));
  const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  for (const wall of perSide(wallProfile, walled, { step: 2, color: wallColor })) group.add(new THREE.Mesh(wall, vertexLit));
  const lineProfile = [{ d: edge - 0.02, y: WALL_HEIGHT - 0.12 }, { d: edge - 0.02, y: WALL_HEIGHT - 0.02 }];
  for (const line of perSide(lineProfile, walled, { step: 2, color: () => theme.wallTop })) group.add(new THREE.Mesh(line, glowMat));

  // Skirts down the side where the edge drops away, under the ramps, and under a floating road.
  const depth = theme.floating ? 2.4 : 6;
  const bare = (s: number, side: number) =>
    inGap(s) || (!theme.floating && track.rampHeight(s) <= 0 && track.hasWall(s, side) && !nearGap(track, s));
  const skirtColor = () => (theme.floating ? "#2a2560" : shade(theme.shoulder, 0.7));
  for (const skirt of perSide([{ d: edge, y: 0 }, { d: edge, y: -depth, ramp: theme.floating }], bare, { color: skirtColor })) {
    group.add(new THREE.Mesh(skirt, vertexLit));
  }
  if (theme.floating) {
    const under = sweep(track, [{ d: edge + 0.45, y: -2.4 }, { d: -edge - 0.45, y: -2.4 }], { skip: inGap, step: 2, color: () => "#15123a" });
    group.add(new THREE.Mesh(under, vertexLit));
  }
  group.add(gapFaces(track, depth, vertexLit));
  return group;
}

function nearGap(track: Track, s: number): boolean {
  return track.gaps.some((gap) => track.forward(gap.start - 2, s) >= 0 && track.forward(gap.start - 2, s) <= gap.end - gap.start + 4);
}

/** Cliff faces at both ends of each gap, so the hole looks cut out of solid ground. */
function gapFaces(track: Track, depth: number, material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  for (const gap of track.gaps) {
    for (const s of [gap.start, gap.end]) {
      const f = track.frameAt(s);
      const top = f.y + track.rampHeight(s - 0.01);
      const face = new THREE.PlaneGeometry(track.edge * 2 + 0.9, top - (f.y - depth));
      const colors = new Float32Array(face.getAttribute("position").count * 3).fill(0.35);
      face.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mesh = new THREE.Mesh(face, material);
      mesh.position.set(f.x, (top + f.y - depth) / 2, f.z);
      mesh.rotation.y = Math.atan2(f.tx, f.tz);
      group.add(mesh);
    }
  }
  return group;
}

export function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return `#${c.getHexString()}`;
}
