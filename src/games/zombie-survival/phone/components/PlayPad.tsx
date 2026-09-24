"use client";
import { useEffect, useSyncExternalStore } from "react";
import { AimPad } from "@/games/kit/aim/AimPad";
import { FireButton } from "@/games/kit/aim/FireButton";
import { playerColor } from "@/games/kit/players";
import type { Seat } from "@/platform/protocol";
import { usePhoneStore } from "../phone-store";
import { AmmoPanel } from "./AmmoPanel";
import { PhaseCard } from "./PhaseCard";
import { usePhone } from "./session-context";

/**
 * The controller during a run: team status on top, the ammo, a big
 * trigger in the middle and Reload under it. The trigger fires on touch
 * and keeps firing while held for automatic guns. Phones without motion
 * sensors aim by dragging around it.
 */
export function PlayPad({ seat }: { seat: Seat }) {
  const session = usePhone();
  const state = usePhoneStore((s) => s.state);
  const aim = useSyncExternalStore(session.aim.subscribe, session.aim.getSnapshot, session.aim.getSnapshot);
  const touch = aim.source === "touch";
  const phase = state?.phase ?? "travel";
  const armed = phase === "travel" || phase === "fight" || phase === "clear";

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

  // A disabled button hears no finger lift, so a trigger held into a cutscene or a loss is let go here.
  useEffect(() => {
    if (!armed) session.releaseTrigger();
  }, [armed, session]);

  const health = state ? state.health / state.maxHealth : 1;
  const trigger = (
    <div className="zs-trigger" style={{ ["--kit-fire" as string]: playerColor(seat) }}>
      <FireButton label="Shoot" disabled={!armed} onFire={() => session.pressTrigger()} onRelease={() => session.releaseTrigger()} />
    </div>
  );

  return (
    <div className="zs-play">
      <header className="zs-play__top">
        <div className="zs-play__stage">
          <span>Stage {state?.stage ?? 1} of 25</span>
          <strong>{state?.stageTitle}</strong>
        </div>
        <div className={`zs-health ${health < 0.35 ? "zs-health--low" : ""}`} aria-label={`Team health ${Math.round(health * 100)}`}>
          <span className="zs-health__fill" style={{ width: `${Math.max(0, health * 100)}%` }} />
          <span className="zs-health__text">Team {state?.health ?? 100}</span>
        </div>
      </header>
      <AmmoPanel />
      {touch ? <AimPad aim={session.aim}>{trigger}</AimPad> : trigger}
      <div className="zs-play__buttons">
        <button type="button" className="zs-reload" onClick={() => session.reload()}>
          Reload
        </button>
        {!touch && (
          <button type="button" className="zs-recenter" onClick={() => session.recenter()} aria-label="Recenter aim">
            Recenter
          </button>
        )}
      </div>
      {!armed && <PhaseCard />}
    </div>
  );
}
