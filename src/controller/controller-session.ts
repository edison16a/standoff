import { AudioEngine } from "@/audio/audio-engine";
import { Sfx } from "@/audio/sfx";
import { MotionPipeline, type ControllerFrame } from "@/motion/motion-pipeline";
import { SocketClient } from "@/net/socket-client";
import type { CharacterId } from "@/shared/characters";
import type { HostMessage, PhoneMessage, ServerEnvelope, StrikeAction } from "@/shared/protocol";
import { clampTuning, DEFAULT_TUNING } from "@/shared/tuning";
import { useControllerStore as store } from "./controller-store";
import { buzz, ScreenAwake } from "./device";
import { MotionStream } from "./motion-stream";
import { readToken, writeToken } from "./seat-token";
import { motionSupport, requestMotionPermission, subscribeSensors } from "./sensors";

/** Phases where the host is drawing this fencer and wants the live reading. */
const STREAMING = new Set(["enGarde", "live", "halt", "paused"]);
/** The sword held level, for devices with no motion sensors. */
const LEVEL = { pitch: 0, yaw: 0, roll: 0 };
/** Fresh sockets to try when a join cannot find the room. */
const JOIN_RETRIES = 6;

/**
 * The phone's side of a game. It reads the sensors, turns them into sword
 * angles, footwork and strikes, and streams them to the host. It makes no
 * game decisions of its own: whether a jab landed is always the host's call.
 */
export class ControllerSession {
  readonly pipeline: MotionPipeline;
  private readonly socket: SocketClient;
  private readonly awake = new ScreenAwake();
  private sfx: Sfx | null = null;
  private stopSensors: (() => void) | null = null;
  private readonly motion: MotionStream;
  private joinRetries = 0;
  /** Footwork from the Forward and Back buttons: 1, -1 or 0. */
  private move = 0;

  constructor(private readonly code: string) {
    this.pipeline = new MotionPipeline(DEFAULT_TUNING, (action) => this.onStrike(action));
    this.motion = new MotionStream(
      () => this.frame,
      (frame) => this.socket.sendLossy({ type: "phone:send", payload: { kind: "motion", ...frame } }),
      () => STREAMING.has(store.getState().game?.phase ?? "lobby"),
    );
    this.socket = new SocketClient({
      onOpen: (send) => send({ type: "phone:join", code: this.code, token: readToken(this.code) ?? undefined }),
      onMessage: (message) => this.onMessage(message),
      onStatus: (status) =>
        store.setState(status === "replaced" ? { status, stage: "error", error: "replaced" } : { status }),
    });
  }

  /** The live reading being sent, for the gauges on screen. */
  get frame(): ControllerFrame {
    const sword = store.getState().inputMode === "touch" ? LEVEL : this.pipeline.sword;
    return { ...sword, move: this.move };
  }

  /**
   * Everything that needs a user gesture happens here, in one tap: motion
   * permission on iOS, audio unlock, and the screen wake lock.
   */
  async enable(): Promise<void> {
    const support = motionSupport();
    if (support === "insecure") {
      store.setState({ stage: "error", error: "insecure" });
      return;
    }
    const audio = new AudioEngine();
    void audio.unlock();
    this.sfx = new Sfx(audio);

    if (support === "ok") {
      if (!(await requestMotionPermission())) {
        store.setState({ stage: "error", error: "denied" });
        return;
      }
      this.stopSensors = subscribeSensors(this.pipeline, () => store.setState({ sensorsLive: true }));
    } else {
      store.setState({ inputMode: "touch" });
    }
    void this.awake.start();
    store.setState({ stage: "joining" });
    this.socket.connect();
    this.motion.start();
  }

  dispose(): void {
    this.motion.stop();
    this.stopSensors?.();
    this.awake.stop();
    this.socket.close();
  }

  calibrate(): boolean {
    const ok = this.pipeline.calibrate();
    if (ok) {
      store.setState({ calibrated: true });
      this.sfx?.click();
    }
    return ok;
  }

  /** No sensors: play with on screen buttons. */
  useTouchControls(): void {
    store.setState({ inputMode: "touch", calibrated: true });
  }

  pick(characterId: CharacterId): void {
    store.setState({ pick: characterId, ready: false });
    this.sfx?.click();
    this.send({ kind: "pick", characterId });
  }

  setReady(ready: boolean): void {
    store.setState({ ready });
    this.sfx?.click();
    this.send({ kind: "ready", ready });
  }

  /** Skip the replay, ask for a rematch, or ask for the computer as opponent. */
  press(payload: Extract<PhoneMessage, { kind: "skip" | "rematch" | "solo" }>): void {
    this.sfx?.click();
    this.send(payload);
  }

  /** Held Forward (1), held Back (-1), or neither (0). */
  setMove(value: -1 | 0 | 1): void {
    this.move = value;
  }

  /** Touch mode strike buttons go through the same path as detected ones. */
  strike(action: StrikeAction): void {
    this.onStrike(action);
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "phone:joined": {
        this.joinRetries = 0;
        writeToken(this.code, message.token);
        store.setState({ stage: "playing", slot: message.slot, error: null });
        this.resendChoices();
        return;
      }
      case "room:error":
        // Without a shared room store, a socket can land on a server
        // instance that has never heard of the room. Try a few fresh ones.
        if (message.reason === "not-found" && this.joinRetries < JOIN_RETRIES) {
          this.joinRetries += 1;
          this.socket.redial();
          return;
        }
        store.setState({ stage: "error", error: message.reason });
        return;
      case "room:closed":
        store.setState({ stage: "error", error: "closed" });
        this.dispose();
        return;
      case "host:away":
        store.setState({ hostAway: true });
        return;
      case "host:back":
        store.setState({ hostAway: false });
        this.resendChoices();
        return;
      case "host:message":
        this.onHost(message.payload);
        return;
    }
  }

  private onHost(message: HostMessage): void {
    switch (message.kind) {
      case "state": {
        // The host is the source of truth for picks: it refuses a taken fencer.
        const slot = store.getState().slot;
        const mine = slot ? { pick: message.picks[slot - 1] ?? null, ready: message.ready[slot - 1] ?? false } : {};
        store.setState({ game: message, ...mine });
        return;
      }
      case "tuning":
        this.pipeline.configure(clampTuning(message.tuning));
        return;
      case "recenter":
        this.pipeline.recenter();
        return;
      case "feedback":
        buzz(message.event);
        return;
    }
  }

  /** After a reconnect or a host reload, tell the host what we had chosen. */
  private resendChoices(): void {
    const { pick, ready } = store.getState();
    if (pick) this.send({ kind: "pick", characterId: pick });
    if (ready) this.send({ kind: "ready", ready });
  }

  private onStrike(action: StrikeAction): void {
    if (store.getState().game?.phase !== "live") return;
    this.send({ kind: "strike", action });
  }

  private send(payload: PhoneMessage): void {
    this.socket.send({ type: "phone:send", payload });
  }
}
