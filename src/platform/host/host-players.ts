import { RESERVED_KINDS, type HostRoomEvent, type Player } from "@/platform/games/game-api";
import { defaultName, nameKey } from "@/platform/profile";
import { profileSchema, type Payload, type Seat } from "@/platform/protocol";
import { useHostStore } from "./host-store";
import type { OpenedRoom } from "./room-keeper";

const reserved = new Set<string>(RESERVED_KINDS);

export interface PlayersDeps {
  emit(event: HostRoomEvent): void;
  send(to: Seat | "all", payload: Payload): void;
}

/**
 * Who sits where in the host's room and what they are called. The relay
 * keeps names unique, and every phone hears the line up whenever it changes.
 */
export class HostPlayers {
  /** A phone has sat in this room at some point, so a lost room is the players' news too. */
  joined = false;

  constructor(private readonly deps: PlayersDeps) {}

  /** The seats for a room just opened. `same` keeps the names of a room that came back. */
  open({ seats, connected, names }: OpenedRoom, same: boolean): Player[] {
    const before = useHostStore.getState().players;
    if (!same) this.joined = false;
    if (connected?.some(Boolean) || names?.some(Boolean)) this.joined = true;
    return Array.from({ length: seats }, (_, i): Player => ({
      seat: i + 1,
      // The relay keeps every name, so even a reloaded host has them at once.
      name: names?.[i] || (same && before[i]?.name) || defaultName(i + 1),
      connected: connected?.[i] ?? false,
    }));
  }

  arrived(seat: Seat, name: string): void {
    this.joined = true;
    this.update(seat, { connected: true, ...(name ? { name } : {}) });
  }

  left(seat: Seat): void {
    this.update(seat, { connected: false });
  }

  /** A phone's message. Platform kinds are handled here, the rest go to the game. */
  fromPhone(seat: Seat, payload: Payload): void {
    if (!reserved.has(payload.kind)) return this.deps.emit({ type: "message", seat, payload });
    const profile = profileSchema.safeParse(payload);
    if (!profile.success) return;
    // The relay keeps names unique. A stale phone repeating someone else's name is ignored.
    const key = nameKey(profile.data.name);
    const clash = useHostStore.getState().players.some((player) => player.seat !== seat && nameKey(player.name) === key);
    if (!clash) this.update(seat, { name: profile.data.name });
  }

  /** Every phone gets the line up, so games can show who they are up against. */
  share(): void {
    this.deps.send("all", { kind: "players", players: useHostStore.getState().players });
  }

  get connected(): number {
    return useHostStore.getState().players.filter((player) => player.connected).length;
  }

  private update(seat: Seat, change: Partial<Player>): void {
    const players = useHostStore.getState().players.map((player) => (player.seat === seat ? { ...player, ...change } : player));
    useHostStore.setState({ players });
    this.deps.emit({ type: "players" });
    this.share();
  }
}
