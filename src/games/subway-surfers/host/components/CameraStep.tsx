"use client";
import { useEffect } from "react";
import { CameraCalibrate, ModelLoader, useKitStatus, type CameraKit } from "@/games/kit/camera";
import { useSession } from "./session-context";

/** Until the camera is on and the body tracking has downloaded and started. */
export function CameraStep({ kit }: { kit: CameraKit }) {
  const session = useSession();
  const status = useKitStatus(kit);
  useEffect(() => {
    if (status.ready) session.cameraReady();
  }, [status.ready, session]);
  const stuck = !!status.camera.problem || status.model.state === "problem";
  return (
    <div className="ss-center">
      <ModelLoader kit={kit} title="Getting the camera ready">
        <div className="ss-center__actions">
          <button type="button" className="ss-button ss-button--quiet" onClick={() => session.toLobby()}>
            Back
          </button>
          {stuck && (
            <button type="button" className="ss-button ss-button--quiet" onClick={() => session.playWithKeys()}>
              Play with the keyboard
            </button>
          )}
        </div>
      </ModelLoader>
    </div>
  );
}

/** Each player finds their spot and stands tall and still while their ring fills. */
export function CalibrateStep({ kit }: { kit: CameraKit }) {
  const session = useSession();
  return (
    <div className="ss-calibrate">
      <CameraCalibrate
        kit={kit}
        names={session.names()}
        onPlayerDone={(slot) => session.sound.sfx.tick(session.sound.panFor(slot))}
        onDone={() => session.calibrated()}
      />
      <button type="button" className="ss-button ss-button--quiet ss-calibrate__back" onClick={() => session.toLobby()}>
        Back
      </button>
    </div>
  );
}
