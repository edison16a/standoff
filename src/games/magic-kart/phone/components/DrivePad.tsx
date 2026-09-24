"use client";
import { ordinal } from "../../ui/format";
import { useCallback } from "react";
import { ITEM_NAMES } from "../../engine/items";
import type { PhoneState } from "../../protocol";
import { useControllerStore } from "../controller-store";
import { HoldButton } from "./HoldButton";
import { BrakeIcon, CubeGlyph, DriveIcon, ItemIcon } from "../../ui/icons";
import { Roulette } from "../../ui/Roulette";
import { useController } from "./session-context";
import { SteerGauge } from "./SteerGauge";

const EFFECTS = { stun: "Spun out", ice: "Iced up", ghost: "Invisible", shield: "Shielded", boost: "Boost" } as const;

/** The power up button: shows the held item, spins while the roulette runs, tap to fire. */
function AbilityButton({ host }: { host: PhoneState }) {
  const session = useController();
  const item = host.item;
  const live = item !== null && !host.rolling && host.phase === "racing";
  return (
    <button
      type="button"
      className={`mk-ability ${item ? "mk-ability--full" : ""} ${host.rolling ? "mk-ability--rolling" : ""} ${live ? "mk-ability--live" : ""}`}
      disabled={!live}
      aria-label={item ? `Use ${ITEM_NAMES[item]}` : "No power up"}
      onPointerDown={() => live && session.useItem()}
    >
      {item ? host.rolling ? <Roulette /> : <ItemIcon item={item} /> : <CubeGlyph />}
      {!host.rolling && <span className="mk-ability__label">{item ? ITEM_NAMES[item] : "Get a cube"}</span>}
    </button>
  );
}

/** Arrows for phones with no tilt sensor. */
function SteerButtons() {
  const session = useController();
  const left = useCallback((held: boolean) => session.setPedals({ left: held }), [session]);
  const right = useCallback((held: boolean) => session.setPedals({ right: held }), [session]);
  return (
    <div className="mk-pad__arrows">
      <HoldButton className="mk-arrow" label="Steer left" onHold={left}>
        <span aria-hidden="true">&#9664;</span>
      </HoldButton>
      <HoldButton className="mk-arrow" label="Steer right" onHold={right}>
        <span aria-hidden="true">&#9654;</span>
      </HoldButton>
    </div>
  );
}

/**
 * The phone while racing, held sideways like a wheel. Brake and the
 * power up sit under the left thumb, Drive under the right, and the
 * middle shows the place, the lap and anything that just happened.
 */
export function DrivePad({ host }: { host: PhoneState }) {
  const session = useController();
  const steerMode = useControllerStore((state) => state.steerMode);
  const drive = useCallback((held: boolean) => session.setPedals({ drive: held }), [session]);
  const brake = useCallback((held: boolean) => session.setPedals({ brake: held }), [session]);
  const counting = host.phase === "countdown";
  const place = host.place ? ordinal(host.place) : "";

  return (
    <div className={`mk-pad ${host.effect ? `mk-pad--${host.effect}` : ""}`}>
      <div className="mk-pad__left">
        <AbilityButton host={host} />
        <HoldButton className="mk-pedal mk-pedal--brake" label="Brake" onHold={brake}>
          <BrakeIcon />
          <span>Brake</span>
        </HoldButton>
      </div>
      <div className="mk-pad__middle">
        {counting ? (
          <strong className="mk-pad__count">{host.countdown || "Go"}</strong>
        ) : (
          <div className="mk-pad__status">
            <strong className="mk-pad__place">{host.finished ? `${place}!` : place}</strong>
            <span className="mk-pad__lap">{host.finished ? "Finished" : `Lap ${host.lap} of ${host.laps}`}</span>
          </div>
        )}
        {host.wrongWay && <strong className="mk-pad__warn">Wrong way</strong>}
        {!host.wrongWay && host.effect && host.effect !== "boost" && <span className="mk-pad__effect">{EFFECTS[host.effect]}</span>}
        {steerMode === "buttons" ? <SteerButtons /> : <SteerGauge />}
        {counting && <span className="mk-pad__hint">Press Drive just before Go for a rocket start</span>}
      </div>
      <HoldButton className="mk-pedal mk-pedal--drive" label="Drive" onHold={drive}>
        <DriveIcon />
        <span>Drive</span>
      </HoldButton>
    </div>
  );
}
