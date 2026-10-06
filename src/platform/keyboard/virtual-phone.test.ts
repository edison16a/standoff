import { describe, expect, it } from "vitest";
import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { SocketHandlers } from "@/platform/net/socket-client";
import type { ClientEnvelope, Payload, ServerEnvelope } from "@/platform/protocol";
import { VirtualPhone } from "./virtual-phone";

const joined = (seat: number, name = "Keyboard"): ServerEnvelope => ({
  type: "phone:joined",
  seat,
  token: "token-for-the-keyboard-seat",
  hostHere: true,
  name,
  code: "ABCD",
  game: "magic-kart",
  seats: 4,
});

/** A relay in miniature: what the phone sent, and a way to answer it. */
function setup(code = "ABCD") {
  const sent: { message: ClientEnvelope; lossy: boolean }[] = [];
  const fromHost: Payload[] = [];
  let handlers: SocketHandlers | null = null;
  let dials = 0;
  let closed = false;
  const phone = new VirtualPhone(code, {
    onHost: (payload) => fromHost.push(payload),
    audio: () => ({ close: () => undefined }) as unknown as AudioEngine,
    link: (h) => {
      handlers = h;
      const open = () => {
        dials++;
        h.onOpen((message) => sent.push({ message, lossy: false }), { handover: false });
      };
      return {
        connect: open,
        redial: open,
        send: (message) => sent.push({ message, lossy: false }),
        sendLossy: (message) => sent.push({ message, lossy: true }),
        close: () => (closed = true),
      };
    },
  });
  phone.start();
  const relay = (message: ServerEnvelope) => handlers!.onMessage(message);
  const payloads = () => sent.filter((s) => s.message.type === "phone:send").map((s) => (s.message as { payload: Payload }).payload);
  return { phone, sent, relay, payloads, fromHost, dials: () => dials, closed: () => closed };
}

describe("VirtualPhone", () => {
  it("joins as Keyboard and says its name once seated, like any phone", () => {
    const { phone, sent, relay, payloads } = setup();
    expect(sent[0]?.message).toMatchObject({ type: "phone:join", code: "ABCD", name: "Keyboard" });
    expect(phone.api).toBeNull();
    relay(joined(3));
    expect(phone.api?.seat).toBe(3);
    expect(phone.api?.motion).toBe("unavailable");
    expect(phone.store.getState()).toMatchObject({ stage: "playing", seat: 3, game: "magic-kart" });
    expect(payloads()).toEqual([{ kind: "profile", name: "Keyboard" }]);
  });

  it("hands host messages to the phone screen and the binding, but not the platform's own", async () => {
    const { phone, relay, fromHost } = setup();
    relay(joined(1));
    const heard: Payload[] = [];
    phone.api!.on((event) => event.type === "message" && heard.push(event.payload));
    relay({ type: "host:message", payload: { kind: "state", phase: "lobby" } });
    relay({ type: "host:message", payload: { kind: "players", players: [] } });
    await Promise.resolve();
    expect(heard).toEqual([{ kind: "state", phase: "lobby" }]);
    expect(fromHost).toEqual([{ kind: "state", phase: "lobby" }]);
  });

  it("drops the screen's own copies of the kinds the keyboard sends", () => {
    const { phone, relay, payloads } = setup();
    relay(joined(1));
    phone.replace(["input"]);
    phone.api!.sendLossy({ kind: "input", steer: 0 });
    phone.api!.send({ kind: "ready", ready: true });
    phone.send({ kind: "input", steer: 1 }, true);
    expect(payloads().slice(1)).toEqual([{ kind: "ready", ready: true }, { kind: "input", steer: 1 }]);
  });

  it("sends nothing for the binding before it has a seat", () => {
    const { phone, payloads } = setup();
    phone.send({ kind: "input" });
    expect(payloads()).toEqual([]);
  });

  it("asks for Keyboard 2 when a real player has the name", () => {
    const { phone, sent, relay, dials } = setup();
    relay({ type: "room:error", reason: "name-taken" });
    expect(dials()).toBe(2);
    expect(sent.at(-1)?.message).toMatchObject({ type: "phone:join", name: "Keyboard 2" });
    relay(joined(2, "Keyboard 2"));
    expect(phone.store.getState().name).toBe("Keyboard 2");
  });

  it("takes back its own seat when the name is waiting for it", () => {
    const { sent, relay } = setup();
    relay({ type: "room:error", reason: "name-away" });
    expect(sent.at(-1)?.message).toMatchObject({ type: "phone:join", name: "Keyboard", reconnect: true });
  });

  it("stops when the room is full or gone", () => {
    const full = setup();
    full.relay({ type: "room:error", reason: "full" });
    expect(full.phone.store.getState().stage).toBe("full");
    expect(full.closed()).toBe(true);
    const moved = setup();
    moved.relay(joined(1));
    moved.relay({ type: "room:moved", code: "WXYZ" });
    expect(moved.phone.store.getState().stage).toBe("closed");
  });

  it("sits again when its room was made again elsewhere", () => {
    const { sent, relay } = setup();
    relay(joined(1));
    const before = sent.length;
    relay({ type: "host:back", rejoin: true });
    expect(sent.slice(before).map((s) => s.message.type)).toEqual(["phone:join", "phone:send"]);
  });

  it("leaves by closing its socket", () => {
    const { phone, relay, closed } = setup();
    relay(joined(1));
    phone.dispose();
    expect(closed()).toBe(true);
  });
});
