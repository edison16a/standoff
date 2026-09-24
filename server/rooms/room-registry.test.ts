import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ServerEnvelope } from "../../src/shared/protocol";
import type { Peer } from "./peer";
import { HOST_GRACE_MS, SEAT_GRACE_MS } from "./room";
import { RoomRegistry } from "./room-registry";

/** A peer that just remembers what it was sent. */
class FakePeer implements Peer {
  readonly inbox: ServerEnvelope[] = [];
  closed = false;
  send(message: ServerEnvelope) {
    this.inbox.push(message);
  }
  close() {
    this.closed = true;
  }
  last<T extends ServerEnvelope["type"]>(type: T): Extract<ServerEnvelope, { type: T }> {
    const found = [...this.inbox].reverse().find((m) => m.type === type);
    if (!found) throw new Error(`no ${type} message`);
    return found as Extract<ServerEnvelope, { type: T }>;
  }
}

function openRoom(registry: RoomRegistry) {
  const host = new FakePeer();
  registry.handle(host, { type: "host:create" });
  const created = host.last("room:created");
  return { host, code: created.code, token: created.token };
}

describe("RoomRegistry", () => {
  let registry: RoomRegistry;
  beforeEach(() => {
    vi.useFakeTimers();
    registry = new RoomRegistry((code) => `https://lan:3443/join/${code}`);
  });
  afterEach(() => vi.useRealTimers());

  it("creates a room with a join url", () => {
    const { host, code } = openRoom(registry);
    expect(code).toMatch(/^[A-Z]{4}$/);
    expect(host.last("room:created").joinUrl).toBe(`https://lan:3443/join/${code}`);
  });

  it("assigns slots by join order and refuses a third phone", () => {
    const { host, code } = openRoom(registry);
    const [a, b, c] = [new FakePeer(), new FakePeer(), new FakePeer()];
    registry.handle(a, { type: "phone:join", code });
    registry.handle(b, { type: "phone:join", code });
    registry.handle(c, { type: "phone:join", code });
    expect(a.last("phone:joined").slot).toBe(1);
    expect(b.last("phone:joined").slot).toBe(2);
    expect(c.last("room:error").reason).toBe("full");
    expect(host.inbox.filter((m) => m.type === "peer:joined")).toHaveLength(2);
  });

  it("lets a phone reclaim its seat with its token", () => {
    const { host, code } = openRoom(registry);
    const first = new FakePeer();
    registry.handle(first, { type: "phone:join", code });
    const { token } = first.last("phone:joined");
    registry.disconnect(first);
    expect(host.last("peer:left").slot).toBe(1);

    const again = new FakePeer();
    registry.handle(again, { type: "phone:join", code, token });
    expect(again.last("phone:joined").slot).toBe(1);
    expect(host.last("peer:joined").rejoined).toBe(true);
  });

  it("frees a seat once its grace period runs out", () => {
    const { code } = openRoom(registry);
    const gone = new FakePeer();
    registry.handle(gone, { type: "phone:join", code });
    registry.disconnect(gone);
    vi.advanceTimersByTime(SEAT_GRACE_MS + 1);
    const next = new FakePeer();
    registry.handle(next, { type: "phone:join", code });
    expect(next.last("phone:joined").slot).toBe(1);
  });

  it("relays messages both ways", () => {
    const { host, code } = openRoom(registry);
    const phone = new FakePeer();
    registry.handle(phone, { type: "phone:join", code });
    registry.handle(phone, { type: "phone:send", payload: { kind: "strike", action: "jab" } });
    expect(host.last("peer:message")).toEqual({
      type: "peer:message",
      slot: 1,
      payload: { kind: "strike", action: "jab" },
    });
    registry.handle(host, { type: "host:send", to: 1, payload: { kind: "recenter" } });
    expect(phone.last("host:message").payload).toEqual({ kind: "recenter" });
  });

  it("ignores host messages from a phone", () => {
    const { code } = openRoom(registry);
    const [a, b] = [new FakePeer(), new FakePeer()];
    registry.handle(a, { type: "phone:join", code });
    registry.handle(b, { type: "phone:join", code });
    registry.handle(a, { type: "host:send", to: 2, payload: { kind: "recenter" } });
    expect(b.inbox.some((m) => m.type === "host:message")).toBe(false);
  });

  it("keeps the room while the host reloads, then closes it if they never return", () => {
    const { host, code, token } = openRoom(registry);
    const phone = new FakePeer();
    registry.handle(phone, { type: "phone:join", code });
    registry.disconnect(host);
    expect(phone.last("host:away")).toBeTruthy();

    const reloaded = new FakePeer();
    registry.handle(reloaded, { type: "host:resume", code, token });
    expect(reloaded.last("room:resumed").connected).toEqual([true, false]);

    registry.disconnect(reloaded);
    vi.advanceTimersByTime(HOST_GRACE_MS + 1);
    expect(phone.last("room:closed")).toBeTruthy();
    expect(registry.size).toBe(0);
  });

  it("rejects a resume with the wrong token", () => {
    const { code } = openRoom(registry);
    const intruder = new FakePeer();
    registry.handle(intruder, { type: "host:resume", code, token: "x".repeat(24) });
    expect(intruder.last("room:error").reason).toBe("not-found");
  });
});

describe("RoomRegistry closing", () => {
  it("closes a room when its host asks, and only then", () => {
    const registry = new RoomRegistry((code) => code);
    const host = new FakePeer();
    registry.handle(host, { type: "host:create" });
    const code = host.last("room:created").code;
    const phone = new FakePeer();
    registry.handle(phone, { type: "phone:join", code });
    registry.handle(phone, { type: "host:close" });
    expect(registry.size).toBe(1);
    registry.handle(host, { type: "host:close" });
    expect(registry.size).toBe(0);
    expect(phone.last("room:closed")).toBeTruthy();
  });
});
