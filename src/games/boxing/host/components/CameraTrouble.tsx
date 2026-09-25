"use client";
import { PROBLEM_TEXT, useKitStatus, type CameraKit } from "@/games/kit/camera";

/**
 * When the camera stops working after setup, say what happened and how
 * to fix it, over everything. The fight is already paused, since nobody
 * can be seen.
 */
export function CameraTrouble({ kit }: { kit: CameraKit }) {
  const status = useKitStatus(kit);
  const problem = status.camera.problem;
  if (!problem) return null;
  const text = PROBLEM_TEXT[problem];
  return (
    <div className="bx-trouble" role="alert">
      <h2>{text.title}</h2>
      <p>{text.advice}</p>
      <button type="button" className="bx-button" onClick={() => void kit.start()}>
        Try again
      </button>
    </div>
  );
}
