"use client";
import "../styles/loader.css";
import { useEffect, type ReactNode } from "react";
import { PROBLEM_TEXT } from "../device/camera-errors";
import type { CameraKit } from "../host/camera-kit";
import type { KitStatus } from "../host/kit-status";
import { CameraPicker } from "./CameraPicker";
import { useKitStatus } from "./use-kit";

export interface ModelLoaderProps {
  kit: CameraKit;
  title?: string;
  /** Starts the camera and the model on mount. On by default. */
  autoStart?: boolean;
  /** Extra content under the card, like the game's own hint. */
  children?: ReactNode;
}

export const PRIVACY_NOTE = "Body tracking runs on this computer. The camera picture never leaves it.";

const MODEL_PROBLEM = {
  title: "The body tracking could not download",
  advice: "Check this computer is online, then try again. After the first time it works offline.",
};

/**
 * The card a camera game shows until the camera is on and the model is
 * running: the camera's state, the model's download with a progress bar,
 * a clear way out of every problem, and the privacy promise.
 */
export function ModelLoader({ kit, title = "Getting the camera ready", autoStart = true, children }: ModelLoaderProps) {
  const status = useKitStatus(kit);
  useEffect(() => {
    if (autoStart) void kit.start();
  }, [kit, autoStart]);

  const problem = status.camera.problem ? PROBLEM_TEXT[status.camera.problem] : null;
  const problems = [
    ...(problem ? [problem] : []),
    ...(status.model.state === "problem" ? [MODEL_PROBLEM] : []),
  ];
  const share = status.model.total ? status.model.loaded / status.model.total : 0;
  return (
    <section className="cam-loader" aria-live="polite">
      <h2 className="cam-loader__title">{status.ready ? "Camera ready" : title}</h2>
      <div className="cam-loader__row">
        <span className={`cam-loader__dot cam-loader__dot--${dotFor(status.camera.state)}`} aria-hidden="true" />
        <span className="cam-loader__name">Camera</span>
        <span className="cam-loader__state">{cameraText(status)}</span>
      </div>
      <div className="cam-loader__row">
        <span className={`cam-loader__dot cam-loader__dot--${dotFor(status.model.state)}`} aria-hidden="true" />
        <span className="cam-loader__name">Body tracking</span>
        <span className="cam-loader__state">{modelText(status)}</span>
      </div>
      <div
        className="cam-loader__bar"
        role="progressbar"
        aria-label="Body tracking download"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
      >
        <span className="cam-loader__fill" style={{ width: `${Math.round((status.model.state === "ready" ? 1 : share) * 100)}%` }} />
      </div>
      {status.camera.state === "opening" && <p className="cam-loader__hint">If the browser asks to use the camera, choose Allow.</p>}
      {problems.length > 0 && (
        <div className="cam-loader__problem" role="alert">
          {problems.map((p) => (
            <div key={p.title}>
              <strong>{p.title}</strong>
              <p>{p.advice}</p>
            </div>
          ))}
          <div className="cam-loader__actions">
            <button type="button" className="cam-button" onClick={() => void kit.start()}>
              Try again
            </button>
            <CameraPicker kit={kit} />
          </div>
        </div>
      )}
      {!problem && status.camera.devices.length > 1 && <CameraPicker kit={kit} />}
      <p className="cam-loader__privacy">{PRIVACY_NOTE}</p>
      {children}
    </section>
  );
}

function dotFor(state: string): "wait" | "busy" | "ok" | "bad" {
  if (state === "live" || state === "ready") return "ok";
  if (state === "problem") return "bad";
  return state === "idle" ? "wait" : "busy";
}

function cameraText({ camera, fake }: KitStatus): string {
  if (fake) return "Test camera";
  switch (camera.state) {
    case "idle":
      return "Waiting";
    case "opening":
      return "Asking to use the camera";
    case "live":
      return camera.label ?? "On";
    case "problem":
      return camera.problem ? PROBLEM_TEXT[camera.problem].title : "Not working";
  }
}

function modelText({ model }: KitStatus): string {
  const mb = (bytes: number) => (bytes / 1_000_000).toFixed(1);
  switch (model.state) {
    case "idle":
      return "Waiting";
    case "downloading":
      if (!model.total) return "Getting ready";
      if (model.fromCache) return "Loading from this computer";
      return `Downloading ${mb(model.loaded)} of ${mb(model.total)} MB, just this once`;
    case "starting":
      return model.fromCache ? "Loaded from this computer, starting up" : "Downloaded, starting up";
    case "ready":
      return model.variant === "lite" ? "Ready, in its lighter version for this computer" : "Ready";
    case "problem":
      return "Could not download";
  }
}
