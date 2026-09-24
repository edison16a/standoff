"use client";
import { useCallback } from "react";
import type { PhoneState } from "../../protocol";
import { BrakeIcon, DriveIcon } from "../../ui/icons";
import { ordinal } from "../../ui/format";
import { useControllerStore } from "../controller-store";
import { HoldButton } from "./HoldButton";
import { PowerButton } from "./PowerButton";
import { useController } from "./session-context";
import { SteerArc } from "./SteerArc";

const EFFECTS = { stun: "Spun out", ice: "Iced up", ghost: "Invisible", shield: "Shielded", boost: "Boost" } as const;

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

/** The middle: the countdown, then the place and lap, and anything that just happened. */
function Status({ host }: { host: PhoneState }) {
  const steerMode = useControllerStore((state) => state.steerMode);
  const counting = host.phase === "countdown";
  const place = host.place ? ordinal(host.place) : "";
  const note = host.wrongWay ? "Wrong way" : host.effect && host.effect !== "boost" ? EFFECTS[host.effect] : null;
  return (
    <div className="mk-pad__middle">
      {/* A calm comes before the 3, with no number yet. */}
      {counting ? (
        <strong className={`mk-pad__count ${host.countdown === null ? "mk-pad__count--word" : ""}`}>{host.countdown ?? "Ready"}</strong>
      ) : (
        <strong className="mk-pad__place">{place}</strong>
      )}
      <span className="mk-pad__lap">{counting ? `${host.laps} laps` : host.finished ? "Finished" : `Lap ${host.lap} of ${host.laps}`}</span>
      {steerMode === "buttons" ? <SteerButtons /> : <SteerArc />}
      <span className={`mk-pad__note ${host.wrongWay ? "mk-pad__note--warn" : ""}`}>{counting ? "Press Drive just before Go for a rocket start" : note}</span>
    </div>
  );
}

/**
 * The phone while racing, held sideways like a steering wheel. The left
 * thumb has Brake at the edge and the power up just inside it, the right
 * thumb has Drive, and the middle shows the place and the lap.
 */
export function DrivePad({ host }: { host: PhoneState }) {
  const session = useController();
  const drive = useCallback((held: boolean) => session.setPedals({ drive: held }), [session]);
  const brake = useCallback((held: boolean) => session.setPedals({ brake: held }), [session]);

  return (
    <div className={`mk-pad ${host.effect ? `mk-pad--${host.effect}` : ""}`}>
      <HoldButton className="mk-pedal mk-pedal--brake" label="Brake" onHold={brake}>
        <BrakeIcon />
        <span className="mk-pedal__label">Brake</span>
      </HoldButton>
      <PowerButton host={host} />
      <Status host={host} />
      <HoldButton className="mk-pedal mk-pedal--drive" label="Drive" onHold={drive}>
        <DriveIcon />
        <span className="mk-pedal__label">Drive</span>
      </HoldButton>
    </div>
  );
}
