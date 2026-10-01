"use client";
import { AimCalibrate } from "@/games/kit/aim/AimCalibrate";
import { playerColor } from "@/games/kit/players";
import { GunStep } from "./GunStep";
import { ReadyStep } from "./ReadyStep";
import { usePhone, usePhoneState } from "./session-context";
import { STEPS } from "./steps";

/** Setup on the phone: calibrate, pick a finish for the gun, then say ready. Each is its own page. */
export function SetupSteps() {
  const session = usePhone();
  const step = usePhoneState((state) => state.step);
  const colour = playerColor(session.seat);

  if (step === "calibrate") return <AimCalibrate aim={session.aim} colour={colour} steps={STEPS} onDone={() => session.goTo("gun")} />;
  if (step === "gun") return <GunStep />;
  return <ReadyStep />;
}
