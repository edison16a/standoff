import type { BuildId } from "../builds";
import type { BlockKind } from "./block-preset";
import type { CatchKind, CatchResult } from "./catch-preset";
import type { ApproachKind, TackleKind } from "./tackle-preset";
import type { ThrowKind } from "./throw-preset";
import type { Athlete, ActionKind, DownCause, JukeKind, Role, TackleBind, TeamId } from "./types";

/**
 * One player in a still of the match: plain numbers, no references
 * back into the simulation, so a replay is just stills played back.
 */
export interface AthleteView {
  id: number;
  team: TeamId;
  role: Role;
  /** Where in the role he lines up: a support player's slot sets his job. */
  slot: number;
  build: BuildId | null;
  number: number;
  /** The phone steering this player now, for its ring; null for the computer. Moves with a pass to a computer teammate. */
  seat: number | null;
  x: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  speed: number;
  /** Acceleration on the ground: the body leans into it, and a hard one is a planted foot. */
  ax: number;
  az: number;
  /** Seconds left of shaky footing after a jolt or a broken tackle. */
  stagger: number;
  /** How fresh his legs are, 1 to 0 (stamina.ts), for the strip on a phone player's tag. */
  stamina: number;
  action: ActionKind;
  actionT: number;
  actionDur: number;
  juke: JukeKind | null;
  /** Which way a juke or side step goes, 1 left of the run and -1 right. */
  side: 1 | -1;
  /** Seconds a juke pushes off its planted foot, 0 outside a juke: the drawing keeps that foot still. */
  plant: number;
  /** A throw that is the soft pitch to the back on a run call, not a pass. */
  lob: boolean;
  /** The throwing motion of a forward pass while it plays (throw-preset.ts), null otherwise. */
  throwKind: ThrowKind | null;
  /** Why a player is on the ground, while they are: a tackled carrier lands differently from a diver. */
  downCause: DownCause | null;
  /** The tackle preset a lunge was picked as, while lunging. */
  lunge: ApproachKind | null;
  /** The tackle preset this man is part of while he is down in one, and his part in it. */
  tackle: { kind: TackleKind; role: TackleBind["role"]; side: 1 | -1; prone: boolean } | null;
  /**
   * His move for a pass coming down (catch-preset.ts): seconds into it, seconds from its start to the
   * ball in his hands, the side it comes in on, how high, and how it finished with seconds since.
   */
  catching: { kind: CatchKind; t: number; at: number; side: 1 | -1; height: number; result: CatchResult | null; since: number } | null;
  /** A lineman's block move, seconds into it, and whether he is the blocker (offense) or the rusher. */
  block: { kind: BlockKind; t: number; offense: boolean } | null;
  /** Fooled by a juke: seconds into the stumble and which way he lurches. */
  stumble: { t: number; dur: number; side: 1 | -1 } | null;
  spike: boolean;
  hasBall: boolean;
  /** The throw stick is on this receiver: light up the ring under them. */
  targeted: boolean;
  guarding: number | null;
  rushing: boolean;
  /** In contact with an opposing lineman; for a lineman, locked up with the one across. */
  blocked: boolean;
  /** At the trophy presentation: the one lifting it, a team mate, or one of the beaten side. */
  ceremony: "captain" | "mate" | "beaten" | null;
}

/** The still of one player. */
export function athleteView(a: Athlete, hasBall: boolean, targeted: boolean, ceremony: AthleteView["ceremony"]): AthleteView {
  const act = a.action;
  return {
    id: a.id, team: a.team, role: a.role, slot: a.slot, build: a.build, number: a.number, seat: a.auto ? null : a.pilot,
    x: a.x, z: a.z, yaw: a.yaw, vx: a.vx, vz: a.vz, speed: Math.hypot(a.vx, a.vz), ax: a.ax, az: a.az, stagger: a.stagger, stamina: a.stamina,
    action: act.kind, actionT: "t" in act ? act.t : 0, actionDur: "dur" in act ? act.dur : 0,
    juke: act.kind === "juke" ? act.juke : null, side: act.kind === "juke" ? act.side : 1,
    plant: act.kind === "juke" ? act.plant : 0, lob: act.kind === "throw" && act.lob,
    throwKind: act.kind === "throw" && !act.lob ? act.style : null,
    downCause: act.kind === "down" ? act.cause : null,
    lunge: act.kind === "lunge" ? act.approach : null,
    tackle: act.kind === "down" && act.bind ? { kind: act.bind.kind, role: act.bind.role, side: act.bind.side, prone: !!act.bind.prone } : null,
    catching: a.catching && { kind: a.catching.kind, t: a.catching.t, at: a.catching.at, side: a.catching.side, height: a.catching.height, result: a.catching.result, since: a.catching.since },
    block: a.block && { ...a.block },
    stumble: a.stumble && { ...a.stumble },
    spike: act.kind === "celebrate" && act.spike,
    hasBall, targeted, guarding: a.guard, rushing: a.rushT > 0, blocked: a.blocked > 0, ceremony,
  };
}
