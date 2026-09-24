import { playerColor } from "@/games/kit/players";
import { CHARACTERS } from "../characters";
import type { Kart } from "../engine/kart";
import { driftTier } from "../engine/drive";
import { currentLap } from "../engine/race";
import { RACE } from "../engine/tuning";
import type { RaceWorld } from "../engine/world";
import type { EffectKind, Phase, PhoneState } from "../protocol";
import type { TrackId } from "../tracks";
import type { StandingRow, ViewHud } from "./host-store";

/** The one effect worth showing, most urgent first. */
export function effectOf(kart: Kart): EffectKind | null {
  const t = kart.timers;
  if (t.stun > 0) return "stun";
  if (t.ice > 0) return "ice";
  if (t.ghost > 0) return "ghost";
  if (t.shield > 0) return "shield";
  if (t.boost > 0) return "boost";
  return null;
}

/** A kart's colour everywhere: the player's seat colour, or its paint for a computer. */
export function kartColor(kart: Kart): string {
  return kart.seat !== null ? playerColor(kart.seat) : CHARACTERS[kart.character].color;
}

export function kartName(kart: Kart, names: ReadonlyMap<number, string>): string {
  return kart.seat !== null ? (names.get(kart.seat) ?? `Player ${kart.seat}`) : CHARACTERS[kart.character].name;
}

export function buildStandings(world: RaceWorld, names: ReadonlyMap<number, string>): StandingRow[] {
  return world.standings.map((kart) => ({
    kartId: kart.id,
    name: kartName(kart, names),
    color: kartColor(kart),
    character: kart.character,
    place: kart.race.place,
    lap: currentLap(kart),
    finished: kart.race.finished,
    time: kart.race.finishTime,
    computer: kart.seat === null,
  }));
}

export function buildView(world: RaceWorld, kart: Kart, names: ReadonlyMap<number, string>, banner: string | null): ViewHud {
  return {
    seat: kart.seat ?? 0,
    kartId: kart.id,
    name: kartName(kart, names),
    color: kartColor(kart),
    place: kart.race.place,
    lap: currentLap(kart),
    item: kart.item,
    rolling: kart.item !== null && world.time < kart.itemReadyAt,
    wrongWay: kart.race.wrongWay,
    finished: kart.race.finished,
    effect: effectOf(kart),
    banner,
    away: kart.autopilot,
  };
}

export interface PhoneContext {
  phase: Phase;
  map: TrackId;
  taken: PhoneState["taken"];
  pick: PhoneState["pick"];
  ready: boolean;
  world: RaceWorld | null;
  kart: Kart | null;
  countdown: number | null;
}

/** One phone's screen state. A phone with no kart in this race gets the lobby fields only. */
export function buildPhoneState(c: PhoneContext): PhoneState {
  const kart = c.kart;
  return {
    kind: "state",
    phase: c.phase,
    map: c.map,
    taken: c.taken,
    pick: c.pick,
    ready: c.ready,
    racing: kart !== null && c.phase !== "lobby",
    countdown: c.countdown,
    place: kart ? kart.race.place : null,
    karts: c.world?.karts.length ?? 0,
    lap: kart ? currentLap(kart) : 0,
    laps: RACE.laps,
    item: kart?.item ?? null,
    rolling: kart !== null && c.world !== null && kart.item !== null && c.world.time < kart.itemReadyAt,
    wrongWay: kart?.race.wrongWay ?? false,
    finished: kart?.race.finished ?? false,
    effect: kart ? effectOf(kart) : null,
    // Rounded, so the surge's slow climb is a handful of messages rather than one a frame.
    surge: kart ? Math.round(kart.surge * 10) / 10 : 0,
    drift: kart && kart.drift !== 0 ? driftTier(kart.driftTime) : null,
  };
}
