import * as THREE from "three";
import type { Ceremony } from "../engine/ceremony";
import type { Match } from "../engine/match";
import type { TvCamera } from "../render/tv-camera";
import { DUNK_STYLES, type DunkStyle } from "../roster";
import { BotFilm } from "./bot-film";
import { LAB_SCENES, LabFilm, type LabScene } from "./lab";
import { CeremonyFilm } from "./lab-ceremony";
import { LineupFilm } from "./lab-lineup";

declare global {
  interface Window {
    /** Development only: steps the film on by `frames` filmed frames and draws the last. */
    __nbaStep?: (frames?: number) => void;
  }
}

/** A film the director can play: the highlight, a computer game, or a lab scene. */
export interface Film {
  readonly match: Match;
  steer(t: number): void;
  slowFor(e: import("../engine/events").MatchEvent): { scale: number; seconds: number } | null;
  /** The trophy ceremony, for a film of it: it is stepped in place of the match. */
  readonly ceremony?: Ceremony;
  stepCeremony?(dt: number): void;
}

/**
 * The development aids read from the address: `?bots=seed` films a
 * computer game, `?lab=scene&style=dunk` a lab scene (`?lab=ceremony` the trophy ceremony), `?step=1` hands
 * the clock to `window.__nbaStep` for frame by frame review, and
 * `?follow=id,angle,dist,height` keeps a close camera on one player,
 * looking at chest height unless a height is given. `?lab=lineup` stands
 * all six builds in a row for close looks at the models.
 */
export interface DevOptions {
  film: Film | null;
  step: boolean;
  follow: { id: number; angle: number; dist: number; height: number | null } | null;
}

export function readDev(params: URLSearchParams): DevOptions {
  const bots = params.get("bots");
  const lab = params.get("lab") as LabScene | null;
  const style = params.get("style") as DunkStyle | null;
  let film: Film | null = null;
  if (params.get("lab") === "ceremony") film = new CeremonyFilm();
  else if (params.get("lab") === "lineup") film = new LineupFilm();
  else if (lab && LAB_SCENES.includes(lab)) film = new LabFilm(lab, style && DUNK_STYLES.includes(style) ? style : null);
  else if (bots !== null) film = new BotFilm(Number(bots) || 1);
  const f = params.get("follow");
  let follow: DevOptions["follow"] = null;
  if (f) {
    const [id = 0, angle = 90, dist = 4, height] = f.split(",").map(Number);
    follow = { id, angle: (angle * Math.PI) / 180, dist, height: height ?? null };
  }
  return { film, step: params.get("step") === "1", follow };
}

/** Points the camera at a player from a fixed compass `angle` (0 from the camera's end, 180 from the baseline), chest high. */
export function followCamera(tv: TvCamera, m: Match, follow: NonNullable<DevOptions["follow"]>): void {
  const a = m.athletes[follow.id];
  if (!a) return;
  const yaw = follow.angle;
  const h = follow.height;
  const look = new THREE.Vector3(a.x, (h ?? 1.05) + a.y * 0.8, a.z);
  const pos = new THREE.Vector3(a.x + Math.sin(yaw) * follow.dist, h ?? 1.5, a.z + Math.cos(yaw) * follow.dist);
  tv.fixed = { pos, look, fov: 40 };
}
