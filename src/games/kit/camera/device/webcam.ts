import { CameraError, cameraProblemOf, type CameraProblem } from "./camera-errors";

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface OpenedCamera {
  stream: MediaStream;
  track: MediaStreamTrack;
  deviceId: string;
  label: string;
  width: number;
  height: number;
}

/** The camera this computer used last, so a laptop with a webcam plugged in keeps using the webcam. */
const CHOSEN_KEY = "standoff:camera";

/** Why the camera cannot be used here at all, before asking for it. Null when it can. */
export function cameraSupport(): CameraProblem | null {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "unsupported";
  // Browsers only offer the camera on https and localhost. On a plain http address mediaDevices is missing.
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return null;
}

/**
 * Opens a camera at about 1280 by 720 and 30 frames a second, facing the
 * user. With no id it tries the camera chosen last time, then any.
 */
export async function openCamera(deviceId: string | null = rememberedCamera()): Promise<OpenedCamera> {
  const problem = cameraSupport();
  if (problem) throw new CameraError(problem);
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
  };
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
  } catch (error) {
    // The remembered camera is gone, so any camera will do.
    if (deviceId && cameraProblemOf(error) === "no-camera") return openCamera(null);
    throw new CameraError(cameraProblemOf(error), error);
  }
  const track = stream.getVideoTracks()[0];
  if (!track) {
    stopStream(stream);
    throw new CameraError("no-camera");
  }
  const settings = track.getSettings();
  const opened = {
    stream,
    track,
    deviceId: settings.deviceId ?? deviceId ?? "",
    label: track.label || "Camera",
    width: settings.width ?? 1280,
    height: settings.height ?? 720,
  };
  remember(opened.deviceId);
  return opened;
}

/** Every camera, named. Names only appear once the player has allowed the camera. */
export async function listCameras(): Promise<CameraDevice[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === "videoinput" && device.deviceId)
      .map((device, i) => ({ deviceId: device.deviceId, label: device.label || `Camera ${i + 1}` }));
  } catch {
    return [];
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
}

function rememberedCamera(): string | null {
  try {
    return localStorage.getItem(CHOSEN_KEY);
  } catch {
    return null;
  }
}

function remember(deviceId: string): void {
  try {
    if (deviceId) localStorage.setItem(CHOSEN_KEY, deviceId);
  } catch {
    // Private windows can refuse storage. The camera still works, it is just not remembered.
  }
}
