// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { TAKEN_RETRY_MS } from "./join-request";
import { PhoneRoom } from "./phone-room";
import { nameFromPath, playPath } from "./play-path";

vi.mock("@/platform/audio/audio-engine", () => ({
  AudioEngine: class {
    async unlock() {}
    close() {}
  },
}));

/** Just enough of a browser WebSocket to play the relay by hand. */
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
  }
  send(data: string) {
    this.sent.push(JSON.parse(data) as ClientEnvelope);
  }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.onclose?.({ code });
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: ServerEnvelope) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
}

const last = () => FakeSocket.all.at(-1)!;
const TOKEN = "s".repeat(20);
const seated = (name: string): ServerEnvelope => ({ type: "phone:joined", code: "ABCD", game: "tiny", seats: 2, seat: 2, token: TOKEN, hostHere: true, name });

beforeEach(() => {
  FakeSocket.all = [];
  sessionStorage.clear();
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PhoneRoom names", () => {
  it("asks for another name when a connected player has it, then joins with the new one", async () => {
    const room = new PhoneRoom("ABCD");
    await room.join("Ann");
    last().open();
    expect(last().sent[0]).toMatchObject({ type: "phone:join", code: "ABCD", name: "Ann" });
    last().receive({ type: "room:error", reason: "name-taken" });
    expect(room.store.getState()).toMatchObject({ stage: "name", clash: { reason: "name-taken", name: "Ann" } });
    expect(last().readyState).toBe(3);
    await room.join("Anna");
    last().open();
    expect(last().sent[0]).toMatchObject({ name: "Anna" });
    last().receive(seated("Anna"));
    expect(room.store.getState()).toMatchObject({ stage: "playing", name: "Anna", clash: null });
  });

  it("offers a dropped player's name as a reconnect that takes their seat back", async () => {
    const room = new PhoneRoom("ABCD");
    await room.join("Ann");
    last().open();
    last().receive({ type: "room:error", reason: "name-away" });
    expect(room.store.getState().clash).toEqual({ reason: "name-away", name: "Ann" });
    await room.join("Ann", true);
    last().open();
    expect(last().sent[0]).toMatchObject({ name: "Ann", reconnect: true });
  });

  it("goes straight back into the seat from the player's address, with the saved token", () => {
    sessionStorage.setItem("standoff:seat:ABCD", TOKEN);
    const room = new PhoneRoom("ABCD", "Ann");
    room.resume();
    last().open();
    expect(last().sent[0]).toEqual({ type: "phone:join", code: "ABCD", token: TOKEN, name: "Ann", reconnect: true });
    last().receive(seated("Ann"));
    expect(room.store.getState()).toMatchObject({ stage: "playing", seat: 2, name: "Ann" });
  });

  it("waits out an old tab still holding the name, then hands the choice back", () => {
    vi.useFakeTimers();
    const room = new PhoneRoom("ABCD", "Ann");
    room.resume();
    for (let i = 0; i < 5; i++) {
      last().open();
      last().receive({ type: "room:error", reason: "name-taken" });
      vi.advanceTimersByTime(TAKEN_RETRY_MS);
    }
    expect(FakeSocket.all).toHaveLength(5);
    expect(room.store.getState()).toMatchObject({ stage: "name", clash: { reason: "name-taken" } });
  });

  it("rejoins as the same player after a drop", async () => {
    vi.useFakeTimers();
    const room = new PhoneRoom("ABCD");
    await room.join(null);
    last().open();
    last().receive(seated("Player 2"));
    last().close(1006);
    vi.advanceTimersByTime(5000);
    last().open();
    expect(last().sent[0]).toMatchObject({ token: TOKEN, name: "Player 2", reconnect: true });
  });

  it("dials again at once from the Reconnect button, and only once", async () => {
    vi.useFakeTimers();
    const room = new PhoneRoom("ABCD");
    await room.join("Ann");
    last().open();
    last().receive(seated("Ann"));
    last().close(1006);
    const before = FakeSocket.all.length;
    room.reconnect();
    expect(FakeSocket.all).toHaveLength(before + 1);
    // The backoff timer that was waiting must not dial a second socket.
    vi.advanceTimersByTime(10_000);
    expect(FakeSocket.all).toHaveLength(before + 1);
  });
});

describe("play paths", () => {
  it("round trips a name through the address", () => {
    expect(playPath("ABCD", "Mary Jo")).toBe("/play/ABCD/Mary%20Jo");
    expect(nameFromPath("Mary%20Jo")).toBe("Mary Jo");
    expect(nameFromPath("100%")).toBe("100%");
    expect(nameFromPath("%20")).toBeNull();
  });
});
