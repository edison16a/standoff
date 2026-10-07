"use client";
import { useFifaStore, type ReplayCard } from "../host-store";

/** The numbers for each stage of the replay, like a broadcast's telestrator. */
function StatLines({ card }: { card: ReplayCard }) {
  const f = card.facts;
  if (!f) return null;
  switch (card.stage) {
    case "run":
      return <Line label="Run speed" value={`${f.runMph} mph`} />;
    case "strike":
      return f.aim ? <Line label="Aimed" value={f.aim} /> : null;
    case "flight":
    case "dive":
      return (
        <>
          <Line label="Ball speed" value={`${f.ballMph} mph`} />
          <Line label="Spin" value={`${f.spinRpm} rpm ${f.spinKind.toLowerCase()}`} />
        </>
      );
    case "net":
      return <Line label="Ball speed" value={`${f.ballMph} mph`} />;
  }
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <p className="fifa-replay-card__line">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

/**
 * The goal replay's overlay: the REPLAY tag, the scorer's numbers for
 * the stage on screen (run speed, the aim, the ball's speed and spin),
 * and a slow motion mark. Skipping lives only on the phones, so nothing
 * about it covers the replay here.
 */
export function ReplayOverlay() {
  const card = useFifaStore((s) => s.replayCard);
  if (!card) return null;
  return (
    <>
      <div className="fifa-replay" aria-label="Replay">
        <span className="fifa-replay__dot" />
        REPLAY
        {card.slow && <span className="fifa-replay__slow">Slow motion</span>}
      </div>
      <section className="fifa-replay-card" aria-live="polite">
        {card.kicker && <p className="fifa-replay-card__name">{card.kicker}</p>}
        <StatLines card={card} />
      </section>
    </>
  );
}
