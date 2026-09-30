"use client";
import { useEffect } from "react";
import type { PhoneState } from "../../protocol";
import { TEAMS } from "../../teams";
import { ChoosePad } from "./ChoosePad";
import { KickPad } from "./KickPad";
import { hasMoveStick, layoutKey } from "../pad-layout";
import { StickPad, WaitPad } from "./PlayPads";
import { usePhone } from "./session-context";

/**
 * The phone as a controller, held sideways. The layout follows what
 * this player is doing right now, as the host says: the QB's call, the
 * QB's bar and throw stick, a runner's stick, the defence's buttons, or
 * the kick meters. Changing layout lets go of any button held, so none
 * sticks on across a change. The QB, runner and defence pads share one
 * move stick that stays mounted between them, so a thumb steering the
 * QB keeps steering him the moment he presses Run.
 */
export function Controller({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const layout = layoutKey(host);
  const stick = hasMoveStick(host.pad);

  useEffect(() => {
    phone.controlling(true);
    return () => phone.controlling(false);
  }, [phone]);

  useEffect(() => phone.letGo({ keepStick: stick }), [phone, layout, stick]);

  const team = TEAMS[host.team ?? 0];
  return (
    <div className="fb-controller" style={{ "--team": team.color } as React.CSSProperties}>
      {stick && <StickPad host={host} />}
      {host.pad === "choose" && <ChoosePad host={host} />}
      {host.pad === "kicker" && <KickPad host={host} />}
      {host.pad === "wait" && <WaitPad host={host} />}
    </div>
  );
}

/** The final whistle on the phone: the result and this player's numbers. */
export function ResultCard({ host }: { host: PhoneState }) {
  const s = host.stats;
  const title = host.result === "win" ? "You win!" : host.result === "tie" ? "A tie" : "You lose";
  const lines = s
    ? ([
        ["Passing", `${s.passYards} yds`, s.passYards !== 0],
        ["Rushing", `${s.rushYards} yds`, s.rushYards !== 0],
        ["Receiving", `${s.recYards} yds`, s.recYards !== 0],
        ["Touchdowns", String(s.touchdowns), true],
        ["Tackles", String(s.tackles), true],
        ["Interceptions", String(s.interceptions), s.interceptions > 0],
      ] as const).filter(([, , shown]) => shown)
    : [];
  return (
    <div className={`fb-result fb-result--${host.result ?? "lose"}`}>
      <span className="fb-result__label">Final</span>
      <strong className="fb-result__title">{title}</strong>
      <span className="fb-result__score">
        {TEAMS[0].code} {host.score[0]} : {host.score[1]} {TEAMS[1].code}
      </span>
      <dl className="fb-result__stats">
        {lines.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <span className="muted">Play again from the big screen.</span>
    </div>
  );
}
