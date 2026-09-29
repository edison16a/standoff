import { cleanName } from "@/platform/profile";
import type { ClientEnvelope, ServerEnvelope } from "@/platform/protocol";
import type { HostWatch } from "./host-watch";
import type { Membership } from "./membership";
import type { RoomChannel } from "./room-channel";
import type { RoomOps } from "./room-ops";
import { connectedSeats, seatNames, type RoomRecord } from "./room-state";
import { logInfo } from "./log";
import { instanceId, type RelayContext } from "./relay-types";

/** What the room handshakes need from the connection they run on. */
export interface RoomsContext {
  readonly id: string;
  readonly ctx: RelayContext;
  readonly ops: RoomOps;
  readonly place: Membership;
  readonly watch: HostWatch;
  send(envelope: ServerEnvelope): void;
  close(code: number, reason: string): void;
  room(target: { code: string; seats: number }): RoomChannel;
  /** Gives up the current place and tells the other side. */
  leave(): Promise<void>;
  /** Forgets the current place without telling anyone. */
  drop(): Promise<void>;
}

type Envelope<T extends ClientEnvelope["type"]> = Extract<ClientEnvelope, { type: T }>;

export async function createRoom(c: RoomsContext, game: string, seats: number): Promise<void> {
  await c.leave();
  // A refusal says why, so the host waits out the minute instead of retrying at once.
  if (!(await c.ops.allowCreate(c.ctx.client))) return c.send({ type: "room:error", reason: "limit" });
  const room = await c.ops.create(c.id, c.ctx.joinUrlFor, game, seats);
  if (!room) return c.send({ type: "room:error", reason: "unavailable" });
  await c.place.take({ kind: "host", code: room.code, seats });
  sendCreated(c, room);
}

/**
 * The legacy Remake lobby, for tabs opened before host:retire. The host
 * listens on the new room before any phone is told, so no phone's join
 * can arrive before the host is there.
 */
export async function remakeRoom(c: RoomsContext, old: { code: string; seats: number }): Promise<void> {
  const allowed = await c.ops.allowCreate(c.ctx.client);
  const room = allowed ? await c.ops.remake(old.code, c.id, c.ctx.joinUrlFor) : null;
  // The old room is untouched on a refusal, so the host simply stays in it.
  if (!room) return c.send({ type: "room:error", reason: allowed ? "unavailable" : "limit" });
  await c.drop();
  await c.place.take({ kind: "host", code: room.code, seats: room.seats.length });
  sendCreated(c, room);
  c.room(old).toPhones({ type: "room:moved", code: room.code });
}

function sendCreated(c: RoomsContext, room: RoomRecord): void {
  const { code, game, hostToken: token, joinUrl } = room;
  c.send({ type: "room:created", code, game, seats: room.seats.length, token, joinUrl, sharedRooms: c.ctx.sharedRooms, instance: c.ctx.instance ?? instanceId() });
  log(c, "host", code);
}

/** One line per room handshake, so the logs show how clients really connect. */
function log(c: RoomsContext, role: string, code: string): void {
  logInfo(`[relay] ${role} ${code} over ${c.ctx.transport ?? "ws"}`);
}

export async function resumeHost(c: RoomsContext, request: Envelope<"host:resume">): Promise<void> {
  const { code, token } = request;
  await c.leave();
  const restore = request.game && request.seats ? { game: request.game, seats: request.seats, names: request.names ?? [], joinUrl: c.ctx.joinUrlFor(code) } : undefined;
  const outcome = await c.ops.resumeHost(code, token, c.id, restore);
  if (!outcome) return c.send({ type: "room:error", reason: "not-found" });
  if (outcome.restored) log(c, "restored", code);
  const { room, restored } = outcome;
  const { game, joinUrl } = room;
  const seats = room.seats.length;
  await c.place.take({ kind: "host", code, seats });
  const channel = c.room({ code, seats });
  if (outcome.replaced) channel.kickHost(outcome.replaced);
  channel.toPhones({ type: "host:back" });
  const [connected, names] = [connectedSeats(room), seatNames(room)];
  const instance = c.ctx.instance ?? instanceId();
  c.send({ type: "room:resumed", code, game, seats, joinUrl, connected, names, sharedRooms: c.ctx.sharedRooms, restored, instance });
}

