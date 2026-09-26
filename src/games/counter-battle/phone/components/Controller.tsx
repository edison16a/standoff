"use client";
import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { AimPad } from "@/games/kit/aim/AimPad";
import { FireButton } from "@/games/kit/aim/FireButton";
import { playerColor } from "@/games/kit/players";
import { GUNS } from "../../engine/guns";
import type { PhoneState } from "../../protocol";
import { TEAMS } from "../../teams";
import { usePhoneStore } from "../phone-store";
import { Magazine } from "./Magazine";
import { usePhone } from "./session-context";

/** Health, the round and the score, in your team's colours. */
function Status({ host }: { host: PhoneState }) {
  const flash = usePhoneStore((s) => s.flash);
  const mine = host.team ?? 0;
  const theirs = mine === 0 ? 1 : 0;
  return (
    <header className="cb-status">
      <div className={`cb-status__health ${host.health <= 30 ? "cb-status__health--low" : ""}`} aria-label={`Health ${host.health}`}>
        <span className="cb-status__fill" style={{ width: `${host.health}%` }} />
        <strong>{host.health}</strong>
      </div>
      <div className="cb-status__score" aria-label={`Round ${host.round}, ${host.score[0]} to ${host.score[1]}`}>
        <b style={{ color: TEAMS[mine].color }}>{host.score[0]}</b>
        <span>Round {host.round}</span>
        <b style={{ color: TEAMS[theirs].color }}>{host.score[1]}</b>
      </div>
      {host.banner && <span className="cb-status__banner">{host.banner}</span>}
      {flash && (
        <strong key={flash.key} className={`cb-flash cb-flash--${flash.tone}`}>
          {flash.text}
        </strong>
      )}
    </header>
  );
}

/**
 * The phone as the gun: aim by pointing it at your view, Shoot under
 * the thumb (hold it for an automatic, tap for the others), Reload, and
 * Centre to put the aim back in the middle if it drifts. Phones without
 * motion sensors aim by dragging round the trigger.
 */
export function Controller({ host, seat }: { host: PhoneState; seat: number }) {
  const session = usePhone();
  const aim = useSyncExternalStore(session.aim.subscribe, session.aim.getSnapshot, session.aim.getSnapshot);
  const touch = aim.source === "touch";
  const gun = host.gun ? GUNS[host.gun] : null;

  useEffect(() => {
    session.aim.stream(true);
    const release = () => session.releaseTrigger();
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      session.aim.stream(false);
      session.releaseTrigger();
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [session]);

  const trigger = (
    <div className="cb-trigger" style={{ "--kit-fire": playerColor(seat) } as CSSProperties}>
      <FireButton label="Shoot" disabled={!host.armed} onFire={() => session.pressTrigger()} onRelease={() => session.releaseTrigger()}>
        <span className="cb-trigger__word">Shoot</span>
        <small>{gun?.auto ? "Hold" : "Tap"}</small>
      </FireButton>
    </div>
  );

  return (
    <div className="cb-play">
      <Status host={host} />
      <Magazine host={host} />
      <div className="cb-play__trigger">{touch ? <AimPad aim={session.aim}>{trigger}</AimPad> : trigger}</div>
      <div className="cb-play__buttons">
        <button type="button" className={`cb-reload ${host.ammo === 0 && !host.reloading ? "cb-reload--urgent" : ""}`} disabled={!host.alive} onClick={() => session.reload()}>
          Reload
        </button>
        {!touch && (
          <button type="button" className="cb-centre" onClick={() => session.recenter()} aria-label="Put the aim back in the middle">
            Centre aim
          </button>
        )}
      </div>
      {!host.alive && (
        <div className="cb-play__down">
          <strong>You are down</strong>
          <span>Back next round. Watch your team on the big screen.</span>
        </div>
      )}
    </div>
  );
}
