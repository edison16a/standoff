import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProbeOutcome } from "@/platform/net/room-probe";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { CANDIDATE_MS, RoomCandidate } from "./room-candidate";

class FakeSocket {
  static all: FakeSocket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  readonly sent: ClientEnvelope[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor() {
    FakeSocket.all.push(this);
    queueMicrotask(() => {
      this.readyState = 1;
      this.onopen?.();
    });
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientEnvelope);
  }
  close() {
    this.readyState = 3;
  }
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const created = (shared = true): ServerEnvelope => ({ type: "room:created", code: "WXYZ", game: "tiny", seats: 2, token: "u".repeat(20), joinUrl: "", sharedRooms: shared });

async function started(answers: ProbeOutcome[]) {
  const candidate = new RoomCandidate({ probe: async () => answers.shift() ?? { ok: true } });
  const result = candidate.start("tiny", 2);
  await vi.advanceTimersByTimeAsync(0);
  return { candidate, result, socket: FakeSocket.all[0]! };
}

describe("RoomCandidate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.all = [];
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("location", { protocol: "http:", host: "localhost" });
    vi.stubGlobal("localStorage", { getItem: () => null });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("makes a room on its own connection and passes once a check does", async () => {
    const { result, socket } = await started([{ ok: true }]);
    expect(socket.sent).toEqual([{ type: "host:create", game: "tiny", seats: 2 }]);
    socket.receive(created());
    await expect(result).resolves.toMatchObject({ ok: true, room: { code: "WXYZ" } });
  });

  it("answers the relay's check itself, so the check can pass before any swap", async () => {
    const { socket } = await started([]);
    socket.receive({ type: "room:probe", nonce: "n".repeat(20) });
    expect(socket.sent).toContainEqual({ type: "host:echo", nonce: "n".repeat(20) });
  });

  it("fails at once on a check that says the room is gone, and after two blips", async () => {
    const first = await started([{ ok: false, reason: "not-found" }]);
    first.socket.receive(created());
    await expect(first.result).resolves.toEqual({ ok: false, reason: "not-found" });
    FakeSocket.all = [];
    const second = await started([{ ok: false, reason: "timeout" }, { ok: false, reason: "no-echo" }]);
    second.socket.receive(created());
    await vi.advanceTimersByTimeAsync(3000);
    await expect(second.result).resolves.toEqual({ ok: false, reason: "no-echo" });
  });

  it("gives up after its time is up, and a discarded room is ended by its token", async () => {
    const { candidate, result } = await started([]);
    await vi.advanceTimersByTimeAsync(CANDIDATE_MS);
    await expect(result).resolves.toEqual({ ok: false, reason: "timeout" });
    // The create answered too late, on the socket its last try opened.
    const socket = FakeSocket.all.at(-1)!;
    socket.receive(created());
    candidate.discard();
    expect(socket.sent).toContainEqual({ type: "host:retire", code: "WXYZ", token: "u".repeat(20) });
  });
});
