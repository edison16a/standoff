import { RIM_SPOT } from "../engine/court";
import type { Match } from "../engine/match";
import { GREEN_MS, goldHalfMs } from "../engine/shot-model";
import { PRESETS, isMakePreset, type ShotPreset } from "../engine/shot-outcome/presets";
import { dir2 } from "../engine/vec";

/**
 * Lab scenes for the shot endings, one per preset: `?lab=shot-swish`,
 * `shot-bank`, `shot-rollIn` and so on. The Shooter rises from the wing
 * with nobody near and the ending is set ahead, so each one can be
 * stepped through frame by frame against the rim, the glass and the
 * net. The two toilet bowls are close layups off a drive, the way they
 * mostly come in a game, with a defender standing near enough that the
 * Shooter lays it up rather than dunking.
 */
export type ShotScene = `shot-${ShotPreset}`;
export const SHOT_SCENES: readonly ShotScene[] = PRESETS.map((p) => `shot-${p}` as const);

const SHOOTER = 0;
const DRIVES: readonly ShotPreset[] = ["rollIn", "rollOut"];
/** Banks and misses off the glass go up from the 45 degree spot; everything else from the right wing. */
const GLASS: readonly ShotPreset[] = ["bank", "glassOut"];

/**
 * How long Shoot is held, so the meter agrees with the ending: gold for
 * the swish, a green just off the gold for the other makes, a little
 * late for the misses and early for the airball that falls short.
 */
function heldFor(p: ShotPreset): number {
  if (p === "swish") return GREEN_MS;
  if (isMakePreset(p)) return GREEN_MS + goldHalfMs(10) + 3;
  return p === "airball" ? GREEN_MS - 260 : GREEN_MS + 150;
}

function presetOf(scene: ShotScene): ShotPreset {
  return scene.slice("shot-".length) as ShotPreset;
}

function spotsFor(p: ShotPreset): [number, number][] {
  const shooter: [number, number] = DRIVES.includes(p) ? [1.2, 7.6] : GLASS.includes(p) ? [3.1, 4.6] : [2.6, 5.6];
  // The near man stands off the line of the drive, close but not in the way.
  const near: [number, number] = DRIVES.includes(p) ? [-1.0, 3.6] : [-6, 10];
  return [shooter, [-6.5, 9], [6.5, 10.5], near, [-3, 11.5], [5, 12]];
}

export const SHOT_SPOTS = Object.fromEntries(PRESETS.map((p) => [`shot-${p}`, spotsFor(p)])) as Record<ShotScene, [number, number][]>;

export function isShotScene(scene: string): scene is ShotScene {
  return (SHOT_SCENES as readonly string[]).includes(scene);
}

/** Everyone but the Shooter stands still, so nothing gets in the way of the ball. */
export function setupShot(m: Match): void {
  for (const a of m.athletes) a.auto = false;
}

export function steerShot(scene: ShotScene, m: Match, t: number, once: (key: string) => boolean): void {
  const p = presetOf(scene);
  const a = m.athletes[SHOOTER]!;
  if (!DRIVES.includes(p)) {
    if (t > 0.5 && once("shoot")) {
      m.forced = p;
      m.press(SHOOTER, "shoot");
    }
    const held = heldFor(p);
    if (t > 0.5 + held / 1000 && once("release")) m.release(SHOOTER, held);
    return;
  }
  if (a.action.kind === "drive" || m.ball.holder !== SHOOTER) {
    a.move = { x: 0, z: 0 };
    return;
  }
  const d = dir2(a, RIM_SPOT);
  a.move = { x: d.x, z: d.z };
  if (t > 0.4 && Math.hypot(a.x - RIM_SPOT.x, a.z - RIM_SPOT.z) < 2.7 && once("finish")) {
    m.forced = p;
    m.press(SHOOTER, "shoot");
  }
}
