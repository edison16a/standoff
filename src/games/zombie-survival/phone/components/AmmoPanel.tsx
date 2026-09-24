"use client";
import { useEffect, useState } from "react";
import { WEAPONS } from "../../engine/weapons";
import { usePhoneStore } from "../phone-store";

/**
 * Rounds left, drawn as a row of bullets as well as a number, and a bar
 * that fills while the reload runs. The host sends the count; the bar
 * runs on this phone's clock so it moves smoothly.
 */
export function AmmoPanel() {
  const gun = usePhoneStore((s) => s.gun);
  const reload = usePhoneStore((s) => s.reload);
  const weapon = usePhoneStore((s) => s.weapon);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (reload === null) return;
    let frame = requestAnimationFrame(function tick(t) {
      setNow(t);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [reload]);

  const spec = WEAPONS[gun?.weapon ?? weapon];
  const ammo = gun?.ammo ?? spec.magazine;
  const magazine = gun?.magazine ?? spec.magazine;
  const reloading = gun?.reloading ?? false;
  const progress = reloading && reload ? Math.min(1, Math.max(0, (now - reload.from) / Math.max(100, reload.to - reload.from))) : 0;
  const empty = ammo === 0;

  return (
    <section className={`zs-ammo ${empty ? "zs-ammo--empty" : ""}`} aria-live="polite">
      <div className="zs-ammo__count">
        <strong>{ammo}</strong>
        <span>/ {magazine}</span>
        <em>{spec.name}</em>
      </div>
      <div className="zs-ammo__rounds" aria-hidden="true">
        {Array.from({ length: magazine }, (_, i) => (
          <i key={i} className={i < ammo ? "zs-ammo__round zs-ammo__round--full" : "zs-ammo__round"} />
        ))}
      </div>
      <div className="zs-ammo__reload" data-on={reloading}>
        <span className="zs-ammo__reload-fill" style={{ width: `${progress * 100}%` }} />
        <span className="zs-ammo__reload-text">{reloading ? (spec.style === "shells" ? "Loading shells" : "Reloading") : empty ? "Empty" : " "}</span>
      </div>
    </section>
  );
}
