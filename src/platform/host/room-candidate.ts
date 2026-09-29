import { definitive, probeRoom, type ProbeOutcome } from "@/platform/net/room-probe";
import { SocketClient } from "@/platform/net/socket-client";
import type { ServerEnvelope } from "@/platform/protocol";
import { HandlerSwitch, type LinkPart } from "./host-link";
import { localMemory } from "./room-memory";
import { RoomKeeper, type OpenedRoom } from "./room-keeper";
import { RECHECK_MS } from "./room-watchdog";

/** The most one try at a new room may take, create and check together. */
export const CANDIDATE_MS = 15_000;
/** How long a discarded room's socket waits for its retire to be confirmed. */
const DISCARD_WAIT_MS = 3000;

export type CandidateResult = { ok: true; room: OpenedRoom } | { ok: false; reason: string };

export interface CandidateOptions {
  probe?: (room: { code: string; token: string }) => Promise<ProbeOutcome>;
  makeClient?: (handlers: HandlerSwitch) => SocketClient;
}

/**
 * A replacement room, built and checked on a fresh connection of its own
 * while the old room, its socket and its phones carry on untouched. Only
 * once it passes a check does the host swap over (see HostRoom), so a
 * remake that fails leaves nothing to undo.
 */
export class RoomCandidate {
  readonly keeper: RoomKeeper;
  private readonly client: SocketClient;
  private readonly handlers: HandlerSwitch;
  private room: OpenedRoom | null = null;
  private settle: ((result: CandidateResult) => void) | null = null;
  private cap: ReturnType<typeof setTimeout> | null = null;
  private recheck: ReturnType<typeof setTimeout> | null = null;
  private discarded = false;

  constructor(private readonly options: CandidateOptions = {}) {
    this.handlers = new HandlerSwitch({
      onOpen: (send, info) => this.keeper.announce(send, info),
      onMessage: (message) => this.onMessage(message),
      onStatus: () => undefined,
    });
    this.client = options.makeClient?.(this.handlers) ?? new SocketClient(this.handlers);
    const link = { send: (message: Parameters<SocketClient["send"]>[0]) => this.client.send(message), redial: () => this.client.redial() };
    this.keeper = new RoomKeeper(localMemory(), link, {
      opened: (room) => {
        this.room = room;
        void this.verify(room, 0);
      },
      lost: () => this.finish({ ok: false, reason: "lost" }),
      failed: (reason) => this.finish({ ok: false, reason }),
    });
  }

  start(game: string, seats: number): Promise<CandidateResult> {
    return new Promise((resolve) => {
      this.settle = resolve;
      this.cap = setTimeout(() => this.finish({ ok: false, reason: "timeout" }), CANDIDATE_MS);
      this.keeper.create(game, seats);
      this.client.connect();
    });
  }

  /** Gives up this room: it is ended by its token, since nobody is in it, and the socket goes. */
  discard(): void {
    if (this.discarded) return;
    this.discarded = true;
    this.finish({ ok: false, reason: "discarded" });
    this.keeper.dispose();
    const room = this.room;
    if (!room) return this.client.close();
    const close = setTimeout(() => this.client.close(), DISCARD_WAIT_MS);
    this.handlers.target = {
      onOpen: (send) => send({ type: "host:retire", code: room.code, token: room.token }),
      onMessage: (message) => {
        if (message.type !== "room:retired") return;
        clearTimeout(close);
        this.client.close();
      },
      onStatus: () => undefined,
    };
    this.client.send({ type: "host:retire", code: room.code, token: room.token });
  }

  /** The room passed: its socket and keeper now belong to the host. */
  handOver(): LinkPart {
    this.stopTimers();
    this.settle = null;
    return { client: this.client, handlers: this.handlers };
  }

  private onMessage(message: ServerEnvelope): void {
    switch (message.type) {
      case "room:probe":
        return this.client.send({ type: "host:echo", nonce: message.nonce });
      case "room:created":
      case "room:resumed":
      case "room:error":
      case "room:retired":
        return this.keeper.handle(message);
    }
  }

  /** One pass is enough. One answer about the room itself, or two blips, and it is not used. */
  private async verify(room: OpenedRoom, blips: number): Promise<void> {
    // Over the transport its own socket uses, which is known to work here.
    const probe = this.options.probe ?? ((target) => probeRoom(target, { stream: this.client.usesStream }));
    const outcome = await probe(room);
    if (!this.settle) return;
    if (outcome.ok) return this.finish({ ok: true, room });
    if (definitive(outcome.reason, room.sharedRooms) || blips + 1 >= 2) return this.finish({ ok: false, reason: outcome.reason });
    this.recheck = setTimeout(() => void this.verify(room, blips + 1), RECHECK_MS);
  }

  private finish(result: CandidateResult): void {
    const settle = this.settle;
    if (!settle) return;
    this.settle = null;
    this.stopTimers();
    settle(result);
  }

  private stopTimers(): void {
    if (this.cap) clearTimeout(this.cap);
    if (this.recheck) clearTimeout(this.recheck);
    this.cap = this.recheck = null;
  }
}
