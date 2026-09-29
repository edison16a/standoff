import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import { RETIRE_RESEND_MS } from "./retire-queue";
import { CREATE_TRIES, CREATE_WAIT_MS, RESUME_DELAYS, RoomKeeper, type RoomKeeperEvents } from "./room-keeper";
import { localMemory } from "./room-memory";

const TOKEN = "t".repeat(20);
const created = (code = "ABCD", token = TOKEN): Extract<ServerEnvelope, { type: "room:created" }> => ({
  type: "room:created",
  code,
  game: "tiny",
  seats: 2,
  token,
  joinUrl: `https://x/join/${code}`,
  sharedRooms: false,
});

let sent: ClientEnvelope[];
let redials: number;
let events: { opened: string[]; lost: number; failed: string[] };

function makeKeeper() {
  const handlers: RoomKeeperEvents = {
    opened: (room) => events.opened.push(room.code),
    lost: () => (events.lost += 1),
    failed: (reason) => events.failed.push(reason),
  };
  return new RoomKeeper(localMemory(), { send: (m) => sent.push(m), redial: () => (redials += 1) }, handlers);
}

describe("RoomKeeper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sent = [];
    redials = 0;
    events = { opened: [], lost: 0, failed: [] };
  });
  afterEach(() => vi.useRealTimers());

  it("sends exactly one create when a handover opens while it is out, and resumes the handover once the room exists", () => {
    const keeper = makeKeeper();
    expect(keeper.create("tiny", 2)).toBe(true);
    const handover: ClientEnvelope[] = [];
    keeper.announce((m) => handover.push(m), { handover: true });
    expect(handover).toEqual([]);
    keeper.handle(created());
    expect(sent.filter((m) => m.type === "host:create")).toHaveLength(1);
    expect(handover).toEqual([{ type: "host:resume", code: "ABCD", token: TOKEN }]);
  });

  it("ignores a second create while one is on its way", () => {
    const keeper = makeKeeper();
    keeper.create("tiny", 2);
    expect(keeper.create("tiny", 2)).toBe(false);
    expect(sent).toHaveLength(1);
  });

  it("ends a room nobody asked for", () => {
    const keeper = makeKeeper();
    keeper.handle(created("QQQQ"));
    expect(sent).toEqual([{ type: "host:retire", code: "QQQQ", token: TOKEN }]);
    expect(events.opened).toEqual([]);
  });

  it("never asks for a room again once one was made and lost", () => {
    const keeper = makeKeeper();
    keeper.create("tiny", 2);
    keeper.handle(created());
    for (let i = 0; i <= RESUME_DELAYS.length; i++) {
      keeper.handle({ type: "room:error", reason: "not-found" });
      vi.advanceTimersByTime(5000);
    }
    expect(events.lost).toBe(1);
    // A fresh socket after the loss says nothing: no ghost room.
    const later: ClientEnvelope[] = [];
    keeper.announce((m) => later.push(m), { handover: false });
    expect(later).toEqual([]);
  });

  it("spaces out its resume tries before calling the room lost", () => {
    const keeper = makeKeeper();
    keeper.create("tiny", 2);
    keeper.handle(created());
    keeper.handle({ type: "room:error", reason: "not-found" });
    vi.advanceTimersByTime(RESUME_DELAYS[0]! - 1);
    expect(redials).toBe(0);
    vi.advanceTimersByTime(1);
    expect(redials).toBe(1);
  });

  it("sends a retire again until the relay confirms it", () => {
    const keeper = makeKeeper();
    keeper.retire({ code: "ABCD", token: TOKEN }, "WXYZ");
    vi.advanceTimersByTime(RETIRE_RESEND_MS * 2);
    expect(sent.filter((m) => m.type === "host:retire")).toHaveLength(3);
    keeper.handle({ type: "room:retired", code: "ABCD", found: true });
    vi.advanceTimersByTime(RETIRE_RESEND_MS * 3);
    expect(sent.filter((m) => m.type === "host:retire")).toHaveLength(3);
    // A fresh socket still waiting would have sent it first.
    const fresh: ClientEnvelope[] = [];
    keeper.announce((m) => fresh.push(m), { handover: false });
    expect(fresh).toEqual([]);
  });

  it("tries a create that never answers on fresh sockets, then gives up", () => {
    const keeper = makeKeeper();
    keeper.create("tiny", 2);
    vi.advanceTimersByTime(CREATE_WAIT_MS * CREATE_TRIES);
    expect(redials).toBe(CREATE_TRIES - 1);
    expect(events.failed).toEqual(["timeout"]);
  });
});
