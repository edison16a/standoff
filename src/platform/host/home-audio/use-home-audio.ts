"use client";
import { useEffect, useMemo } from "react";
import type { AudioEngine } from "@/platform/audio/audio-engine";
import { startAudioSoon } from "@/platform/audio/autoplay";
import { LobbyMusic } from "./lobby-music";
import { playChime, playPop, playStart } from "./menu-sounds";

export interface HomeAudio {
  /** Moving along the row with the arrows. */
  move(index: number): void;
  /** Picking a game with a click. */
  pick(): void;
  /** Host Game was pressed. */
  start(): void;
}

/**
 * The lobby music and menu sounds. The music starts the moment the home
 * screen opens. Browsers hold sound back until the visitor interacts with
 * the page (see audio/autoplay), so if this one does, the tune waits on a
 * paused audio clock and plays from its first note on the first tap, click,
 * key or touch. It loops until the home screen goes away. Volume and mute
 * come from the settings button.
 */
export function useHomeAudio(getEngine: () => AudioEngine): HomeAudio {
  useEffect(() => {
    // The host remakes its engine after a dev remount, so read it fresh here.
    const engine = getEngine();
    const music = new LobbyMusic(engine);
    // Scheduling against a suspended context is safe: its clock stands still, so nothing piles up.
    music.start();
    const stopWaiting = startAudioSoon(engine.ctx, window, { resume: () => engine.unlock() });
    return () => {
      stopWaiting();
      music.stop();
    };
  }, [getEngine]);

  return useMemo(
    () => ({
      move: (index) => playPop(getEngine(), index),
      pick: () => playChime(getEngine()),
      start: () => playStart(getEngine()),
    }),
    [getEngine],
  );
}
