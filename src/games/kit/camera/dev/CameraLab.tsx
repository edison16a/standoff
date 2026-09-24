"use client";
import "./lab.css";
import { useEffect, useState } from "react";
import type { Baseline } from "../engine/calibration";
import { CameraKit } from "../host/camera-kit";
import type { ModelVariant } from "../model/model-files";
import { CameraCalibrate } from "../ui/CameraCalibrate";
import { CameraPreview } from "../ui/CameraPreview";
import { CornerPreview } from "../ui/CornerPreview";
import { ModelLoader } from "../ui/ModelLoader";
import { useKitStatus } from "../ui/use-kit";
import { LabReadout } from "./LabReadout";

export interface LabSettings {
  players: number;
  model: "auto" | ModelVariant;
  delegate: "GPU" | "CPU";
  needs: "upper" | "full";
  /** Adds a demo extra step to calibration: hold up a guard. */
  guardStep: boolean;
}

type Stage = "calibrate" | "play";

/**
 * A bench for the camera kit, at /dev/camera in development. It walks
 * through what a game does: load, calibrate, play. The tools in
 * tools/testing drive it with a fake camera or a video file.
 */
export function CameraLab({ settings }: { settings: LabSettings }) {
  const [kit, setKit] = useState<CameraKit | null>(null);
  useEffect(() => {
    // A game makes its kit in createHost. The lab has no room, so it makes one per mount instead.
    const next = new CameraKit({ players: settings.players, model: settings.model, delegate: settings.delegate });
    let alive = true;
    void Promise.resolve().then(() => alive && setKit(next));
    return () => {
      alive = false;
      next.dispose();
    };
  }, [settings.players, settings.model, settings.delegate]);
  return kit ? <Bench kit={kit} settings={settings} /> : null;
}

function Bench({ kit, settings }: { kit: CameraKit; settings: LabSettings }) {
  const status = useKitStatus(kit);
  const [stage, setStage] = useState<Stage>("calibrate");
  const [baselines, setBaselines] = useState<Baseline[]>([]);

  if (!status.ready) {
    return (
      <main className="cam-lab cam-lab--center" data-stage="loading">
        <ModelLoader kit={kit} />
      </main>
    );
  }
  if (stage === "calibrate") {
    return (
      <main className="cam-lab" data-stage="calibrate">
        <CameraCalibrate
          kit={kit}
          needs={settings.needs}
          extra={
            settings.guardStep
              ? {
                  title: "Show your guard",
                  text: "Both fists up by your face.",
                  render: ({ kit: k, done }) => <GuardCheck kit={k} done={done} />,
                }
              : undefined
          }
          onDone={(all) => {
            setBaselines(all);
            setStage("play");
          }}
        />
      </main>
    );
  }
  return (
    <main className="cam-lab" data-stage="play">
      <CameraPreview kit={kit} />
      <LabReadout kit={kit} />
      <CornerPreview kit={kit} corner="bottom-left" width={240} />
      <button type="button" className="cam-button cam-lab__again" onClick={() => setStage("calibrate")}>
        Calibrate again
      </button>
      <pre className="cam-lab__baselines" data-testid="camera-baselines">
        {JSON.stringify(baselines.map((b) => ({ slot: b.slot, x: +b.centerX.toFixed(3), scale: +b.scale.toFixed(3) })))}
      </pre>
    </main>
  );
}

/** The demo extra step: done once every player holds a guard for a moment. */
function GuardCheck({ kit, done }: { kit: CameraKit; done: () => void }) {
  const [up, setUp] = useState<boolean[]>([]);
  useEffect(() => {
    let since: number | null = null;
    return kit.onFrame((frame) => {
      const guards = frame.moves.map((m) => m.guard);
      setUp((old) => (old.join() === guards.join() ? old : guards));
      since = guards.every(Boolean) ? (since ?? frame.time) : null;
      if (since !== null && frame.time - since > 600) done();
    });
  }, [kit, done]);
  return <div className="cam-lab__guard">{up.map((g, i) => `Player ${i + 1}: ${g ? "guard up" : "fists up"}`).join("   ")}</div>;
}
