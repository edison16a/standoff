"use client";
import { playerColor } from "@/games/kit/players";
import { Icon } from "@/components/ui/Icon";
import { defaultName } from "@/platform/profile";
import { useAimSnapshot, usePhone, usePhoneState } from "./session-context";

function ordinal(n: number): string {
  return ["1st", "2nd", "3rd"][n - 1] ?? `${n}th`;
}

/** After the buzzer: this player's place, score and accuracy, how the others did, and Play again. */
export function RoundResults() {
  const session = usePhone();
  const game = usePhoneState((state) => state.game);
  const ready = usePhoneState((state) => state.ready);
  const { calibrated } = useAimSnapshot();
  const me = game?.players.find((p) => p.seat === session.seat);
  if (!game || !me) return null;
  const inRound = game.players.filter((p) => p.inRound);
  const won = game.winners.includes(me.seat);
  const solo = inRound.length === 1;
  const title = won ? (solo ? "Nice shooting" : game.winners.length > 1 ? "A tie for first" : "You win") : me.score > 0 ? `${ordinal(me.place)} place` : "No hits this time";
  const unnamed = me.name === defaultName(me.seat);

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
      {unnamed && me.score > 0 && <p className="sg-result__line">Scores without a name are not kept on the board. Add a name next time.</p>}
      {!solo && (
        <ol className="sg-result__others" aria-label="Scores">
          {inRound.map((player) => (
            <li key={player.seat} className={player.seat === me.seat ? "sg-result__me" : ""} style={{ "--p": playerColor(player.seat) } as React.CSSProperties}>
              <span className="sg-result__place">{player.score > 0 ? ordinal(player.place) : ""}</span>
              <span className="sg-result__who">{player.name}</span>
              <strong>{player.score}</strong>
            </li>
          ))}
        </ol>
      )}
      {calibrated ? (
        <button type="button" className={`sg-ready ${ready ? "sg-ready--on" : ""}`} aria-pressed={ready} onClick={() => session.setReady(!ready)}>
          <Icon name={ready ? "check" : "refresh"} size={30} />
          {ready ? "Waiting for the others" : "Play again"}
        </button>
      ) : (
        // This phone reloaded during the round, so it has to aim again before it can play.
        <button type="button" className="sg-ready" onClick={() => session.leaveResults()}>
          <Icon name="target" size={30} />
          Calibrate to play again
        </button>
      )}
    </div>
  );
}
