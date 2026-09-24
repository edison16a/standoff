"use client";
import { useSurvivalStore } from "../host-store";

/**
 * Everything that flashes across the whole screen: the stage title as a
 * fight begins, a boss's name, the checkpoint, the red flash when the
 * team is hit and the pulsing edge when health runs low. Each restarts
 * its CSS animation by key, so no timers are needed.
 */
export function Banners() {
  const banner = useSurvivalStore((s) => s.banner);
  const hurtAt = useSurvivalStore((s) => s.hurtAt);
  const health = useSurvivalStore((s) => s.hud.health);
  const phase = useSurvivalStore((s) => s.hud.phase);
  const low = phase !== "lobby" && health > 0 && health < 35;
  return (
    <>
      {hurtAt > 0 && <div key={hurtAt} className="zs-hurt" aria-hidden="true" />}
      {low && <div className="zs-low" aria-hidden="true" />}
      {banner && phase !== "lobby" && (
        <div key={banner.id} className={`zs-banner zs-banner--${banner.tone}`} role="status">
          <strong>{banner.title}</strong>
          <span>{banner.sub}</span>
        </div>
      )}
    </>
  );
}
