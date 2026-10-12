import type { WeaponId } from "../engine/weapons";

/**
 * Every moving part of a reload or a shot cycle, by name. The gun's
 * animation and its sound both read the same steps, so the magazine is
 * heard hitting home in the frame it is seen to.
 */
export type ActionStep =
  | "lift" // The gun comes up and rolls to show the magazine well or loading port.
  | "mag-release" // The release button or paddle is pressed.
  | "mag-out" // The empty magazine leaves the well.
  | "mag-drop" // It hits the ground.
  | "mag-in" // The fresh magazine enters the well.
  | "mag-seat" // It is slapped home and locks.
  | "bolt-back" // Charging handle, cocking handle or bolt pulled to the rear.
  | "bolt-forward" // Let go, it slams forward and chambers a round.
  | "bolt-catch" // The AR's bolt catch is struck and the held open bolt runs home.
  | "pump-back" // The shotgun's fore end pulled back, throwing out the hull.
  | "pump-forward" // Pushed forward again, chambering a shell.
  | "shell-in" // One shell thumbed through the loading port into the tube.
  | "settle"; // Back on aim.

export interface TimedStep {
  step: ActionStep;
  /** Seconds after the action starts. */
  at: number;
}

/**
 * When each step falls inside a magazine reload, as a share of the whole
 * reload. Real guns load differently, so each has its own rhythm:
 * the AR drops its magazine free and, if it ran dry, the bolt is held
 * open and only needs the catch struck; the AK's magazine is rocked out
 * and rocked in, and its handle is always racked; the SMG's cocking
 * handle is pulled back and slapped down.
 */
const MAGAZINE_RELOADS: Record<Exclude<WeaponId, "shotgun">, { full: readonly [ActionStep, number][]; empty: readonly [ActionStep, number][] }> = {
  rifle: {
    full: [["lift", 0], ["mag-release", 0.07], ["mag-out", 0.1], ["mag-drop", 0.3], ["mag-in", 0.55], ["mag-seat", 0.64], ["settle", 0.88]],
    empty: [["lift", 0], ["mag-release", 0.06], ["mag-out", 0.09], ["mag-drop", 0.28], ["mag-in", 0.5], ["mag-seat", 0.58], ["bolt-catch", 0.78], ["settle", 0.88]],
  },
  ak47: {
    full: [["lift", 0], ["mag-release", 0.08], ["mag-out", 0.14], ["mag-drop", 0.32], ["mag-in", 0.52], ["mag-seat", 0.62], ["settle", 0.9]],
    empty: [["lift", 0], ["mag-release", 0.06], ["mag-out", 0.11], ["mag-drop", 0.28], ["mag-in", 0.44], ["mag-seat", 0.53], ["bolt-back", 0.72], ["bolt-forward", 0.8], ["settle", 0.9]],
  },
  smg: {
    full: [["lift", 0], ["mag-release", 0.06], ["mag-out", 0.1], ["mag-drop", 0.32], ["mag-in", 0.52], ["mag-seat", 0.6], ["settle", 0.88]],
    // The cocking handle is locked back first, then the magazine, then slapped home.
    empty: [["lift", 0], ["bolt-back", 0.06], ["mag-release", 0.16], ["mag-out", 0.2], ["mag-drop", 0.38], ["mag-in", 0.54], ["mag-seat", 0.62], ["bolt-forward", 0.76], ["settle", 0.88]],
  },
};

/**
 * Every step of a magazine reload in seconds. `empty` is a reload from a
 * dry gun, which also has to chamber a round.
 */
export function magazineReload(weapon: Exclude<WeaponId, "shotgun">, seconds: number, empty: boolean): TimedStep[] {
  const plan = MAGAZINE_RELOADS[weapon][empty ? "empty" : "full"];
  return plan.map(([step, share]) => ({ step, at: share * seconds }));
}

/** The shotgun's opening, before the first shell: it comes up and over to show the loading port. */
export const SHOTGUN_LIFT = 0.35;

/**
 * Steps inside one shotgun shell load, relative to the moment the engine
 * counts the shell in. The thumb starts the shell into the port a little
 * before it is counted, and the last one is followed by a rack if the
 * chamber was empty.
 */
export function shellLoad(perShell: number): TimedStep[] {
  return [{ step: "shell-in", at: -perShell * 0.35 }];
}

/** The rack that ends a shotgun reload from empty, in seconds after the last shell. */
export function shotgunCloseOut(): TimedStep[] {
  return [
    { step: "pump-back", at: 0.12 },
    { step: "pump-forward", at: 0.3 },
    { step: "settle", at: 0.45 },
  ];
}

/**
 * What the gun does on its own after each shot. An automatic cycles its
 * bolt within a few thousandths of a second, so the case is out before
 * the next frame. The pump gun waits for the shooter to rack it.
 */
export function shotCycle(weapon: WeaponId): TimedStep[] {
  if (weapon === "shotgun") {
    return [
      { step: "pump-back", at: 0.2 },
      { step: "pump-forward", at: 0.38 },
    ];
  }
  return [
    { step: "bolt-back", at: 0 },
    { step: "bolt-forward", at: 1 / 120 },
  ];
}

/** When the spent case leaves the gun, in seconds after the shot. */
export function ejectDelay(weapon: WeaponId): number {
  return weapon === "shotgun" ? 0.22 : 0.004;
}

/** Whether a gun's bolt locks open on the last round, so a dry reload ends on the catch. */
export function holdsOpen(weapon: WeaponId): boolean {
  return weapon === "rifle";
}
