"use client";
import { playerColor } from "@/games/kit/players";
import { Icon } from "@/components/ui/Icon";
import { usePhone, usePhoneState } from "./session-context";

function ordinal(n: number): string {
  return ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`;
}

/** After the buzzer: this player's place, score and accuracy, and Play again. */
export function RoundResults() {
  const session = usePhone();
  const game = usePhoneState((state) => state.game);
  const ready = usePhoneState((state) => state.ready);
  const me = game?.players.find((p) => p.seat === session.seat);
  if (!game || !me) return null;
  const won = game.winners.includes(me.seat);
  const solo = game.players.filter((p) => p.inRound).length === 1;
  const title = won ? (solo ? "Nice shooting" : game.winners.length > 1 ? "A tie for first" : "You win") : me.score > 0 ? `${ordinal(me.place)} place` : "No hits this time";

  return (
    <div className="sg-result" style={{ "--p": playerColor(me.seat) } as React.CSSProperties}>
      <p className="sg-result__kicker">Round over</p>
      <h2 className="sg-result__title">{title}</h2>
      <p className="sg-result__score">{me.score}</p>
      <p className="sg-result__line">
        {me.hits} hits from {me.shots} shots
        {me.shots > 0 && `, ${Math.round((me.hits / me.shots) * 100)}% accuracy`}
      </p>
      {me.best && <p className="sg-result__best">{ordinal(me.best)} on the best scores board</p>}
      <button type="button" className={`sg-ready ${ready ? "sg-ready--on" : ""}`} aria-pressed={ready} onClick={() => session.setReady(!ready)}>
        <Icon name={ready ? "check" : "refresh"} size={30} />
        {ready ? "Waiting for the others" : "Play again"}
      </button>
    </div>
  );
}
