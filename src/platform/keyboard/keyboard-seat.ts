import type { Payload } from "@/platform/protocol";
import type { PageMessage, PanelMessage } from "./bridge";
import { HostLog } from "./host-log";
import { KeyboardRuntime, type RuntimeTimers } from "./keyboard-runtime";
import type { KeyInput } from "./key-state";
import type { KeyboardBinding, StagePointer } from "./types";
import type { VirtualState } from "./virtual-phone";

/**
 * The keyboard seat as the host page runs it. Keys and the mouse are read
 * here, where the binding runs, and what the binding sends goes down to
 * the phone panel, which sends it as the seat's phone. What the host says
 * to that phone comes back up, so the binding can read it.
 */
export class KeyboardSeat {
  private readonly log = new HostLog();
  private runtime: KeyboardRuntime | null = null;

  constructor(
    private readonly binding: KeyboardBinding | undefined,
    private readonly toPanel: (message: PageMessage) => void,
    private readonly onState: (state: VirtualState) => void = () => undefined,
    private readonly timers?: RuntimeTimers,
  ) {}

  /** Whatever the phone panel says. */
  fromPanel(message: PanelMessage): void {
    switch (message.type) {
      case "status":
        this.onState(message.state);
        if (message.state.seat !== null && message.state.stage === "playing") this.seated(message.state.seat);
        return;
      case "host":
        return this.log.record(message.payload);
      case "key":
        this.key(message.input);
        return;
      case "blur":
        return;
    }
  }

  /** True when the binding used the key, so the page stops the browser's own action. */
  key(input: KeyInput): boolean {
    return this.runtime?.key(input) ?? false;
  }

  pointer(event: StagePointer): void {
    this.runtime?.pointer(event);
  }

  release(): void {
    this.runtime?.release();
  }

  dispose(): void {
    this.runtime?.dispose();
    this.runtime = null;
  }

  /** The binding starts once the seat is known, and only once. A rejoin keeps the same seat. */
  private seated(seat: number): void {
    if (this.runtime) return;
    const kinds = this.binding?.replaces ?? [];
    if (kinds.length > 0) this.toPanel({ type: "replace", kinds });
    const ctx = {
      seat,
      send: (payload: Payload) => this.toPanel({ type: "send", payload, lossy: false }),
      sendLossy: (payload: Payload) => this.toPanel({ type: "send", payload, lossy: true }),
      last: (kind?: string) => this.log.last(kind),
    };
    this.runtime = new KeyboardRuntime(this.binding, ctx, this.timers);
  }
}
