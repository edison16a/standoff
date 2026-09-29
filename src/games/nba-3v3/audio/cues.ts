import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { MatchEvent } from "../engine/events";
import type { Match } from "../engine/match";
import type { ArenaSounds, Stab } from "./arena";
import type { Sfx } from "./sfx";

/** What the cues can reach: the floor's sounds, the arena's gear and the mixer. */
export interface CueKit {
  engine: AudioEngine;
  sfx: Sfx;
  arena: ArenaSounds;
  /** An organ stab, unless one played a moment ago. */
  stab(stab: Stab, key?: number): void;
}

/**
 * One match event to its sounds. The building's reaction is the organ
 * and the horns now, not a synthesised crowd, so the big moments get a
 * stab and everything else is the ball, the shoes and the iron.
 */
export function playCue(e: MatchEvent, m: Match, kit: CueKit): void {
  const { sfx, arena, engine } = kit;
  switch (e.type) {
    case "countdown":
      return sfx.countdown(e.count);
    case "go":
      sfx.go();
      return arena.gameHorn(false);
    case "bounce":
      // A computer's dribble sits back so a player can hear their own.
      return sfx.bounce(e.power, m.athletes[e.id]?.seat !== null ? 0.9 : 0.55);
    case "floor":
      return sfx.bounce(Math.min(1, e.power / 5), 1);
    case "squeak":
      return sfx.squeak(0.8);
    case "takeoff":
      return sfx.takeoff();
    case "land":
      return sfx.land(e.hard);
    case "rim":
      return sfx.rim(e.power);
    case "board":
      return sfx.board(e.power);
    case "net":
      return sfx.net(e.swish);
    case "dunk":
      sfx.slam(e.power);
      engine.duck("music", 0.3, 2.5);
      return kit.stab("rise", 62);
    case "score":
      if (e.points !== 3) return;
      engine.duck("music", 0.5, 1.8);
      return kit.stab("hit", 60);
    case "block":
      sfx.slap(1);
      return kit.stab("hit", 57);
    case "steal":
    case "intercept":
      return sfx.slap(0.6);
    case "whiff":
      return sfx.whoosh();
    case "pass":
      return sfx.pass();
    case "catch":
    case "rebound":
      return sfx.catch();
    case "knockdown":
      return sfx.board(0.6);
    case "violation":
      if (e.reason === "clock") return arena.shotClockBuzzer();
      return sfx.whistle();
    case "foul":
      return sfx.foulWhistle();
    case "andOne":
      return kit.stab("charge", 64);
    case "shake":
      return sfx.squeak(e.hard ? 1 : 0.6);
    case "fumble":
      return sfx.slap(0.4);
    case "onFire":
    case "gamePoint":
      return kit.stab("charge", 60);
    case "win":
      return arena.gameHorn(true);
    default:
      return;
  }
}
