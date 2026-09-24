import type { Body } from "../engine/body";
import type { Baseline } from "../engine/calibration";
import type { MoveEvent, MoveState } from "../engine/gestures/moves";
import type { Pose } from "../engine/landmarks";
import { baselineFor } from "../engine/sequence";
import { syntheticPose, type PoseSpec } from "../engine/synthetic";
import { poseAt, timelineLength, type PoseKey } from "../engine/timeline";
import type { CameraKit } from "./camera-kit";
import type { KitStatus } from "./kit-status";

/**
 * Development only: `window.__cameraKit`, for driving camera games from
 * Playwright without a person or a camera. Poses given here replace what
 * the camera sees for that player. A pose without an `x` stands in the
 * player's own spot.
 */
export interface CameraKitTestHooks {
  /** Holds a pose for a player: a made up one, 33 real points, or null for nobody there. */
  inject(slot: number, pose: PoseSpec | Pose | null): void;
  /** Plays a scripted movement for a player. Resolves when it ends, then its last pose holds. */
  play(slot: number, keys: PoseKey[], options?: { loop?: boolean }): Promise<void>;
  /** Stops injecting, back to the camera, or to standing still in fake mode. */
  release(slot?: number): void;
  /** Gives players a baseline straight away, as if they had calibrated standing in their spots. */
  calibrate(slot?: number, pose?: PoseSpec): Baseline[];
  status(): Omit<KitStatus, "camera"> & { camera: Omit<KitStatus["camera"], "stream"> };
  body(slot: number): Body | null;
  moves(slot: number): MoveState | null;
  /** The last 200 moves, oldest first. */
  events: MoveEvent[];
  /** Returns the moves so far and clears the list. */
  takeEvents(): MoveEvent[];
  kit: CameraKit;
}

declare global {
  interface Window {
    __cameraKit?: CameraKitTestHooks;
    /** Set before the page loads (tools/testing/fake-camera.js) to run camera games without a camera. */
    __cameraKitFake?: boolean;
  }
}

type Script =
  | { kind: "pose"; pose: Pose | null }
  | { kind: "spec"; spec: PoseSpec }
  | { kind: "timeline"; keys: PoseKey[]; start: number | null; loop: boolean; done: () => void };

const EVENT_LIMIT = 200;

/** Test mode is asked for with `?camera=fake` or by the fake camera script, and never in production. */
export function wantsFakeCamera(): boolean {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return false;
  return window.__cameraKitFake === true || new URLSearchParams(window.location.search).get("camera") === "fake";
}

export function installTestHooks(kit: CameraKit): () => void {
  if (typeof window === "undefined") return () => undefined;
  const scripts = new Map<number, Script>();
  const fake = kit.getSnapshot().fake;
  const home = (slot: number, spec: PoseSpec = {}): PoseSpec => ({ x: kit.spots[slot - 1]?.x ?? 0.5, ...spec });
  const aspect = () => kit.getSnapshot().camera.width / kit.getSnapshot().camera.height || 16 / 9;

  kit.setOverrides((time) => {
    const out = new Map<number, Pose | null>();
    for (let slot = 1; slot <= kit.players; slot++) {
      const script = scripts.get(slot) ?? (fake ? { kind: "spec" as const, spec: home(slot) } : null);
      if (!script) continue;
      if (script.kind === "pose") out.set(slot, script.pose);
      else if (script.kind === "spec") out.set(slot, syntheticPose(script.spec, aspect()));
      else {
        script.start ??= time;
        const length = timelineLength(script.keys);
        let t = time - script.start;
        if (script.loop && length > 0) t %= length;
        // Keys without an x happen in the player's own spot.
        out.set(slot, syntheticPose(poseAt(script.keys, t, home(slot)), aspect()));
        if (!script.loop && t >= length) {
          scripts.set(slot, { kind: "spec", spec: poseAt(script.keys, length, home(slot)) });
          script.done();
        }
      }
    }
    return out;
  });

  const events: MoveEvent[] = [];
  const stopEvents = kit.onMove((event) => {
    events.push(event);
    if (events.length > EVENT_LIMIT) events.splice(0, events.length - EVENT_LIMIT);
  });

  const hooks: CameraKitTestHooks = {
    inject(slot, pose) {
      if (pose === null || isPose(pose)) scripts.set(slot, { kind: "pose", pose });
      else scripts.set(slot, { kind: "spec", spec: home(slot, pose) });
    },
    play(slot, keys, options = {}) {
      return new Promise((resolve) => scripts.set(slot, { kind: "timeline", keys, start: null, loop: !!options.loop, done: resolve }));
    },
    release(slot) {
      if (slot === undefined) scripts.clear();
      else scripts.delete(slot);
    },
    calibrate(slot, pose = {}) {
      const slots = slot ? [slot] : Array.from({ length: kit.players }, (_, i) => i + 1);
      return slots.map((s) => {
        const baseline = baselineFor(home(s, pose), s, aspect());
        kit.setBaseline(s, baseline);
        return baseline;
      });
    },
    status() {
      // A MediaStream cannot cross into Playwright, so it is left out.
      const status = kit.getSnapshot();
      const camera: Partial<KitStatus["camera"]> = { ...status.camera };
      delete camera.stream;
      return { ...status, camera: camera as Omit<KitStatus["camera"], "stream"> };
    },
    body: (slot) => kit.body(slot),
    moves: (slot) => kit.moves(slot),
    events,
    takeEvents: () => events.splice(0, events.length),
    kit,
  };
  window.__cameraKit = hooks;
  return () => {
    stopEvents();
    kit.setOverrides(null);
    if (window.__cameraKit === hooks) delete window.__cameraKit;
  };
}

function isPose(value: PoseSpec | Pose): value is Pose {
  return Array.isArray((value as Pose).landmarks);
}
