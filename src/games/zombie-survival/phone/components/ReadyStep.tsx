"use client";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import { WEAPONS } from "../../engine/weapons";
import { usePhoneStore } from "../phone-store";

/** The last setup page: your gun, the team, and who is ready. */
export function ReadyStep({ seat }: { seat: Seat }) {
  const weapon = usePhoneStore((s) => s.weapon);
  const ready = usePhoneStore((s) => s.ready);
  const state = usePhoneStore((s) => s.state);
  const running = state !== null && state.phase !== "lobby";
  const team = state?.seats.map((s, i) => ({ ...s, seat: i + 1 })).filter((s) => s.connected) ?? [];

  return (
    <div className="zs-ready">
      <div className="zs-ready__gun" style={{ borderColor: playerColor(seat) }}>
        <span className="zs-ready__label">Your gun</span>
        <strong>{WEAPONS[weapon].name}</strong>
      </div>
      <p className="zs-ready__hint">
        {running
          ? "Your team is already out there. Say ready and you drop straight into the fight."
          : ready
            ? "Waiting for the rest of the team. The big screen can also press Start."
            : "The run starts when everyone here is ready, or when someone presses Start on the big screen."}
      </p>
      <ul className="zs-team">
        {team.map((member) => (
          <li key={member.seat} className="zs-team__row">
            <span className="zs-team__dot" style={{ background: playerColor(member.seat) }} />
            <span className="zs-team__name">
              {member.name}
              {member.seat === seat ? " (you)" : ""}
            </span>
            <span className="zs-team__gun">{member.weapon ? WEAPONS[member.weapon].name : "Choosing"}</span>
            <span className={`zs-team__flag ${member.ready || member.playing ? "zs-team__flag--on" : ""}`}>
              {member.playing ? "Playing" : member.ready ? "Ready" : "Not ready"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
