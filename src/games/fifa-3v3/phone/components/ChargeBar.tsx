"use client";
import { useEffect, useRef } from "react";
import { CHARGE, chargeLevel, chargeZone, isTap } from "../../engine/charge";
import { usePhoneStore } from "../phone-store";

/** The bar's colours, zone by zone, uncovered as it fills. */
const FILL = `linear-gradient(90deg, #22c55e 0 ${CHARGE.yellow * 100}%, #facc15 ${CHARGE.yellow * 100}% ${CHARGE.red * 100}%, #ef4444 ${CHARGE.red * 100}%)`;

/**
 * The shot's charge bar. It pops up once Shoot/Pass has been held past a
 * tap with the ball, and fills from left to right through green, yellow
 * and red on the phone's own clock, the same measure the host is sent
 * on release. It caps at full; held on, the shot goes by itself.
 */
export function ChargeBar({ hasBall }: { hasBall: boolean }) {
  const since = usePhoneStore((s) => s.shootSince);
  const fillRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    // Drawn straight onto the elements every frame rather than through React state.
    if (since === null || !hasBall) {
      bar?.classList.remove("fifa-charge--on");
      return;
    }
    let frame = 0;
    const draw = () => {
      const held = (performance.now() - since) / 1000;
      const level = chargeLevel(held);
      bar?.classList.toggle("fifa-charge--on", !isTap(held));
      // The full coloured bar is uncovered from the left, so each zone keeps its own colour.
      if (fillRef.current) fillRef.current.style.clipPath = `inset(0 ${100 - level * 100}% 0 0)`;
      if (needleRef.current) needleRef.current.style.left = `${level * 100}%`;
      if (bar) bar.dataset.zone = chargeZone(level);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [since, hasBall]);

  return (
    <div ref={barRef} className="fifa-charge" aria-hidden="true">
      <div className="fifa-charge__track">
        <span className="fifa-charge__zone fifa-charge__zone--green" style={{ width: `${CHARGE.yellow * 100}%` }} />
        <span className="fifa-charge__zone fifa-charge__zone--yellow" style={{ width: `${(CHARGE.red - CHARGE.yellow) * 100}%` }} />
        <span className="fifa-charge__zone fifa-charge__zone--red" style={{ width: `${(1 - CHARGE.red) * 100}%` }} />
        <div ref={fillRef} className="fifa-charge__fill" style={{ background: FILL }} />
        <div ref={needleRef} className="fifa-charge__needle" />
      </div>
      <span className="fifa-charge__label">Power</span>
    </div>
  );
}
