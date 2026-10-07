"use client";
import type { ReplayCard } from "../replay/director";
import { useFootballStore } from "../host-store";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="fb-replay-card__line">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

/** The numbers for each stage of the replay, like a broadcast's telestrator. */
function StatLines({ card }: { card: ReplayCard }) {
  const f = card.facts;
  switch (card.stage) {
    case "aim":
      return card.passer ? <Line label="Throw by" value={card.passer} /> : null;
    case "throw":
      return (
        <>
          {f.ballMph !== null && <Line label="Ball speed" value={`${f.ballMph} mph`} />}
          {f.spinRpm !== null && <Line label="Spiral" value={`${f.spinRpm} rpm`} />}
        </>
      );
    case "flight":
      return (
        <>
          {f.airYards !== null && <Line label="In the air" value={`${f.airYards} yards`} />}
          {f.hangTime !== null && <Line label="Hang time" value={`${f.hangTime.toFixed(1)} s`} />}
          {f.spinRpm !== null && <Line label="Spiral" value={`${f.spinRpm} rpm`} />}
        </>
      );
    case "run":
      return (
        <>
          <Line label={card.passer ? "After the catch" : "Run"} value={`${f.runYards} yards`} />
          <Line label="Top speed" value={`${f.topMph} mph`} />
        </>
      );
  }
}

/**
 * The touchdown replay's overlay: the REPLAY tag with a slow motion mark,
 * the scorer and the numbers for the stage on screen (the ball's speed
 * and spiral on the throw, its flight, the run). Nothing about skipping
 * shows here: that lives on the phones, so the replay plays clean.
 */
export function ReplayOverlay() {
  const card = useFootballStore((s) => s.replayCard);
  if (!card) return null;
  return (
    <>
      <div className="fb-replay" aria-label="Replay">
        <span className="fb-replay__dot" />
        REPLAY
        {card.slow && <span className="fb-replay__slow">Slow motion</span>}
      </div>
      <section className="fb-replay-card" aria-live="polite">
        <p className="fb-replay-card__kicker">Touchdown</p>
        <p className="fb-replay-card__name">{card.scorer}</p>
        <StatLines card={card} />
      </section>
    </>
  );
}
