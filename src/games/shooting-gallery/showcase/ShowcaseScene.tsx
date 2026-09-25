"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";
import { Logo } from "./Logo";
import { PLANS, type ShowcasePlan } from "./shots";

/**
 * In development, `?at=` holds on another moment: a round time for a
 * still, or seconds into the loop. That is how the shots were picked,
 * and it is never read in production.
 */
function planFor(view: ShowcaseView): ShowcasePlan {
  const plan = PLANS[view];
  if (process.env.NODE_ENV !== "development") return plan;
  const at = Number(new URLSearchParams(window.location.search).get("at"));
  if (!(at > 0)) return plan;
  if (plan.hold) return { ...plan, start: at };
  return { ...plan, start: plan.start + at, hold: true, camera: () => plan.camera(at) };
}

/**
 * Shooting Gallery playing itself for the home screen's captured media:
 * the real booth, targets and effects, with four computer players on the
 * guns and no room. The icon adds the game's name as a logo. Everything
 * moves from animation frames alone, so the capture tool can step it.
 */
export function ShowcaseScene({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let director: ShowcaseDirector;
    try {
      director = new ShowcaseDirector(canvas, planFor(view));
    } catch {
      // No WebGL: the capture shows an empty booth colour instead of failing.
      return;
    }
    const fit = () => director.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = requestAnimationFrame(function loop(now) {
      director.frame(now);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      director.dispose();
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
