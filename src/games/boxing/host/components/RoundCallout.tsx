"use client";
import type { Hud } from "../host-store";

/**
 * The big words between the fighting: the walk out, touching gloves with
 * who is ready and how long is left, and the break in the corners with
 * the count to the next round.
 */
export function RoundCallout({ hud }: { hud: Hud }) {
  if (hud.stage !== "fight") return null;
  if (hud.phase === "intro") {
    return (
      <div className="bx-callout">
        <span className="bx-callout__small">Out to the middle</span>
      </div>
    );
  }
  if (hud.phase === "touch" && !hud.touched) return <TouchPrompt hud={hud} />;
  if (hud.phase !== "break") return null;
  const next = hud.round + 1;
  const title = hud.breakStage === "walk" ? "Back to your corner" : hud.breakStage === "rest" ? "Rest on the stool" : "Back to the middle";
  return (
    <div className="bx-callout">
      <span className="bx-callout__small">{title}</span>
      {hud.breakStage !== "walk" && <span className="bx-callout__big">{hud.phaseLeft}</span>}
      {hud.breakStage === "rest" && <span className="bx-callout__note">Round {next} next</span>}
    </div>
  );
}

function TouchPrompt({ hud }: { hud: Hud }) {
  const players = hud.views.length;
  return (
    <div className="bx-callout bx-touch">
      <span className="bx-touch__title">Touch gloves</span>
      <span className="bx-callout__small">Hold both gloves straight out in front of you</span>
      <div className="bx-touch__who">
        {([0, 1] as const).map((id) => {
          const fighter = hud.fighters[id];
          const label = fighter.human ? (players === 1 ? "You" : `Player ${id + 1}`) : "Computer";
          return (
            <span key={id} className={`bx-touch__chip${fighter.reaching ? " bx-touch__chip--ready" : ""}`} style={{ ["--glove" as string]: fighter.colour }}>
              {label} {fighter.reaching ? "ready" : "waiting"}
            </span>
          );
        })}
      </div>
      <span className="bx-callout__note">The bell goes anyway in {hud.phaseLeft}</span>
    </div>
  );
}
