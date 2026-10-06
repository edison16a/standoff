import { buildView } from "../engine/view";
import type { Shot } from "../render/camera/director";
import { frameFor } from "../render/camera/shots";
import type { MatchRenderer } from "../render/match-renderer";
import { makeFilm, stepFilm } from "./trailer-films";

/**
 * A development view of the live picture: the trailer's seeded match
 * played to second `t` and drawn by the broadcast director with the
 * match's own finish, as the host page draws it. `shot` picks another
 * camera (closeup, replay-kicker, replay-keeper, lobby); `film=ceremony`
 * plays the trophy lift instead. Reached with `?lab=tv` on the showcase.
 */
export function broadcastFrames(renderer: MatchRenderer, params: URLSearchParams): { frame: (now: number) => void; resized(): void } {
  const state = makeFilm(params.get("film") === "ceremony" ? "ceremony" : "match");
  const t = Number(params.get("t") ?? 10);
  const pick = params.get("shot") as Shot | null;
  // The bodies and the camera are played through the last two seconds at sixty frames a second, so they settle as they would live.
  while (state.time < t - 2) stepFilm(state);
  let clock = state.time * 1000;
  const draw = (only: boolean) => {
    const view = buildView(state);
    const framing = frameFor(view, { lobby: pick === "lobby" });
    const shot = pick ?? framing.shot;
    const focus = framing.focus ?? renderer.focusOn(view, 0);
    if (only) renderer.update(view, shot, clock, focus, framing.tags);
    else renderer.draw(view, shot, clock, focus, framing.tags);
  };
  while (state.time < t) {
    stepFilm(state);
    clock = state.time * 1000;
    draw(true);
  }
  return { frame: () => draw(false), resized: () => undefined };
}
