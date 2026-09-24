"use client";
import { useMemo } from "react";
import { CameraCalibrate, ModelLoader, useKitStatus, type CameraKit } from "@/games/kit/camera";
import { GuardJabCheck } from "./GuardJabCheck";
import { useSession } from "./session-context";

/**
 * Getting ready: the camera and the body tracking download, then
 * calibration. Each player finds their spot and stands tall, then shows
 * their guard and throws one jab, so they know the game can see them box.
 */
export function Setup() {
  const session = useSession();
  const kit = session.kit;
  if (!kit) return null;
  return <SetupFor kit={kit} />;
}

function SetupFor({ kit }: { kit: CameraKit }) {
  const session = useSession();
  const status = useKitStatus(kit);
  const extra = useMemo(
    () => ({
      title: "Show your guard, then jab",
      text: "Both gloves up by your face. Then punch once at the screen.",
      render: ({ done }: { done: () => void }) => <GuardJabCheck kit={kit} done={done} />,
    }),
    [kit],
  );
  return (
    <section className="bx-setup">
      {status.ready ? (
        <div className="bx-setup__calibrate">
          <CameraCalibrate kit={kit} extra={extra} onDone={() => session.calibrated()} onPlayerDone={() => session.audio.tick()} />
        </div>
      ) : (
        <div className="bx-setup__loader">
          <ModelLoader kit={kit} title="Getting the camera ready">
            <p className="bx-setup__hint">Stand about two metres back, with your head and hands in view.</p>
          </ModelLoader>
        </div>
      )}
      <button type="button" className="bx-back" onClick={() => session.menu()}>
        Back
      </button>
    </section>
  );
}