/**
 * The host's new socket resumed the room on another instance, and this is
 * its old socket saying so. Rooms here live in this instance's memory, so
 * the room is let go, quietly, and its phones are asked to move to a fresh
 * socket, which lands where new connections go and so where the host is.
 */
export async function migrateRoom(c: RoomsContext, { code, token }: Envelope<"host:migrate">): Promise<void> {
  const role = c.place.role;
  // With a shared store the room is already everywhere.
  if (c.ctx.sharedRooms || role?.kind !== "host" || role.code !== code) return;
  const room = await c.ops.peek(code);
  if (!room || room.hostToken !== token || room.hostConn !== c.id) return;
  await c.drop();
  await c.ops.forget(code);
  c.room(role).toPhones({ type: "server:rotate" });
  log(c, "migrated", code);
}

export async function joinAsPhone(c: RoomsContext, { code, token, name, reconnect }: Envelope<"phone:join">): Promise<void> {
  await c.leave();
  const request = { token, name: cleanName(name ?? "") || undefined, reconnect };
  const outcome = await c.ops.joinSeat(code, request, c.id);
  // The host moved on to a new room. The phone follows, whatever it slept through.
  if (outcome && "moved" in outcome) return c.send({ type: "room:moved", code: outcome.moved });
  if (!outcome || !outcome.claim.ok) {
    // A room that exists but has ended says so. Calling it "not found" made
    // phones retry a dead room and then blame the code.
    const reason = outcome && !outcome.claim.ok ? outcome.claim.reason : "not-found";
    c.send({ type: "room:error", reason });
    // Only a code that matches nothing is a guess. Room codes are short, so
    // wrong guesses from one address are capped.
    if (reason === "not-found" && !(await c.ops.allowMiss(c.ctx.client))) c.close(1008, "too many attempts");
    return;
  }
  const { seat, rejoined, replaced } = outcome.claim;
  const { game, seats, hostHere } = outcome;
  await c.place.take({ kind: "phone", code, seats, seat });
  log(c, `seat ${seat}`, code);
  const channel = c.room({ code, seats });
  if (replaced) channel.kickSeat(seat, replaced);
  channel.toHost({ type: "peer:joined", seat, rejoined, name: outcome.claim.name });
  c.send({ type: "phone:joined", code, game, seats, seat, token: outcome.claim.token, hostHere, name: outcome.claim.name });
  if (!hostHere) c.watch.start(code, seats);
}

/**
 * Ends a room for the holder of its token, from any connection. Its phones
 * are sent on to `movedTo`, or told the game ended, and whichever
 * connection was hosting it is kicked. Sent again, it changes nothing and
 * just answers, so the host can repeat it until it hears back.
 */
export async function retireRoom(c: RoomsContext, { code, token, movedTo }: Envelope<"host:retire">): Promise<void> {
  const outcome = await c.ops.retire(code, token, movedTo ?? null);
  const role = c.place.role;
  if (!outcome) {
    // The record is gone, but this connection still hosts the room, which
    // proves the sender owns it: its phones still hear where to go.
    if (role?.kind === "host" && role.code === code) {
      c.room(role).toPhones(movedTo ? { type: "room:moved", code: movedTo } : { type: "room:closed" });
      await c.drop();
    }
    return c.send({ type: "room:retired", code, found: false });
  }
  const channel = c.room({ code, seats: outcome.seats });
  if (!outcome.repeat) {
    channel.toPhones(outcome.movedTo ? { type: "room:moved", code: outcome.movedTo } : { type: "room:closed" });
  }
  if (outcome.oldHost && outcome.oldHost !== c.id) channel.kickHost(outcome.oldHost);
  if (role?.kind === "host" && role.code === code) await c.drop();
  c.send({ type: "room:retired", code, found: true });
}
