import type { Seat } from "@/platform/protocol";
import { DEFAULT_FINISH, type FinishId } from "../render/models/finishes";
import type { SetupStep } from "../protocol";

/** What the host knows about one seat's setup, from what its phone told it. */
export interface SeatSetup {
  /** The setup page the phone is on, or null until it says. */
  step: SetupStep | null;
  finish: FinishId;
  ready: boolean;
}

export function freshSetup(): SeatSetup {
  return { step: null, finish: DEFAULT_FINISH, ready: false };
}

export interface LobbySeat extends SeatSetup {
  seat: Seat;
  connected: boolean;
}

/** Past calibration, so their aim means something and they can play. */
export function canPlay(seat: LobbySeat): boolean {
  return seat.connected && (seat.step === "gun" || seat.step === "ready");
}

/** Who plays if the round starts now: everyone connected who has calibrated. */
export function lineUp(seats: readonly LobbySeat[]): Seat[] {
  return seats.filter(canPlay).map((s) => s.seat);
}

/**
 * The round starts by itself once every connected phone says ready. One
 * player still calibrating holds it up, which is why the computer also
 * has a Start button.
 */
export function everyoneReady(seats: readonly LobbySeat[]): boolean {
  const here = seats.filter((s) => s.connected);
  return here.length > 0 && here.every((s) => s.ready && canPlay(s));
}

/** A short line for the lobby's start button, saying what it is waiting for. */
export function startHint(seats: readonly LobbySeat[]): string {
  const here = seats.filter((s) => s.connected);
  if (here.length === 0) return "Scan the code to join";
  if (lineUp(seats).length === 0) return "Waiting for a phone to calibrate";
  const waiting = here.filter((s) => !s.ready).length;
  return waiting === 0 ? "Everyone is ready" : `Waiting for ${waiting} to be ready`;
}
