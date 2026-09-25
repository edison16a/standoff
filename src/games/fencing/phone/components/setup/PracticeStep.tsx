"use client";
import { useEffect, useRef, useState } from "react";
import { FencerPreview } from "@/games/fencing/components/FencerPreview";
import type { Slot } from "@/games/fencing/players";
import type { StrikeAction } from "@/games/fencing/protocol";
import type { PreviewAction } from "@/games/fencing/render/preview/fencer-stand";
import { buzz } from "@/games/fencing/phone/haptics";
import { Practice, PRACTICE_REPS, type PracticeStage } from "@/games/fencing/phone/practice";
import { useControllerStore } from "../../controller-store";
import { useController } from "../session-context";
import { StrengthMeter } from "./StrengthMeter";
import { StrikeArt } from "./StrikeArt";

/** The peak is still being measured just after a strike fires. */
const PEAK_SETTLE_MS = 200;

const ASK: Record<StrikeAction, { title: string; how: string }> = {
  jab: { title: "Jab now", how: "Give the phone a quick flick or shake." },
  parry: { title: "Parry now", how: "Raise the phone up and to the right." },
};

function praise(action: StrikeAction, peak: number): string {
  // A parry is a place the blade reaches, so how hard it moved says nothing.
  if (action === "parry") return "Nice parry!";
  const how = peak > 2 ? "Sharp" : peak > 1.1 ? "Nice" : "Soft but good";
  return `${how} jab!`;
}

/**
 * A quick practice: two jabs, then two parries. Each one the phone reads
 * makes the fencer lunge or parry, buzzes and plays its sound. Jabs are
 * measured, and from how hard this player moves their own jab level is
 * set, so a gentle mover's jabs land and a wild one's twitches do not.
 */
export function PracticeStep({ slot, onStage }: { slot: Slot; onStage(stage: PracticeStage): void }) {
  const session = useController();
  const { pick, inputMode } = useControllerStore();
  const practiceRef = useRef(new Practice());
  const cueRef = useRef<PreviewAction | null>(null);
  const [stage, setStage] = useState<PracticeStage>("jab");
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);
  const [count, setCount] = useState(0);
  const touch = inputMode === "touch";
  const onStageRef = useRef(onStage);
  useEffect(() => {
    onStageRef.current = onStage;
  });

  useEffect(() => {
    if (touch) return;
    session.setPractising(true);
    const stop = session.onLocalStrike((action) => {
      cueRef.current = { action, startedAt: performance.now() };
      if (action === "jab") session.sfx.jab();
      else session.sfx.clang();
      buzz(action);
      setTimeout(() => {
        const practice = practiceRef.current;
        const peak = session.pipeline.lastStrike?.peak ?? 1;
        const asked = practice.stage;
        if (asked === "done") return;
        const result = practice.record(action, peak);
        setCount(practice.count(asked));
        if (!result.right) {
          setMessage({ good: false, text: asked === "jab" ? "That was a parry. Flick or shake to jab." : "That was a jab. Raise higher and further right to parry." });
          return;
        }
        setMessage({ good: true, text: praise(action, peak) });
        if (result.stage !== asked) {
          session.sfx.chime();
          setStage(result.stage);
          setCount(0);
          onStageRef.current(result.stage);
          if (result.stage === "done") session.setSensitivity(practice.sensitivity);
        }
      }, PEAK_SETTLE_MS);
    });
    return () => {
      stop();
      session.setPractising(false);
    };
  }, [session, touch]);

  const tryButton = (action: StrikeAction) => {
    cueRef.current = { action, startedAt: performance.now() };
    buzz(action);
    if (action === "jab") session.sfx.jab();
    else session.sfx.clang();
  };

  const preview = (
    <FencerPreview
      characterId={pick ?? "vale"}
      slot={slot}
      className="setup-card setup-card--practice"
      framing="hero"
      sword={touch ? undefined : () => session.frame}
      action={() => (cueRef.current && performance.now() - cueRef.current.startedAt < 900 ? cueRef.current : null)}
    />
  );

  if (touch) {
    return (
      <div className="setup-page">
        {preview}
        <p className="setup-page__lead">Tap to try your moves.</p>
        <div className="strikes">
          <button type="button" className="btn btn--lg" onPointerDown={() => tryButton("parry")}>Parry</button>
          <button type="button" className="btn btn--lg btn--primary" onPointerDown={() => tryButton("jab")}>Jab</button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="setup-page">
        {preview}
        <p className="setup-page__lead">All set. Tuned to how you move.</p>
        <p className="setup-page__text">In a bout, your fencer lunges on every flick and parries when you raise the sword up and right.</p>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <div className="practice">
        <div className="practice__stage">{preview}</div>
        <StrengthMeter action={stage} />
      </div>
      <div className="practice__ask">
        <StrikeArt action={stage} />
        <div>
          <strong className="practice__title">{ASK[stage].title}</strong>
          <p className="setup-page__text">{ASK[stage].how}</p>
          <span className="practice__reps" aria-label={`${count} of ${PRACTICE_REPS}`}>
            {Array.from({ length: PRACTICE_REPS }, (_, i) => (
              <span key={i} className={`pip ${i < count ? "pip--on" : ""}`} />
            ))}
          </span>
        </div>
      </div>
      {message && (
        <p key={`${message.text}${count}`} className={`practice__message ${message.good ? "practice__message--good" : ""}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
