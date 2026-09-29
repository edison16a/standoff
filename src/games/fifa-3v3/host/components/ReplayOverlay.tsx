"use client";
import { playerColor } from "@/games/kit/players";
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

/** Who can skip the replay and who has: any button on a phone is a vote, and it takes everyone. */
function SkipBar() {
  const skip = useFifaStore((s) => s.skip);
  if (skip.length === 0) return null;
  const agreed = skip.filter((s) => s.agreed).length;
  return (
    <div className="fifa-skip" aria-label={`${agreed} of ${skip.length} want to skip`}>
      <span className="fifa-skip__title">
        Skip: {agreed} of {skip.length}
      </span>
      <ul className="fifa-skip__list">
        {skip.map((s) => (
          <li key={s.seat} className={`fifa-skip__player ${s.agreed ? "fifa-skip__player--in" : ""}`} style={{ "--player": playerColor(s.seat) } as React.CSSProperties}>
            <span className="fifa-skip__tick" aria-hidden>
              {s.agreed ? "✓" : ""}
            </span>
            {s.name}
          </li>
        ))}
      </ul>
      <span className="fifa-skip__hint">Press any button to skip</span>
    </div>
  );
}

/**
 * The goal replay's overlay: the REPLAY tag, the scorer's numbers for
 * the stage on screen (run speed, the aim, the ball's speed and spin),
 * a slow motion mark, and who has voted to skip.
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
      <SkipBar />
    </>
  );
}
