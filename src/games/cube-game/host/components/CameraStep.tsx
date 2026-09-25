"use client";
import { useEffect, useMemo } from "react";
import { CameraCalibrate, ModelLoader, useKitStatus, type CameraKit } from "@/games/kit/camera";
import { JumpCheck } from "./JumpCheck";
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
    <div className="cg-center">
      <ModelLoader kit={kit} title="Getting the camera ready">
        <div className="cg-center__actions">
          <button type="button" className="cg-button cg-button--quiet" onClick={() => session.toMenu()}>
            Back
          </button>
          {stuck && (
            <button type="button" className="cg-button cg-button--quiet" onClick={() => session.start("keys")}>
              Play with the keyboard
            </button>
          )}
        </div>
      </ModelLoader>
    </div>
  );
}

/** Stand in your spot, waist up in the picture, stand tall and still, then one jump to check the camera sees it. */
export function CalibrateStep({ kit }: { kit: CameraKit }) {
  const session = useSession();
  const extra = useMemo(
    () => ({
      title: "Jump once to check",
      text: "Your head going up over its line is a jump. That is the only move in the game.",
      render: ({ done }: { done: () => void }) => <JumpCheck kit={kit} onJump={() => session.sound.sfx.tick(true)} done={done} />,
    }),
    [kit, session],
  );
  return (
    <div className="cg-calibrate">
      <CameraCalibrate kit={kit} extra={extra} onPlayerDone={() => session.sound.sfx.tick()} onDone={() => session.calibrated()} />
      <button type="button" className="cg-button cg-button--quiet cg-calibrate__back" onClick={() => session.toMenu()}>
        Back
      </button>
    </div>
  );
}
