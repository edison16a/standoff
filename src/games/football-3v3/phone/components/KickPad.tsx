"use client";
import { useEffect, useRef } from "react";
import { PadButton } from "@/games/kit/pad/PadButton";
import { inGreen, meterAim, meterPower } from "../../engine/kick";
import { KICK } from "../../engine/tuning";
import type { PhoneState } from "../../protocol";
import { usePhoneStore } from "../phone-store";
import { ButtonFace } from "./ButtonFace";
import { usePhone } from "./session-context";

/**
 * The kicker's two meters, drawn on the phone's own clock so the marker
 * the player stops is exactly the reading the host is sent. First a
 * marker sweeps left and right across the accuracy bar: stop it in the
 * green for a straight kick. Then one climbs and falls on the power bar:
 * stop it high for a long one. Each tap moves straight on to the next
 * meter here, without waiting for the host to answer.
 */
export function KickPad({ host }: { host: PhoneState }) {
  const phone = usePhone();
  const local = usePhoneStore((s) => s.kick);
  const aimRef = useRef<HTMLSpanElement>(null);
  const powerRef = useRef<HTMLSpanElement>(null);

  // The moving marker is drawn straight onto its element every frame, not through React.
  useEffect(() => {
    if (!local || local.stage === "done") return;
    let frame = 0;
    const draw = () => {
      const t = (performance.now() - local.since) / 1000;
      if (local.stage === "aim" && aimRef.current) aimRef.current.style.left = `${((meterAim(t) + 1) / 2) * 100}%`;
      if (local.stage === "power" && powerRef.current) powerRef.current.style.bottom = `${meterPower(t) * 100}%`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [local]);

  const green = KICK.green * 100;
  const locked = local?.aim ?? null;
  const label = local?.stage === "power" ? "Power" : local?.stage === "done" ? "Kicked" : "Aim";
  const hint = local?.stage === "aim" ? "Tap in the green to kick it straight" : locked === null ? "" : inGreen(locked) ? "Straight. Now the power" : "Off line. Now the power";
  return (
    <div className="fb-kick">
      <div className="fb-kick__meters">
        <p className="fb-kick__title">{host.meter?.fieldGoal === false ? "Punt" : "Field goal"}: stop the marker</p>
        <div className={`fb-kick__aim ${local?.stage === "aim" ? "fb-kick__aim--live" : ""}`} aria-label="Accuracy">
          <span className="fb-kick__green" style={{ left: `${50 - green / 2}%`, width: `${green}%` }} />
          {locked !== null ? (
            <span className={`fb-kick__mark fb-kick__mark--locked ${inGreen(locked) ? "fb-kick__mark--good" : ""}`} style={{ left: `${((locked + 1) / 2) * 100}%` }} />
          ) : (
            <span ref={aimRef} className="fb-kick__mark" />
          )}
        </div>
        <p className="fb-kick__hint">{hint}</p>
      </div>
      <div className={`fb-kick__power ${local?.stage === "power" ? "fb-kick__power--live" : ""}`} aria-label="Power">
        <span className="fb-kick__top" />
        {local?.stage === "power" && <span ref={powerRef} className="fb-kick__level" />}
      </div>
      <div className="fb-kick__button">
        <PadButton label={`Kick, ${label}`} size="lg" colour="#f5c518" disabled={!local || local.stage === "done"} onDown={() => phone.kick()}>
          <ButtonFace icon="kick" text={label} />
        </PadButton>
      </div>
    </div>
  );
}
