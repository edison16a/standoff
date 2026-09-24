"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { SurvivalRenderer } from "../render/scene-renderer";
import { ShowcaseDirector } from "./director";
import { Logo } from "./Logo";
import { PLANS } from "./plans";

const FRAME_MS = 1000 / 30;

/**
 * Zombie Survival playing itself, for the home screen's captured media:
 * the real city, zombies, guns and effects, with four computer players
 * and no room. The icon adds the game's name as a logo. Everything moves
 * from animation frames alone, so the capture tool can step it.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new ShowcaseDirector(PLANS[view]);
    const renderer = new SurvivalRenderer(canvas, director, director.random);
    const fit = () => renderer.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    let last = -1;
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      // Drawn at the clip's own 30 frames a second. The capture renders in software, and drawing only the frames it keeps halves the wait.
      if (last >= 0 && now - last < FRAME_MS * 0.8) return;
      const dt = last < 0 ? 0 : Math.min(0.1, (now - last) / 1000);
      last = now;
      director.update(now, renderer);
      renderer.frame(now);
      // The capture's clock runs faster than software can draw. Waiting here keeps frames from piling up behind its screenshots.
      renderer.finish();
      director.shoot(renderer, dt);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
    };
  }, [view]);

  return (
    <div className={`zs-stage zs-showcase zs-showcase--${view}`}>
      <canvas ref={canvasRef} className="zs-stage__canvas" />
      <div className="zs-vignette" aria-hidden="true" />
      {view === "icon" && <Logo />}
    </div>
  );
}
