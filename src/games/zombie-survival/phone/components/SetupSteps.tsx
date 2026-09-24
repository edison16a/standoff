"use client";
import { AimCalibrate } from "@/games/kit/aim/AimCalibrate";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import type { Seat } from "@/platform/protocol";
import { WEAPONS } from "../../engine/weapons";
import { STEPS, usePhoneStore } from "../phone-store";
import { ReadyStep } from "./ReadyStep";
import { usePhone } from "./session-context";
import { WeaponStep } from "./WeaponStep";

const TITLES = ["Aim at the screen", "Pick your gun", "Ready up"];

/** Setup, one page per step: calibrate the aim, pick a gun, say ready. */
export function SetupSteps({ seat }: { seat: Seat }) {
  const session = usePhone();
  const step = usePhoneStore((s) => s.step);
  const weapon = usePhoneStore((s) => s.weapon);
  const ready = usePhoneStore((s) => s.ready);
  const calibrated = usePhoneStore((s) => s.calibrated);

  const footer =
    step === 1 ? (
      <>
        <button type="button" className="btn btn--ghost btn--lg" onClick={() => session.goTo(0)}>
          Back
        </button>
        <button type="button" className="btn btn--primary btn--lg kit-grow" onClick={() => session.confirmWeapon()}>
          Take the {WEAPONS[weapon].name}
        </button>
      </>
    ) : step === 2 ? (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => session.goTo(1)}>
          Back
        </button>
        <button
          type="button"
          className={`btn btn--lg kit-grow ${ready ? "" : "btn--primary"}`}
          disabled={!calibrated}
          onClick={() => session.setReady(!ready)}
        >
          {ready ? "Not ready" : "I am ready"}
        </button>
      </>
    ) : undefined;

  return (
    <StepShell steps={STEPS} current={step} title={TITLES[step] ?? ""} footer={footer}>
      {step === 0 && <AimCalibrate aim={session.aim} colour={playerColor(seat)} onDone={() => session.calibrated()} />}
      {step === 1 && <WeaponStep />}
      {step === 2 && <ReadyStep seat={seat} />}
    </StepShell>
  );
}
