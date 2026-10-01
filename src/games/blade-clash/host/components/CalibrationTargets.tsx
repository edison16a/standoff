"use client";
import { CORNER_TARGETS, DEFAULT_GUARD, type AimPoint } from "@/games/blade-clash/motion/sword-aim";
import { SLOTS, type Slot } from "@/games/blade-clash/players";
import type { CalibrationStep } from "@/games/blade-clash/protocol";
import { VIEWS } from "@/games/blade-clash/render/split";
import { TargetMark, TargetNote } from "@/games/kit/aim/look/TargetMark";
import { playerColor } from "@/games/kit/players";
import { useBladeStore } from "../host-store";

/** Where each calibration step's target sits in the player's view, or null for a step with none. */
function targetFor(step: CalibrationStep): AimPoint | null {
  if (step === "center") return { x: 0, y: 0 };
  if (step === "guard") return DEFAULT_GUARD;
  if (step === "test" || step === "done") return null;
  return CORNER_TARGETS[step];
}

const WORDS: Partial<Record<CalibrationStep, string>> = { guard: "Guard", test: "Try your sword" };

/**
 * While a phone calibrates, its player's half of the screen shows the
 * target to point at, the same one the phone shows, drawn the way every
 * aiming game draws its targets.
 */
function Target({ slot, step }: { slot: Slot; step: CalibrationStep }) {
  const rect = VIEWS[slot];
  const target = targetFor(step);
  const colour = playerColor(slot);
  const word = WORDS[step];
  if (!target) {
    return (
      <TargetNote colour={colour} left={`${(rect.x + rect.w / 2) * 100}%`}>
        {word ?? ""}
      </TargetNote>
    );
  }
  const left = rect.x + ((target.x + 1) / 2) * rect.w;
  const top = rect.y + ((1 - target.y) / 2) * rect.h;
  return <TargetMark colour={colour} left={`${left * 100}%`} top={`${top * 100}%`} words={word ? [word] : []} label={`Player ${slot} target`} />;
}

/** Mid match too: a phone back in a fresh page aims again, and the match start clears the rest. */
export function CalibrationTargets() {
  const calibrating = useBladeStore((state) => state.calibrating);
  return (
    <>
      {SLOTS.map((slot) => {
        const step = calibrating[slot];
        return step ? <Target key={slot} slot={slot} step={step} /> : null;
      })}
    </>
  );
}
