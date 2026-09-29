import { beforeEach, describe, expect, it } from "vitest";
import type { ClientEnvelope } from "@/platform/protocol";
import { connectTo, memoryBackend } from "@/platform/testing/relay-kit";
import type { Backend } from "./backend";
import { RoomSigner } from "./room-sign";

/**
 * Two server instances of one deployment, each with rooms of its own, as
 * on Vercel without a store. New connections move from A to B, and the
 * room follows its host there.
 */
const SECRET = "deployment-secret";
let a: Backend;
let b: Backend;
const clock = () => 1_000_000;
const on = (backend: Backend, secret = SECRET) => connectTo(backend, clock, { sharedRooms: false, secret, instance: backend === a ? "a" : "b" });

type Resume = Extract<ClientEnvelope, { type: "host:resume" }>;

async function roomOnA() {
  const host = on(a);
  await host.send({ type: "host:create", game: "blade-clash", seats: 2 });
  const { code, token } = host.socket.last("room:created")!;
  const ann = on(a);
  await ann.send({ type: "phone:join", code, name: "Ann" });
  const annToken = ann.socket.last("phone:joined")!.token;
  const resume: Resume = { type: "host:resume", code, token, game: "blade-clash", seats: 2, names: ["Ann", null] };
  return { host, ann, code, token, annToken, resume };
}

