import { cameraProblemOf } from "../device/camera-errors";
import { cameraSupport, listCameras, openCamera, stopStream, type OpenedCamera } from "../device/webcam";
import type { StatusStore } from "./kit-status";

/**
 * The computer's camera and the hidden video element the model reads.
 * The video sits in the page, nearly invisible, because some browsers
 * stop handing out frames for a video that is not in the document.
 */
export class CameraSource {
  private opened: OpenedCamera | null = null;
  private element: HTMLVideoElement | null = null;
  private attempt = 0;
  private readonly onDevices = () => void this.refreshDevices();

  constructor(
    private readonly store: StatusStore,
    private readonly onVideo: (video: HTMLVideoElement | null) => void,
  ) {
    navigator.mediaDevices?.addEventListener?.("devicechange", this.onDevices);
  }

  get video(): HTMLVideoElement | null {
    return this.element;
  }

  /** Opens the camera, or another one. True once it is live, false if it failed, with the reason in the status. */
  async open(deviceId?: string | null): Promise<boolean> {
    const attempt = ++this.attempt;
    this.close();
    const unsupported = cameraSupport();
    if (unsupported) {
      this.store.camera({ state: "problem", problem: unsupported });
      return false;
    }
    this.store.camera({ state: "opening", problem: null });
    try {
      const opened = await openCamera(deviceId);
      if (attempt !== this.attempt) {
        stopStream(opened.stream);
        return false;
      }
      this.opened = opened;
      opened.track.addEventListener("ended", () => {
        if (this.opened === opened) this.store.camera({ state: "problem", problem: "lost", stream: null });
      });
      const video = await this.play(opened.stream);
      if (attempt !== this.attempt) return false;
      const { deviceId: id, label } = opened;
      this.store.camera({ state: "live", deviceId: id, label, stream: opened.stream, width: video.videoWidth || opened.width, height: video.videoHeight || opened.height });
      this.onVideo(video);
      void this.refreshDevices();
      return true;
    } catch (error) {
      if (attempt === this.attempt) this.store.camera({ state: "problem", problem: cameraProblemOf(error), stream: null });
      return false;
    }
  }

  close(): void {
    this.onVideo(null);
    stopStream(this.opened?.stream);
    this.opened = null;
    if (this.element) {
      this.element.srcObject = null;
      this.element.remove();
      this.element = null;
    }
    if (this.store.getSnapshot().camera.state === "live") this.store.camera({ state: "idle", stream: null });
  }

  dispose(): void {
    this.attempt++;
    this.close();
    navigator.mediaDevices?.removeEventListener?.("devicechange", this.onDevices);
  }

  private async play(stream: MediaStream): Promise<HTMLVideoElement> {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.setAttribute("aria-hidden", "true");
    Object.assign(video.style, { position: "fixed", right: "0", bottom: "0", width: "4px", height: "4px", opacity: "0.01", pointerEvents: "none", zIndex: "-1" });
    video.srcObject = stream;
    document.body.appendChild(video);
    this.element = video;
    await video.play().catch(() => undefined);
    // Wait for the first frame, but not forever: a camera that never sends one still shows as on.
    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.addEventListener("loadeddata", resolve, { once: true });
        setTimeout(resolve, 5000);
      });
    }
    return video;
  }

  private async refreshDevices(): Promise<void> {
    this.store.camera({ devices: await listCameras() });
  }
}
