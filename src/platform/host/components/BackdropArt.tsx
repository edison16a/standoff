"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { GameInfo } from "@/platform/games/game-api";

/** Whether the viewer asked for less motion, in which case the clip stays on its poster. */
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * One game's full screen art behind the home screen. A game with captured
 * media plays its looping clip of real play over its poster. Without media
 * it falls back to the art drawn in code.
 */
export function BackdropArt({ game }: { game: GameInfo }) {
  const reduced = useReducedMotion();
  const media = game.media;
  if (!media) {
    const Cover = game.Cover;
    return <Cover />;
  }
  return (
    <>
      <Image className="cover__art" src={media.poster} alt="" fill sizes="100vw" priority />
      {media.video && !reduced && (
        <video className="cover__art" poster={media.poster.src} autoPlay muted loop playsInline preload="auto">
          <source src={media.video.webm} type="video/webm" />
          <source src={media.video.mp4} type="video/mp4" />
        </video>
      )}
    </>
  );
}
