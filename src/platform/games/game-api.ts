import type { StaticImageData } from "next/image";
import type { ComponentType } from "react";
import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { Payload, Seat } from "@/platform/protocol";

/**
 * The contract between the platform and a game. The platform owns the
 * room: the connection, the QR code, who is in which seat and what they
 * are called. A game owns everything that happens inside it. It talks to
 * its phones through `send` and hears them through `on`, with payloads of
 * its own design (anything with a `kind`, except the two the platform
 * keeps for itself, see RESERVED_KINDS).
 *
 * A game lives in its own folder under src/games and exports a
 * GameModule. It never imports another game.
 */

/** Payload kinds the platform uses between host and phones. Games must not use them. */
export const RESERVED_KINDS = ["profile", "players"] as const;

export interface Player {
  seat: Seat;
  /** The display name the player typed on their phone. */
  name: string;
  connected: boolean;
}

export type HostRoomEvent =
  /** Someone joined, left or changed their name. Read `players()`. */
  | { type: "players" }
  /** A phone took a seat. `rejoined` means it is the same phone coming back. */
  | { type: "joined"; seat: Seat; rejoined: boolean }
  | { type: "left"; seat: Seat }
  | { type: "message"; seat: Seat; payload: Payload }
  /** The host's own connection dropped or came back. */
  | { type: "online"; online: boolean }
  /** The room was resumed after a reconnect. Send the phones everything again. */
  | { type: "resync" };

/** What a game's host side gets from the platform. */
export interface HostRoomApi {
  readonly code: string;
  readonly seats: number;
  /** Unlocked already, inside the click that started the room. */
  readonly audio: AudioEngine;
  /** Every seat, seat 1 first, connected or not. */
  players(): readonly Player[];
  on(listener: (event: HostRoomEvent) => void): () => void;
  send(to: Seat | "all", payload: Payload): void;
  /** True once play has started, which tucks the join code away. */
  setPlaying(playing: boolean): void;
  /** Closes the room and goes back to the home screen. */
  leave(): void;
}

/** What a game's phone side gets from the platform. */
export interface PhoneRoomApi {
  readonly code: string;
  readonly seat: Seat;
  readonly seats: number;
  /** Unlocked already, inside the tap that joined the room. */
  readonly audio: AudioEngine;
  /** Whether motion sensors can be read. Games fall back to buttons otherwise. */
  readonly motion: "granted" | "unavailable";
  send(payload: Payload): void;
  /** Sends only if the link is keeping up, for high rate data like motion. */
  sendLossy(payload: Payload): void;
  on(listener: (event: PhoneRoomEvent) => void): () => void;
}

export type PhoneRoomEvent =
  | { type: "message"; payload: Payload }
  /** This phone is seated again after a reconnect, or the host came back. Resend any choices. */
  | { type: "rejoined" };

/** One room's worth of a game on the host. The platform renders its pieces. */
export interface HostGame {
  /** Fills the whole window, under the platform's logo, tools and join code. */
  Screen: ComponentType;
  /** Extra buttons for the tool bar at the top right. */
  Tools?: ComponentType;
  /** Shown on the join card, under the code, once someone has joined. */
  JoinExtra?: ComponentType;
  /**
   * Where the join code sits. By default it waits big in the middle until
   * someone joins, then tucks into the corner. "corner" keeps it there from
   * the start, for a lobby with its own words in the middle. "hidden" is for
   * games played without phones, like the camera games.
   */
  join?: "center" | "corner" | "hidden";
  dispose(): void;
}

/** One phone's worth of a game. */
export interface PhoneGame {
  /** Everything under the platform's header bar. */
  Screen: ComponentType;
  dispose(): void;
}

/** What a showcase scene is being drawn for. See `GameModule.Showcase`. */
export type ShowcaseView = "loop" | "icon" | "poster";

export interface GameModule {
  createHost(room: HostRoomApi): HostGame;
  createPhone(room: PhoneRoomApi): PhoneGame;
  /**
   * The game playing itself, with no room and no phones, used to capture
   * its home screen media (tools/media). "loop" is a few seconds of play
   * that can repeat. "icon" is a square hero shot. "poster" is one great
   * frame. It must run from requestAnimationFrame and performance.now so
   * the capture tool can step time frame by frame.
   */
  Showcase?: ComponentType<{ view: ShowcaseView }>;
}

/** Captured art for the home screen: the tile, a still, and a looping clip. */
export interface GameMedia {
  /** Square tile art, about 1024 pixels. */
  icon: StaticImageData;
  /** One frame of real play, 16 by 9. Shown before the clip starts and when motion is reduced. */
  poster: StaticImageData;
  /**
   * Paths under /public to a short looping clip of real play, 16 by 9, in
   * two encodings: WebM for Chromium and Firefox, MP4 for Safari.
   */
  video?: { webm: string; mp4: string };
}

/** What the home screen shows for a game, whether it is built yet or not. */
export interface GameInfo {
  /** Also the folder name under src/games. */
  id: string;
  title: string;
  tagline: string;
  status: "ready" | "development";
  /** Player counts it can be played with. The host picks one when there is a choice. */
  players: readonly number[];
  /** The game's own colour. Its card on the home screen is tinted with it. */
  color: string;
  /** What players hold: their phones (the default), or nothing, played in front of the computer's camera. */
  input?: "phone" | "camera";
  /** The art drawn in code, used when there is no captured media yet. */
  Cover: ComponentType;
  media?: GameMedia;
}
