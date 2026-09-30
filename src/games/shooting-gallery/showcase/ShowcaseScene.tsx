"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";
import { Logo } from "./Logo";
import { ROUND, STILLS } from "./shots";
import { LEAD } from "./trailer";
import { TrailerPlayer } from "./trailer-player";

/** The clip is filmed at this rate, so drawing more often only slows a capture on a slow machine. */
const FRAME_MS = 1000 / 30;

interface Scene {
  resize(width: number, height: number, dpr: number): void;
  frame(seconds: number): void;
  dispose(): void;
}

/** A still: the round played to its moment and held there. */
function stillScene(canvas: HTMLCanvasElement, view: "icon" | "poster"): Scene {
  const director = new ShowcaseDirector(canvas, ROUND);
  const still = STILLS[view];
  return {
    resize: (w, h, dpr) => director.resize(w, h, dpr),
    frame: () => director.show(still.time, still.camera),
    dispose: () => director.dispose(),
  };
}

/** In development, `?at=` opens the trailer that many seconds into its edit. That is how the shots were framed. */
function startAt(): number {
  if (process.env.NODE_ENV !== "development") return 0;
  const at = Number(new URLSearchParams(window.location.search).get("at"));
  return at > 0 ? at + LEAD : 0;
}

/**
 * Shooting Gallery's home screen media, drawn by the game's own
 * renderer with four computer players on the guns. The loop is a
 * wordless trailer of trick shots, cut from one round with slow motion
 * on each hit. The icon adds the game's name as a logo. Everything moves
 * from animation frames alone, so the capture tool can step it.
 */
export function ShowcaseScene({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: Scene;
    try {
      scene = view === "loop" ? new TrailerPlayer(canvas) : stillScene(canvas, view);
    } catch {
      // No WebGL: the capture shows an empty booth colour instead of failing.
      return;
    }
    const fit = () => scene.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    const offset = view === "loop" ? startAt() : 0;
    let first = -1;
    let last = -Infinity;
    let frame = requestAnimationFrame(function loop(now) {
      frame = requestAnimationFrame(loop);
      if (first < 0) first = now;
      // Page frames come every 16 ms, so waiting a whole filmed frame would skip every third one.
      if (now - last < FRAME_MS * 0.8) return;
      last = now;
      scene.frame(offset + (now - first) / 1000);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      scene.dispose();
    };
  }, [view]);

  return (
    <div className={`sg-showcase sg-showcase--${view}`}>
      <canvas ref={canvasRef} className="sg-canvas" />
      <div className="sg-showcase__shade" aria-hidden="true" />
      {view === "icon" && <Logo />}
    </div>
  );
}
