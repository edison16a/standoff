import { createMatch } from "../engine/match";
import type { Command, MatchState } from "../engine/types";
import { CHARACTER_IDS, type CharacterId } from "../roster";

/*
 * The move lab, a development aid for reviewing animation: one fighter
 * plays through every move, tapped and then charged, next to a sparring
 * partner who stands still and takes the hits. Opened with
 * /showcase/brawl-battle?view=poster&lab=samurai&at=seconds.
 */

interface Segment {
  name: string;
  frames: number;
  /** The command for each frame into the segment. */
  command: (i: number) => Command;
  /** Fills the ult meter first. */
  ult?: boolean;
  /** Stands the partner further off, so projectiles and dashes show their whole flight. */
  far?: boolean;
}

const WAIT = 50;
const none = (): Command => ({ x: 0, y: 0 });
const tap = (name: string, press: Partial<Command>, x = 0, y = 0): Segment => ({
  name,
  frames: WAIT,
  command: (i) => (i === 0 ? { x, y, ...press } : none()),
});
const aerial = (name: string, x: number, y: number): Segment => ({
  name,
  frames: WAIT + 20,
  command: (i) => (i === 0 ? { x: 0, y: 0, jump: true } : i === 10 ? { x, y, light: true } : none()),
});
const hold = (name: string, button: "light" | "heavy", x = 0, y = 0): Segment => ({
  name,
  frames: 150,
  far: true,
  command: (i) => {
    if (i >= 70) return none();
    const held = button === "light" ? { lightHeld: true } : { heavyHeld: true };
    // The stick picks the move on the press, then lets go so the fighter stays on the mark.
    return i === 0 ? { x, y, ...held, [button]: true } : { x: 0, y: 0, ...held };
  },
});

const SCRIPT: Segment[] = [
  { name: "idle", frames: 40, command: none },
  { name: "run", frames: 50, command: (i) => ({ x: i < 25 ? 1 : -1, y: 0 }) },
  { name: "jumps", frames: 90, command: (i) => ({ x: 0, y: 0, jump: i === 0 || i === 22 }) },
  tap("jab", { light: true }),
  tap("side", { light: true }, 1),
  tap("up", { light: true }, 0, 1),
  tap("down", { light: true }, 0, -1),
  aerial("air", 0, 0),
  aerial("airUp", 0, 1),
  aerial("airDown", 0, -1),
  tap("heavy", { heavy: true }),
  tap("heavySide", { heavy: true }, 1),
  { ...tap("heavyUp", { heavy: true }, 0, 1), frames: 110 },
  tap("heavyDown", { heavy: true }, 0, -1),
  hold("holdSide", "light", 1),
  hold("holdUp", "light", 0, 1),
  hold("holdDown", "light", 0, -1),
  hold("holdHeavy", "heavy", 1),
  hold("holdHeavyDown", "heavy", 0, -1),
  { ...tap("ult", { ult: true }), frames: 130, ult: true },
];

export interface Lab {
  match: MatchState;
  /** The segment names with the second each one starts, measured from the fight. */
  marks: { name: string; at: number }[];
  /** The phone command for the fighter under test on this step. */
  command(state: MatchState): Command;
}

export function isLabCharacter(value: string | null): value is CharacterId {
  return value !== null && (CHARACTER_IDS as readonly string[]).includes(value);
}

/** Two fighters on the Dojo Rooftop: the one under test on the left, a still partner in reach. */
export function makeLab(character: CharacterId): Lab {
  const partner: CharacterId = character === "bear" ? "karate" : "bear";
  const match = createMatch(
    [
      { character, seat: 0 },
      { character: partner, seat: 1 },
    ],
    { seed: 1, stage: "dojo-rooftop", stocks: 9 },
  );
  const starts: number[] = [];
  let total = 0;
  for (const s of SCRIPT) {
    starts.push(total);
    total += s.frames;
  }
  const marks = SCRIPT.map((s, i) => ({ name: s.name, at: starts[i]! / 60 }));
  return {
    match,
    marks,
    command(state) {
      if (state.phase !== "fight") return none();
      const frame = state.phaseFrame % total;
      const index = starts.findLastIndex((s) => s <= frame);
      const seg = SCRIPT[index]!;
      const i = frame - starts[index]!;
      if (i === 0) reset(state, seg);
      return seg.command(i);
    },
  };
}

/** Puts both fighters back on their marks between moves, standing and healed, so every move plays the same. */
function reset(state: MatchState, seg: Segment): void {
  const main = state.stage.surfaces[0]!;
  for (const [id, x, facing] of [[0, -1.6, 1], [1, seg.far ? 3.4 : 0.9, -1]] as const) {
    const who = state.fighters[id];
    if (!who || who.action === "dead" || who.action === "out" || who.action === "respawn") continue;
    Object.assign(who, { action: "idle", frame: 0, move: null, ground: 0, facing, hitstun: 0, freeze: 0, lag: 0, percent: 20, platform: null });
    who.pos = { x, y: main.top };
    who.vel = { x: 0, y: 0 };
    who.launch = { x: 0, y: 0 };
  }
  if (seg.ult && state.fighters[0]) state.fighters[0].ult = 1;
}
