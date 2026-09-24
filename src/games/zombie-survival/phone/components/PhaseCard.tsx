"use client";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

/** Laid over the trigger when there is nothing to shoot: a cutscene, a loss, or the escape. */
export function PhaseCard() {
  const session = usePhone();
  const state = usePhoneStore((s) => s.state);
  const score = usePhoneStore((s) => s.score);
  const phase = state?.phase;

  const numbers = score && (
    <dl className="zs-pcard__stats">
      <div>
        <dt>Kills</dt>
        <dd>{score.kills}</dd>
      </div>
      <div>
        <dt>Accuracy</dt>
        <dd>{Math.round(score.accuracy * 100)}%</dd>
      </div>
      <div>
        <dt>Head shots</dt>
        <dd>{score.headshots}</dd>
      </div>
      <div>
        <dt>Weak points</dt>
        <dd>{score.weakHits}</dd>
      </div>
    </dl>
  );

  if (phase === "down") {
    return (
      <div className="zs-pcard zs-pcard--down">
        <h3>The team is down</h3>
        <p>Retry from the last checkpoint at stage {state?.stage}.</p>
        {numbers}
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => session.retry()}>
          Retry
        </button>
      </div>
    );
  }
  if (phase === "escaped") {
    return (
      <div className="zs-pcard zs-pcard--won">
        <h3>You escaped</h3>
        <p>The Northern Star is out at sea. Your numbers for the run:</p>
        {numbers}
        <button type="button" className="btn btn--primary btn--lg btn--block" onClick={() => session.again()}>
          Play again
        </button>
      </div>
    );
  }
  return (
    <div className="zs-pcard">
      <h3>Watch the big screen</h3>
      {numbers}
    </div>
  );
}
