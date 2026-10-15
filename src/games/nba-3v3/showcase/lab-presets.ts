import { RIM_SPOT } from "../engine/court";
import { pressJump } from "../engine/defend";
import type { Forced } from "../engine/finish/select";
import type { Match } from "../engine/match";
import { LAYUPS, type LayupKind } from "../engine/types";
import { dir2, type V2 } from "../engine/vec";
import type { DunkFail } from "../engine/finish/dunk-odds";
import { DUNK_STYLES, type DunkStyle } from "../roster";

/**
 * Lab scenes for the finishing presets, one per layup and one per dunk:
 * `?lab=layup-euro`, `?lab=dunk-twoHand` and so on. The driver runs at
 * the rim from a spot that suits the preset, a still defender stands
 * where the preset is meant to beat him, and the finish is set ahead,
 * so each can be stepped through frame by frame. Layups are the
 * Shooter's (id 0), dunks the Dunker's (id 1); the man to beat is the
 * Lockdown defender (id 3). The failed dunks (`dunkfail-stuff`,
 * `dunkfail-clang`, `dunkfail-short`) force the fail the same way.
 */
/**
 * Two slams that go wrong only at the rim: `slam-knocked`, a rim hang
 * judged to go down but knocked off line at the slam, which plays the
 * clang from there; and `slam-posterAir`, a poster on a man who left
 * his feet as the dunker took off, knocked down out of the air.
 */
export const SLAM_SCENES = ["slam-knocked", "slam-posterAir"] as const;
type SlamScene = (typeof SLAM_SCENES)[number];

export type PresetScene = `layup-${LayupKind}` | `dunk-${DunkStyle}` | `dunkfail-${DunkFail}` | SlamScene;
export const DUNK_FAIL_SCENES = ["dunkfail-stuff", "dunkfail-clang", "dunkfail-short"] as const satisfies readonly PresetScene[];
export const PRESET_SCENES: readonly PresetScene[] = [...LAYUPS.map((k) => `layup-${k}` as const), ...DUNK_STYLES.map((s) => `dunk-${s}` as const), ...DUNK_FAIL_SCENES, ...SLAM_SCENES];

interface Setup {
  /** Where the driver starts and runs toward; where the man stands, or nobody. */
  from: V2;
  toward: V2;
  man: V2 | null;
  /** Share of full speed, and how near the rim Shoot goes. */
  pace: number;
  at: number;
}

const FRONT: Setup = { from: { x: 0.4, z: 8.2 }, toward: RIM_SPOT, man: null, pace: 1, at: 3.0 };
const WING: Setup = { from: { x: 5.2, z: 6.2 }, toward: RIM_SPOT, man: null, pace: 1, at: 3.0 };

const LAYUP_SETUPS: Record<LayupKind, Setup> = {
  finger: { ...FRONT, man: { x: 0.2, z: 9.6 } },
  reverse: { from: { x: 5.2, z: 1.3 }, toward: { x: -3, z: 1.2 }, man: { x: 3.4, z: 2.6 }, pace: 1, at: 2.2 },
  euro: { ...FRONT, man: { x: 0.3, z: 2.4 }, at: 2.3 },
  upUnder: { ...FRONT, from: { x: 0.3, z: 5.4 }, man: { x: 0.15, z: 2.5 }, pace: 0.6, at: 2.3 },
  scoop: { ...WING, man: { x: -0.4, z: 3.2 } },
  teardrop: { ...FRONT, man: { x: 0, z: 2.1 }, at: 2.3 },
  glass: { ...WING, man: { x: 0, z: 2.1 }, at: 2.35 },
  wrongFoot: { ...FRONT, man: { x: 0.3, z: 9.2 } },
  spin: { ...WING, man: { x: 3.3, z: 3.4 }, pace: 0.8 },
  shield: { ...WING, man: { x: 2.9, z: 2.75 }, pace: 0.8 },
  power: { ...FRONT, from: { x: 0.3, z: 5.0 }, pace: 0.4, at: 2.0 },
  stepThrough: { ...WING, man: { x: 1.6, z: 1.9 }, at: 2.3 },
  hop: { ...FRONT, man: { x: 0.35, z: 2.1 }, pace: 0.8, at: 2.3 },
  juke: { ...FRONT, from: { x: 0.3, z: 5.4 }, man: { x: 0.15, z: 2.5 }, pace: 0.6, at: 2.3 },
};

/** The failed dunks: into the Lockdown defender waiting at the rim, a flat footed slam off the iron, and a leap from too far out. */
const FAIL_SETUPS: Record<DunkFail, Setup & { style: DunkStyle }> = {
  stuff: { ...FRONT, man: { x: 0.1, z: 2.0 }, at: 3.0, style: "twoHand" },
  clang: { ...FRONT, from: { x: 0.3, z: 5.0 }, pace: 0.45, at: 2.2, style: "flush" },
  short: { ...FRONT, at: 4.3, style: "twoHand" },
};

