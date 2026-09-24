import { create } from "zustand";
import type { Player } from "@/platform/games/game-api";
import type { SocketStatus } from "@/platform/net/socket-client";

export type HostScreen = "home" | "room";

export interface OpenRoom {
  code: string;
  joinUrl: string;
  game: string;
  seats: number;
}

/**
 * What the platform's host screens render: the connection, and the open
 * room with who is in it. Each game keeps its own store for everything
 * inside the game.
 */
export interface HostState {
  screen: HostScreen;
  status: SocketStatus;
  room: OpenRoom | null;
  players: Player[];
  /** The game has started, so the join code tucks away. */
  playing: boolean;
  error: string | null;
  /** A reload is getting its room back. */
  resuming: boolean;
}

export const useHostStore = create<HostState>(() => ({
  screen: "home",
  status: "connecting",
  room: null,
  players: [],
  playing: false,
  error: null,
  resuming: false,
}));
