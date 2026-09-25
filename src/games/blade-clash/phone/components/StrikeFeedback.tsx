"use client";
import { useEffect, useState } from "react";
import type { FeedbackEvent } from "@/games/blade-clash/protocol";
import { useControllerStore, type Verdict } from "../controller-store";

/** How long a read strike and a verdict stay up. */
const DETECTED_MS = 700;
const VERDICT_MS = 1500;

const VERDICTS: Record<FeedbackEvent, { text: string; tone: "good" | "bad" | "plain" }> = {
  scored: { text: "Touch!", tone: "good" },
  touched: { text: "Hit", tone: "bad" },
  parried: { text: "Parried!", tone: "good" },
  blocked: { text: "Blocked", tone: "bad" },
  missed: { text: "Missed", tone: "plain" },
  refused: { text: "Too soon", tone: "plain" },
};

function verdictText(verdict: Verdict): string {
  if (verdict.event === "missed") return verdict.reason === "far" ? "Too far" : "Off line";
  return VERDICTS[verdict.event].text;
}

/**
 * The word in the middle of the pad: every strike the phone reads flashes
 * up at once (Jab, Parry), and the referee's verdict replaces it a moment
 * later (Touch, Parried, Too far). The player never has to wonder whether
 * a move was read.
 */
export function StrikeFeedback() {
  const { detected, verdict } = useControllerStore();
  // Each word goes away on its own timer. What has timed out is remembered by its time stamp.
  const [verdictGone, setVerdictGone] = useState(-1);
  const [detectedGone, setDetectedGone] = useState(-1);
  useEffect(() => {
    if (!verdict) return;
    const timer = setTimeout(() => setVerdictGone(verdict.at), VERDICT_MS);
    return () => clearTimeout(timer);
  }, [verdict]);
  useEffect(() => {
    if (!detected) return;
    const timer = setTimeout(() => setDetectedGone(detected.at), DETECTED_MS);
    return () => clearTimeout(timer);
  }, [detected]);
  const showVerdict = verdict && verdict.at !== verdictGone;
  const showDetected = !showVerdict && detected && detected.at !== detectedGone;

  if (showVerdict) {
    return (
      <div key={`v${verdict.at}`} className={`feedback feedback--${VERDICTS[verdict.event].tone}`} role="status">
        {verdictText(verdict)}
      </div>
    );
  }
  if (showDetected) {
    return (
      <div key={`d${detected.at}`} className={`feedback feedback--read feedback--${detected.action}`} role="status">
        {detected.action === "jab" ? "Jab" : "Parry"}
      </div>
    );
  }
  return <div className="feedback feedback--idle" aria-hidden="true" />;
}