const DUNK_SETUPS: Partial<Record<DunkStyle, Setup>> = {
  reverse: { from: { x: 5.2, z: 1.6 }, toward: { x: -3, z: 1.4 }, man: null, pace: 1, at: 2.4 },
  windmill: { from: { x: 5.4, z: 2.4 }, toward: RIM_SPOT, man: null, pace: 1, at: 3.0 },
  poster: { ...FRONT, man: { x: 0, z: 2.3 }, at: 2.35 },
  putback: { ...FRONT, from: { x: 0.5, z: 3.2 }, pace: 0.2, at: 1.6 },
  jumpStop: { ...FRONT, from: { x: 0.3, z: 5.0 }, pace: 0.35, at: 2.4 },
};

export function presetSetup(scene: PresetScene): { setup: Setup; forced: Forced; driver: number; fail: DunkFail | null } {
  if (scene === "slam-knocked") return { setup: FRONT, forced: { dunk: "rimhang" }, driver: 1, fail: null };
  if (scene === "slam-posterAir") return { setup: DUNK_SETUPS.poster!, forced: { dunk: "poster" }, driver: 1, fail: null };
  if (scene.startsWith("dunkfail-")) {
    const fail = scene.slice(9) as DunkFail;
    const setup = FAIL_SETUPS[fail];
    return { setup, forced: { dunk: setup.style }, driver: 1, fail };
  }
  if (scene.startsWith("layup-")) {
    const kind = scene.slice(6) as LayupKind;
    return { setup: LAYUP_SETUPS[kind], forced: { layup: kind }, driver: 0, fail: null };
  }
  const style = scene.slice(5) as DunkStyle;
  return { setup: DUNK_SETUPS[style] ?? FRONT, forced: { dunk: style }, driver: 1, fail: null };
}

export function isPresetScene(scene: string): scene is PresetScene {
  return (PRESET_SCENES as readonly string[]).includes(scene);
}

/** The six at the start: the driver on his spot, the man to beat on his, everyone else well out of the way. */
export function presetSpots(scene: PresetScene): [number, number][] {
  const { setup, driver } = presetSetup(scene);
  const spots: [number, number][] = [[-6.5, 9], [6.5, 10.5], [-6, 11], [-5.5, 12], [-3, 12.5], [5, 12.5]];
  spots[driver] = [setup.from.x, setup.from.z];
  if (setup.man) spots[3] = [setup.man.x, setup.man.z];
  return spots;
}

/** Everyone stands still but the driver, who has the ball. */
export function setupPreset(scene: PresetScene, m: Match): void {
  const { driver } = presetSetup(scene);
  for (const a of m.athletes) a.auto = false;
  m.ball.holder = driver;
}

export function steerPreset(scene: PresetScene, m: Match, t: number, once: (key: string) => boolean): void {
  const { setup, forced, driver, fail } = presetSetup(scene);
  const a = m.athletes[driver]!;
  // The man stands still in the lab, so he is put up on the pump fake by hand, as a computer defender would go.
  const act = a.action;
  const fake = scene === "layup-upUnder" ? 0.45 : scene === "layup-juke" ? 0.42 : null;
  if (fake !== null && act.kind === "drive" && act.t >= act.takeoff * fake && once("bite")) pressJump(m, m.athletes[3]!);
  if (act.kind === "drive") slamCues(scene, m, act, once);
  if (a.action.kind === "drive" || m.ball.holder !== driver) {
    a.move = { x: 0, z: 0 };
    return;
  }
  const d = dir2(a, setup.toward);
  a.move = t < 0.3 ? { x: 0, z: 0 } : { x: d.x * setup.pace, z: d.z * setup.pace };
  const near = Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z);
  if (t > 0.6 && near < setup.at && once("finish")) {
    m.forced = "swish";
    m.forcedFinish = forced;
    m.forcedDunk = fail ?? "make";
    m.press(driver, "shoot");
  }
}

type Drive = Extract<Match["athletes"][number]["action"], { kind: "drive" }>;

/** The two slam scenes: the man leaves his feet as the dunker takes off, or the slam is put off line. */
function slamCues(scene: PresetScene, m: Match, act: Drive, once: (key: string) => boolean): void {
  if (scene === "slam-posterAir" && act.t >= act.takeoff - 0.2 && once("leap")) {
    // The lab holds every block back; this one is asked for.
    const man = m.athletes[3]!;
    man.blockCd = 0;
    pressJump(m, man);
  }
  // Knocked off line at the slam, as a hand in the way or a foul would: the ball rims out.
  if (scene === "slam-knocked" && act.t >= act.finish - 0.05 && once("knock")) m.forced = "rimOut";
}
