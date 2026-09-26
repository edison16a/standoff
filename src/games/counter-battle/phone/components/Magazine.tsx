"use client";
import { useEffect, useState } from "react";
import { GUNS } from "../../engine/guns";
import type { PhoneState } from "../../protocol";
import { GunIcon } from "../../ui/GunIcon";
import { usePhoneStore } from "../phone-store";

/**
 * Rounds left as a big number and a row of rounds, and a bar that fills
 * while the reload runs. The host sends the count; the bar runs on this
 * phone's clock so it moves smoothly between messages.
 */
export function Magazine({ host }: { host: PhoneState }) {
  const reload = usePhoneStore((s) => s.reload);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (reload === null) return;
    let frame = requestAnimationFrame(function tick(t) {
      setNow(t);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [reload]);

  const spec = host.gun ? GUNS[host.gun] : null;
  const progress = host.reloading && reload ? Math.min(1, Math.max(0, (now - reload.from) / Math.max(100, reload.to - reload.from))) : 0;
  const empty = host.ammo === 0;
  return (
    <section className={`cb-mag ${empty ? "cb-mag--empty" : ""}`} aria-live="polite">
      <div className="cb-mag__count">
        <strong>{host.ammo}</strong>
        <span>/ {host.magazine}</span>
        {host.gun && <GunIcon gun={host.gun} size={70} className="cb-mag__gun" />}
      </div>
      <div className="cb-mag__rounds" aria-hidden="true">
        {Array.from({ length: host.magazine }, (_, i) => (
          <i key={i} className={i < host.ammo ? "cb-mag__round cb-mag__round--full" : "cb-mag__round"} />
        ))}
      </div>
      <div className="cb-mag__reload" data-on={host.reloading}>
        <span className="cb-mag__fill" style={{ width: `${progress * 100}%` }} />
        <span className="cb-mag__text">{host.reloading ? (host.gun === "shotgun" ? "Loading shells" : "Reloading") : empty ? "Empty, reload" : (spec?.name ?? "")}</span>
      </div>
    </section>
  );
}
