/** Every way the camera can fail, each with its own plain advice on screen. */
export type CameraProblem = "insecure" | "unsupported" | "no-camera" | "denied" | "busy" | "lost" | "failed";

/** A camera failure the kit understands, carrying the browser's own error for the console. */
export class CameraError extends Error {
  constructor(
    readonly problem: CameraProblem,
    readonly original?: unknown,
  ) {
    super(`Camera: ${problem}`);
    this.name = "CameraError";
  }
}

/** Sorts the browser's getUserMedia errors, which differ in name between browsers and versions. */
export function cameraProblemOf(error: unknown): CameraProblem {
  if (error instanceof CameraError) return error.problem;
  const name = typeof error === "object" && error && "name" in error ? String((error as { name: unknown }).name) : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "no-camera";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    default:
      return "failed";
  }
}

export const PROBLEM_TEXT: Record<CameraProblem, { title: string; advice: string }> = {
  insecure: {
    title: "The camera needs a secure address",
    advice: "Open Standoff at localhost on this computer, or at its https address, then try again.",
  },
  unsupported: {
    title: "This browser cannot use a camera",
    advice: "Open Standoff in the latest Chrome, Edge, Firefox or Safari.",
  },
  "no-camera": {
    title: "No camera found",
    advice: "Plug in a webcam, or check the built in one is switched on, then try again.",
  },
  denied: {
    title: "The camera is blocked",
    advice: "Allow the camera for this site from the icon in the address bar, then try again.",
  },
  busy: {
    title: "The camera is busy",
    advice: "Another app or tab is using it. Close that, then try again.",
  },
  lost: {
    title: "The camera stopped",
    advice: "It may have been unplugged. Plug it back in, then try again.",
  },
  failed: {
    title: "The camera would not start",
    advice: "Try again, or pick another camera.",
  },
};
