"use client";
import { usePhoneStore } from "../phone-store";
import { PlayPad } from "./PlayPad";
import { SetupSteps } from "./SetupSteps";

/**
 * Zombie Survival on the phone: the three setup pages, then the trigger
 * pad once this player is in the run. A phone that rejoins mid run, or a
 * player arriving late, goes through setup and then drops straight in.
 */
export function PhoneScreen() {
  const seat = usePhoneStore((s) => s.seat);
  const state = usePhoneStore((s) => s.state);
  const calibrated = usePhoneStore((s) => s.calibrated);
  if (!seat) return null;
  const mine = state?.seats[seat - 1];
  const inRun = state !== null && state.phase !== "lobby" && mine?.playing === true && calibrated;
  return <div className="zs-phone">{inRun ? <PlayPad seat={seat} /> : <SetupSteps seat={seat} />}</div>;
}
