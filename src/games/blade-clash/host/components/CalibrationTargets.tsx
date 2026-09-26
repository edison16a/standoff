"use client";
import type { CSSProperties } from "react";
import { CORNER_TARGETS, DEFAULT_GUARD, type AimPoint } from "@/games/blade-clash/motion/sword-aim";
import { SLOTS, type Slot } from "@/games/blade-clash/players";
import type { CalibrationStep } from "@/games/blade-clash/protocol";
import { VIEWS } from "@/games/blade-clash/render/split";
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
 * target to point at, the same one the phone shows, big enough to find
 * from across the room.
 */
function Target({ slot, step }: { slot: Slot; step: CalibrationStep }) {
  const rect = VIEWS[slot];
  const target = targetFor(step);
  const style = { "--lamp": playerColor(slot) } as CSSProperties;
  if (!target) {
    return (
      <span className="calib-note" style={{ ...style, left: `${(rect.x + rect.w / 2) * 100}%` }}>
        {WORDS[step] ?? ""}
      </span>
    );
  }
  const left = rect.x + ((target.x + 1) / 2) * rect.w;
  const top = rect.y + ((1 - target.y) / 2) * rect.h;
  return (
    <span className="calib-target" style={{ ...style, left: `${left * 100}%`, top: `${top * 100}%` }} role="img" aria-label={`Player ${slot} target`}>
      {WORDS[step] && <span className="calib-target__word">{WORDS[step]}</span>}
    </span>
  );
}

export function CalibrationTargets() {
  const calibrating = useBladeStore((state) => state.calibrating);
  const hud = useBladeStore((state) => state.hud);
  if (hud) return null;
  return (
    <>
      {SLOTS.map((slot) => {
        const step = calibrating[slot];
        return step ? <Target key={slot} slot={slot} step={step} /> : null;
      })}
    </>
  );
}
