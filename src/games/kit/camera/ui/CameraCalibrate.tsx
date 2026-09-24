"use client";
import "../styles/calibrate.css";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { playerColor } from "@/games/kit/players";
import { BaselineCollector, DEFAULT_CALIBRATION, type Baseline, type CalibrationPhase } from "../engine/calibration";
import type { SpotIssue } from "../engine/spots";
import type { CameraKit } from "../host/camera-kit";
import { heading, instruction } from "./calibrate-text";
import { CameraPreview } from "./CameraPreview";
import type { GuideState } from "./draw";
import type { Fit } from "./fit";
import { PRIVACY_NOTE } from "./ModelLoader";

/** What a game's own extra calibration step gets: the kit, everyone's baseline, and a way to finish. */
export interface CalibrateExtraContext {
  kit: CameraKit;
  baselines: Baseline[];
  done: () => void;
}

export interface CameraCalibrateProps {
  kit: CameraKit;
  /** Names under each ring, player one first. Defaults to Player 1 and Player 2. */
  names?: readonly string[];
  /** "full" also asks for the knees and feet in view, for games that read the legs. */
  needs?: "upper" | "full";
  /** A game's own step after standing still, like showing a guard. It calls `done` when finished. */
  extra?: { title: string; text?: string; render: (context: CalibrateExtraContext) => ReactNode };
  /** Everyone's baseline, player one first. They are also set on the kit already. */
  onDone: (baselines: Baseline[]) => void;
  /** Each player's ring filling, for the game's own sound. */
  onPlayerDone?: (slot: number) => void;
}

interface Row {
  phase: CalibrationPhase;
  issue: SpotIssue | "moving" | null;
}

/**
 * Calibration for one or two players at once: find your spot, stand tall
 * and still while your ring fills, then the game's own step if it has one.
 * Each player's baseline is set on the kit and handed to `onDone`.
 */
export function CameraCalibrate({ kit, names, needs = "upper", extra, onDone, onPlayerDone }: CameraCalibrateProps) {
  const players = kit.players;
  const collectors = useMemo(
    () => kit.spots.map((spot) => new BaselineCollector(spot, { rules: { ...DEFAULT_CALIBRATION.rules, needs } })),
    [kit, needs],
  );
  const guides = useRef<GuideState[]>(kit.spots.map((spot) => ({ slot: spot.slot, colour: playerColor(spot.slot), phase: "find", progress: 0 })));
  const [rows, setRows] = useState<Row[]>(() => kit.spots.map(() => ({ phase: "find", issue: "missing" })));
  const [baselines, setBaselines] = useState<Baseline[] | null>(null);
  const [finished, setFinished] = useState(false);
  const [fit, setFit] = useState<Fit | null>(null);
  const callbacks = useRef({ onDone, onPlayerDone });
  useEffect(() => {
    callbacks.current = { onDone, onPlayerDone };
  }, [onDone, onPlayerDone]);

  useEffect(() => {
    let last = "";
    let applied = false;
    return kit.onFrame((frame) => {
      if (applied) return;
      const steps = collectors.map((collector, i) => collector.update(frame.bodies[i] ?? null, frame.time));
      steps.forEach((step, i) => {
        if (step.phase === "done" && guides.current[i]!.phase !== "done") callbacks.current.onPlayerDone?.(i + 1);
        Object.assign(guides.current[i]!, { phase: step.phase, progress: step.progress });
      });
      const next = steps.map((step) => ({ phase: step.phase, issue: step.issue }));
      const key = JSON.stringify(next);
      if (key !== last) {
        last = key;
        setRows(next);
      }
      if (steps.every((step) => step.baseline)) {
        // Set once. Setting a baseline restarts that player's moves, which the extra step may be reading.
        applied = true;
        const all = steps.map((step) => step.baseline!);
        all.forEach((baseline) => kit.setBaseline(baseline.slot, baseline));
        setBaselines(all);
      }
    });
  }, [kit, collectors]);

  const finish = useCallback(() => setFinished(true), []);
  const reported = useRef(false);
  const hasExtra = !!extra;
  useEffect(() => {
    // Once only, however often the game re-renders with a new `extra`.
    if (!baselines || reported.current || (hasExtra && !finished)) return;
    reported.current = true;
    callbacks.current.onDone(baselines);
  }, [baselines, finished, hasExtra]);

  const inExtra = !!baselines && !!extra && !finished;
  const top = inExtra ? { title: extra.title, text: extra.text ?? "" } : heading(rows.map((row) => row.phase), players);
  const readGuides = useCallback(() => (inExtra ? [] : guides.current), [inExtra]);
  return (
    <div className="cam-calibrate">
      <CameraPreview kit={kit} guides={readGuides} onFit={setFit} />
      <header className="cam-calibrate__header">
        <h2 className="cam-calibrate__title">{top.title}</h2>
        {top.text && <p className="cam-calibrate__text">{top.text}</p>}
      </header>
      {!inExtra &&
        fit &&
        kit.spots.map((spot, i) => (
          <div
            key={spot.slot}
            className={`cam-calibrate__chip cam-calibrate__chip--${rows[i]!.phase}`}
            style={{ left: fit.x + spot.x * fit.width, borderColor: playerColor(spot.slot) }}
          >
            <span className="cam-calibrate__who" style={{ background: playerColor(spot.slot) }}>
              {names?.[i] ?? `Player ${spot.slot}`}
            </span>
            <span className="cam-calibrate__say">{instruction(rows[i]!.phase, rows[i]!.issue)}</span>
          </div>
        ))}
      {inExtra && <div className="cam-calibrate__extra">{extra.render({ kit, baselines, done: finish })}</div>}
      <p className="cam-calibrate__privacy">{PRIVACY_NOTE}</p>
    </div>
  );
}
