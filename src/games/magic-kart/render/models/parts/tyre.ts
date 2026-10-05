import type * as THREE from "three";
import type { CharacterId } from "../../../characters";
import { atlasUv, REGIONS, sidewallRegion, WHITE_UV, type Region } from "../kit/atlas-layout";
import { part } from "../kit/part";
import { revolve, type Ring } from "../kit/revolve";

export type Tread = "race" | "knobby" | "rib";

export interface TyreStyle {
  radius: number;
  width: number;
  tread: Tread;
  /** Whose sidewall lettering it wears. */
  sidewall: CharacterId;
  /** Fat rounded buggy and bubble car tyres instead of square shouldered slicks. */
  balloon?: boolean;
  /** Where the rim's bead sits, as a share of the radius. */
  bead: number;
}

const TREADS: Record<Tread, Region> = { race: REGIONS.treadRace, knobby: REGIONS.treadKnobby, rib: REGIONS.treadRib };
const SEGMENTS = 48;
/** Quads round the tyre per tread tile. */
const PER_TILE = 4;

/**
 * A tyre with its axle along x: a crown wearing a tread that repeats
 * round it, and sidewalls with the maker's lettering, shaped from a cross
 * section so the shoulders bulge like real rubber.
 */
export function buildTyre(s: TyreStyle): THREE.BufferGeometry[] {
  const R = s.radius;
  const hw = s.width / 2;
  const inner = R * s.bead;
  const shoulder = s.balloon ? 0.82 : 0.9;
  // Outer sidewall from the bead out to the shoulder, with a slight bulge.
  const wall = (side: number): Ring[] => [
    { r: inner, x: side * hw * 0.84 },
    { r: inner + (R - inner) * 0.3, x: side * hw * 0.97 },
    { r: inner + (R - inner) * 0.65, x: side * hw },
    { r: R * shoulder, x: side * hw * (s.balloon ? 0.97 : 0.98) },
  ];
  const crown: Ring[] = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    // A rounded crown: square shouldered on a slick, round on a balloon.
    const t = i / steps;
    const x = hw * (1 - 2 * t) * (s.balloon ? 0.97 : 0.98);
    const k = Math.abs(1 - 2 * t);
    const drop = s.balloon ? Math.pow(k, 2.2) * (R - R * shoulder) : Math.pow(k, 8) * (R - R * shoulder);
    crown.push({ r: R - drop, x });
  }
  const outer = wall(1);
  const sideUv = (region: Region) => (_quad: number, _end: number, _along: number, angle: number, ring: Ring): [number, number] =>
    atlasUv(region, 0.5 + (Math.cos(angle) * ring.r) / (2 * R), 0.5 + (Math.sin(angle) * ring.r) / (2 * R));
  const tread = TREADS[s.tread];
  return [
    part(revolve(outer, SEGMENTS, sideUv(sidewallRegion(s.sidewall))), "#ffffff", { finish: "rubber", atlas: true }),
    part(revolve(crown, SEGMENTS, (quad, end, along) => atlasUv(tread, ((quad % PER_TILE) + end) / PER_TILE, along)), "#ffffff", { finish: "rubber", atlas: true }),
    part(revolve([...wall(-1)].reverse(), SEGMENTS, () => WHITE_UV), "#26262b", { finish: "rubber" }),
  ];
}
