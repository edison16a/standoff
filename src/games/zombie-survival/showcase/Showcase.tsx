"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { CinemaSet } from "./cinema/cinema-set";
import { Logo } from "./Logo";
import { STILLS } from "./stills";
import { LEAD } from "./trailer";
import { TrailerPlayer } from "./trailer-player";

const FRAME_MS = 1000 / 30;

/** In development, `?at=` opens the trailer that many seconds into its edit. That is how the shots were framed. */
function startAt(): number {
  if (process.env.NODE_ENV !== "development") return 0;
  const at = Number(new URLSearchParams(window.location.search).get("at"));
  return at > 0 ? at + LEAD : 0;
}

interface Scene {
  resize(width: number, height: number, dpr: number): void;
  frame(seconds: number): void;
  dispose(): void;
}

/** A still: the chase played up to its moment once, then held. */
function stillScene(canvas: HTMLCanvasElement, view: "icon" | "poster"): Scene {
  const set = new CinemaSet(canvas);
  const still = STILLS[view];
  set.cut(still.seed);
  const steps = Math.round(still.runUp * 30);
  let posed = false;
  return {
    resize: (w, h, dpr) => set.resize(w, h, dpr),
    frame: () => {
      // The run up plays once. After that the same moment is drawn again, flashes and all.
      if (posed) set.redraw();
      else for (let i = 0; i <= steps; i++) set.draw(still.story - still.runUp + (i * still.runUp) / steps, still.camera, i ? 1 / 30 : 0);
      posed = true;
      set.finish();
    },
    dispose: () => set.dispose(),
  };
}

/**
 * Zombie Survival's home screen media, rendered from the real game. The
 * loop is a wordless trailer: the team's truck racing through the dead
 * city with a pack of runners on its tail, then a cut into the game's
 * own first person fight. The icon and poster are key art from the
 * chase. Everything moves from animation frames alone, so the capture
 * tool can step it.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const outsideRef = useRef<HTMLCanvasElement>(null);
  const insideRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const outside = outsideRef.current;
    const inside = insideRef.current;
    if (!outside || !inside) return;
    const scene: Scene = view === "loop" ? new TrailerPlayer(outside, inside) : stillScene(outside, view);
    const fit = () => scene.resize(outside.clientWidth, outside.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(outside);
    const offset = view === "loop" ? startAt() : 0;
    let frame = 0;
    let first = -1;
    let last = -Infinity;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      if (first < 0) first = now;
      // Drawn at the clip's own 30 frames a second. The capture renders in software, and drawing only the frames it keeps halves the wait.
      if (now - last < FRAME_MS * 0.8) return;
      last = now;
      scene.frame(offset + (now - first) / 1000);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.dispose();
    };
  }, [view]);

  return (
    <div className={`zs-stage zs-showcase zs-showcase--${view}`}>
      <canvas ref={outsideRef} className="zs-stage__canvas" />
      <canvas ref={insideRef} className="zs-stage__canvas" style={{ visibility: "hidden" }} />
      <div className="zs-vignette" aria-hidden="true" />
      {view === "icon" && <Logo />}
    </div>
  );
}
