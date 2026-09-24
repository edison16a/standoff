"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";
import { Logo } from "./Logo";
import { PLANS } from "./shots";
import "../styles/showcase.css";

/**
 * Magic Kart playing itself for the home screen's captured media: the
 * real maps, karts and effects, four computer drivers and no room. The
 * icon adds the game's name as a logo. Everything moves from animation
 * frames alone, so the capture tool can step it.
 */
export default function ShowcaseScene({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new ShowcaseDirector(canvas, PLANS[view]);
    // Tuning scripts pin the showcase to a moment through this. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __magicKartShowcase: director });
    const fit = () => director.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    const loop = (now: number) => {
      director.frame(now);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      director.dispose();
    };
  }, [view]);

  return (
    <div className={`mk-showcase mk-showcase--${view}`}>
      <canvas ref={canvasRef} className="mk-canvas" />
      <div className="mk-showcase__shade" aria-hidden="true" />
      {view === "icon" && <Logo />}
    </div>
  );
}
