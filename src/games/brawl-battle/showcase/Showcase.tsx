"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { devPlan } from "./dev-plan";
import { FilmDirector } from "./film-director";
import { isLabCharacter, makeLab } from "./lab";
import { LabDirector } from "./lab-director";
import { PLANS } from "./plans";

/** Development only: `?lab=samurai` swaps the film for the move lab. */
function labDirector(canvas: HTMLCanvasElement): LabDirector | null {
  if (process.env.NODE_ENV !== "development") return null;
  const params = new URLSearchParams(window.location.search);
  const who = params.get("lab");
  return isLabCharacter(who) ? new LabDirector(canvas, makeLab(who), params) : null;
}

/**
 * Brawl Battle playing itself for the home screen's media: the loop is a
 * trailer cut from seeded fights between four computer fighters, the
 * poster one big moment, and the icon a close shot over the logo. Driven
 * by requestAnimationFrame and performance.now, so the capture tool can
 * step it frame by frame and get the same film.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = labDirector(canvas) ?? new FilmDirector(canvas, devPlan() ?? PLANS[view]);
    // Tuning scripts pin the film to a moment through this. Development builds only.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __brawlShowcase: director });
    const fit = () => director.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    // The clock is read from performance.now rather than the frame's own timestamp: the
    // capture tool fakes performance.now, while the timestamp keeps real time.
    const loop = () => {
      director.frame(performance.now());
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
    <div className={`bb-showcase bb-showcase--${view}`}>
      <canvas ref={canvasRef} className="bb-showcase__canvas" />
      <div className="bb-showcase__shade" aria-hidden="true" />
      {view === "icon" && (
        <div className="bb-showcase__logo" aria-hidden="true">
          <span>Brawl</span>
          <b>Battle</b>
        </div>
      )}
    </div>
  );
}