describe("a room following its host to another instance", () => {
  beforeEach(() => {
    a = memoryBackend(clock);
    b = memoryBackend(clock);
  });

  it("makes the same room again from the host's signed token, and says so", async () => {
    const { code, resume } = await roomOnA();
    const moved = on(b);
    await moved.send(resume);
    expect(moved.socket.last("room:resumed")).toMatchObject({ code, game: "blade-clash", seats: 2, restored: true, instance: "b", connected: [false, false], names: ["Ann", null] });
  });

  it("gives each phone its own seat back by its signed seat token", async () => {
    const { annToken, code, resume } = await roomOnA();
    const host = on(b);
    await host.send(resume);
    // Bob was never seated, so he takes the next free seat, not Ann's.
    const bob = on(b);
    await bob.send({ type: "phone:join", code, name: "Bob" });
    expect(bob.socket.last("phone:joined")).toMatchObject({ seat: 2, name: "Bob" });
    const ann = on(b);
    await ann.send({ type: "phone:join", code, token: annToken, name: "Ann", reconnect: true });
    expect(ann.socket.last("phone:joined")).toMatchObject({ seat: 1, name: "Ann", token: annToken });
    expect(host.socket.last("peer:joined")).toMatchObject({ seat: 1, rejoined: true, name: "Ann" });
  });

  it("refuses a token another deployment signed, or one for another game", async () => {
    const { resume } = await roomOnA();
    const other = on(b, "another-deployment");
    await other.send(resume);
    expect(other.socket.last("room:error")).toEqual({ type: "room:error", reason: "not-found" });
    const forged = on(b);
    await forged.send({ ...resume, game: "boxing" });
    expect(forged.socket.last("room:error")).toEqual({ type: "room:error", reason: "not-found" });
    expect(await b.store.get(resume.code)).toBeNull();
  });

  it("never brings back a room that ended, or takes over another room under the code", async () => {
    const { host, code, token, resume } = await roomOnA();
    // The same code already names another room on B.
    const signer = new RoomSigner(SECRET);
    await b.store.create({ code, hostToken: signer.hostToken(code, "boxing", 2), joinUrl: "", game: "boxing", hostConn: "x", hostAwaySince: null, closed: false, seats: [null, null] });
    const moved = on(b);
    await moved.send(resume);
    expect(moved.socket.last("room:error")?.reason).toBe("not-found");
    await host.send({ type: "host:retire", code, token });
    const again = on(a);
    await again.send(resume);
    expect(again.socket.last("room:error")?.reason).toBe("not-found");
  });

  it("lets the old instance go of the room and moves its phones, without a host away", async () => {
    const { host, ann, code, token, resume } = await roomOnA();
    await on(b).send(resume);
    await host.send({ type: "host:migrate", code, token });
    expect(ann.socket.last("server:rotate")).toEqual({ type: "server:rotate" });
    expect(ann.socket.count("host:away")).toBe(0);
    expect(await a.store.get(code)).toBeNull();
    await host.drop();
    expect(ann.socket.count("host:away")).toBe(0);
  });

  it("ignores a migrate with the wrong token, from a phone, or where rooms are shared", async () => {
    const { host, ann, code, token } = await roomOnA();
    await host.send({ type: "host:migrate", code, token: "x".repeat(20) });
    await ann.send({ type: "host:migrate", code, token });
    expect(await a.store.get(code)).not.toBeNull();
    const shared = connectTo(a, clock);
    await shared.send({ type: "host:resume", code, token });
    await shared.send({ type: "host:migrate", code, token });
    expect(await a.store.get(code)).not.toBeNull();
  });

  it("has phones whose sockets sit where the room is made again take their seats back", async () => {
    const { host, ann, code, annToken, resume } = await roomOnA();
    // A forgot the room, say after a migrate, and the host then came back to A.
    await a.store.delete(code);
    await host.drop();
    const back = on(a);
    await back.send(resume);
    expect(back.socket.last("room:resumed")).toMatchObject({ restored: true, connected: [false, false] });
    expect(ann.socket.last("host:back")).toEqual({ type: "host:back", rejoin: true });
    await ann.send({ type: "phone:join", code, token: annToken, name: "Ann", reconnect: true });
    expect(ann.socket.last("phone:joined")).toMatchObject({ seat: 1, name: "Ann" });
    expect(back.socket.last("peer:joined")).toMatchObject({ seat: 1, rejoined: true });
    expect((await a.store.get(code))?.seats[0]?.conn).not.toBeNull();
  });

  it("asks for no rejoin when the host simply comes back to its room", async () => {
    const { host, ann, resume } = await roomOnA();
    await host.drop();
    await on(a).send(resume);
    expect(ann.socket.last("host:back")).toEqual({ type: "host:back" });
  });

  it("still tells the phones where to go when the record is gone but this socket hosts the room", async () => {
    const { host, ann, code, token } = await roomOnA();
    await a.store.delete(code);
    await host.send({ type: "host:retire", code, token, movedTo: "WXYZ" });
    expect(ann.socket.last("room:moved")).toEqual({ type: "room:moved", code: "WXYZ" });
    expect(host.socket.last("room:retired")).toMatchObject({ type: "room:retired", code, found: false, instance: "a" });
  });
});

describe("RoomSigner", () => {
  const signer = new RoomSigner(SECRET);
  const room = { code: "ABCD", hostToken: signer.hostToken("ABCD", "g", 2) };

  it("checks host tokens against the code, game and seats they were made for", () => {
    expect(signer.checkHost(room.hostToken, "ABCD", "g", 2)).toBe(true);
    expect(signer.checkHost(room.hostToken, "ABCE", "g", 2)).toBe(false);
    expect(signer.checkHost(room.hostToken, "ABCD", "g", 3)).toBe(false);
    expect(new RoomSigner("other").checkHost(room.hostToken, "ABCD", "g", 2)).toBe(false);
    expect(room.hostToken.length).toBeLessThanOrEqual(64);
  });

  it("reads a seat token's seat only in the room it was made for", () => {
    const token = signer.seatToken(room, 3);
    expect(signer.seatOf(token, room)).toBe(3);
    expect(signer.seatOf(token, { ...room, hostToken: signer.hostToken("ABCD", "g", 2) })).toBeNull();
    expect(signer.seatOf(token.replace(/^3/, "2"), room)).toBeNull();
    expect(signer.seatOf("t".repeat(20), room)).toBeNull();
  });
});


