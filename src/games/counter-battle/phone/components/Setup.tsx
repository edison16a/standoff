"use client";
import { AimCalibrate } from "@/games/kit/aim/AimCalibrate";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { GUNS } from "../../engine/guns";
import { STEPS, usePhoneStore } from "../phone-store";
import { GunStep } from "./GunStep";
import { ReadyStep } from "./ReadyStep";
import { usePhone } from "./session-context";

const TITLES = ["Aim at your view", "Pick your gun", "Ready up"];

/**
 * Setup, one page per step in the kit's frame: calibrate inside your own
 * view of the big screen, pick a gun, say ready. The platform already
 * asked for a name.
 */
export function Setup({ seat }: { seat: number }) {
  const session = usePhone();
  const step = usePhoneStore((s) => s.step);
  const wanted = usePhoneStore((s) => s.wanted);
  const host = usePhoneStore((s) => s.host);
  const calibrated = usePhoneStore((s) => s.calibrated);
  const ready = host?.ready ?? false;
  // In a match already, the gun is set: calibrating is all that is left.
  const locked = host?.playing === true && host.phase !== "lobby";

  const footer =
    step === 1 ? (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo(0)}>
          Back
        </button>
        <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={() => session.confirmGun()}>
          Take the {GUNS[wanted].name}
        </button>
      </>
    ) : step === 2 ? (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => session.goTo(1)}>
          Back
        </button>
        <button type="button" className={`btn btn--lg kit-grow ${ready ? "" : "btn--primary"}`} disabled={!calibrated} onClick={() => session.setReady(!ready)}>
          {ready ? "Not ready" : "Ready"}
        </button>
      </>
    ) : undefined;

  return (
    <StepShell steps={STEPS} current={step} title={TITLES[step] ?? ""} footer={locked ? undefined : footer}>
      {step === 0 && <AimCalibrate aim={session.aim} colour={playerColor(seat)} zone={host?.zone ?? undefined} onDone={() => session.calibrated()} />}
      {step === 1 && <GunStep />}
      {step === 2 && <ReadyStep seat={seat} />}
    </StepShell>
  );
}
