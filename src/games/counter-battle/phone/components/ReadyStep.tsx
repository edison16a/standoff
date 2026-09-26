"use client";
import type { CSSProperties } from "react";
import { playerColor } from "@/games/kit/players";
import { GUNS } from "../../engine/guns";
import { TEAMS } from "../../teams";
import { GunIcon } from "../../ui/GunIcon";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

/** The big screen in miniature with this player's view lit up. */
function ViewPicture({ zone, colour }: { zone: { x: number; y: number; w: number; h: number } | null; colour: string }) {
  const z = zone ?? { x: 0, y: 0, w: 1, h: 1 };
  return (
    <svg className="cb-view" viewBox="0 0 160 90" role="img" aria-label="Your view on the big screen">
      <rect x="1" y="1" width="158" height="88" rx="8" className="cb-view__screen" />
      <rect x={3 + z.x * 154} y={3 + z.y * 84} width={z.w * 154} height={z.h * 84} rx="5" fill={colour} fillOpacity="0.35" stroke={colour} strokeWidth="2.5" />
    </svg>
  );
}

/** Who you are before the match: your team, your view, your gun and your teammate. */
export function ReadyStep({ seat }: { seat: number }) {
  const session = usePhone();
  const host = usePhoneStore((s) => s.host);
  const wanted = usePhoneStore((s) => s.wanted);
  const colour = playerColor(seat);
  const team = host?.team ?? null;
  const busy = host !== null && host.phase !== "lobby" && !host.playing;
  const note = busy
    ? "A match is on. You join the next one."
    : team === null
      ? "The teams are full. You get the next free place."
      : host?.ready
        ? "You are in. The big screen starts the match."
        : "Tap Ready. Hold the phone flat like a remote, top edge to the screen.";
  const style = { "--player": colour, "--team": team === null ? "#64748b" : TEAMS[team].color } as CSSProperties;
  return (
    <div className="cb-ready" style={style}>
      <div className="cb-ready__card">
        <span className="cb-ready__team">{team === null ? "Waiting" : `${TEAMS[team].name} team`}</span>
        <ViewPicture zone={host?.zone ?? null} colour={colour} />
        <div className="cb-ready__gun">
          <GunIcon gun={wanted} size={96} />
          <strong>{GUNS[wanted].name}</strong>
        </div>
        {host?.teammate && host.mode === "2v2" && <span className="cb-ready__mate">With {host.teammate}</span>}
      </div>
      <p className={`cb-ready__note ${host?.ready ? "cb-ready__note--on" : ""}`}>{note}</p>
      <button type="button" className="btn btn--ghost cb-ready__again" onClick={() => session.aimAgain()}>
        Aim again
      </button>
    </div>
  );
}
