"use client";
import { useEffect, useMemo } from "react";
import type { AudioEngine } from "@/platform/audio/audio-engine";
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
 * The lobby music and menu sounds. Browsers keep sound off until the
 * first tap or key press, so the music waits for that, then loops until
 * the home screen goes away. Volume and mute come from the settings button.
 */
export function useHomeAudio(getEngine: () => AudioEngine): HomeAudio {
  useEffect(() => {
    // The host remakes its engine after a dev remount, so read it fresh here.
    const engine = getEngine();
    const music = new LobbyMusic(engine);
    const begin = () => {
      void engine.unlock().then(() => {
        if (!engine.unlocked) return;
        music.start();
        window.removeEventListener("pointerdown", begin);
        window.removeEventListener("keydown", begin);
      });
    };
    if (engine.unlocked) music.start();
    else {
      window.addEventListener("pointerdown", begin);
      window.addEventListener("keydown", begin);
    }
    return () => {
      window.removeEventListener("pointerdown", begin);
      window.removeEventListener("keydown", begin);
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
