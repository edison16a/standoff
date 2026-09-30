"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { COVER_STILL, makeCover } from "./cover";
import { devPlan } from "./dev-plan";
import { FilmDirector } from "./film-director";
import { isLabCharacter, makeLab } from "./lab";
import { LabDirector, stillFromParams } from "./lab-director";
import { PLANS } from "./plans";

/**
 * Development only: `?lab=samurai` swaps the film for the move lab, and
 * `?lab=cover` shows the icon's staged cover with the address's `at` and
 * `cam`, for tuning it.
 */
function labDirector(canvas: HTMLCanvasElement): LabDirector | null {
  if (process.env.NODE_ENV !== "development") return null;
  const params = new URLSearchParams(window.location.search);
  const who = params.get("lab");
  if (who === "cover") return new LabDirector(canvas, makeCover(), stillFromParams(params));
  return isLabCharacter(who) ? new LabDirector(canvas, makeLab(who), stillFromParams(params)) : null;
}

/** The icon is a staged still. The loop and the poster are filmed from the fight. */
function pickDirector(canvas: HTMLCanvasElement, view: ShowcaseView): LabDirector | FilmDirector {
  const lab = labDirector(canvas);
  if (lab) return lab;
  return view === "icon" ? new LabDirector(canvas, makeCover(), COVER_STILL) : new FilmDirector(canvas, devPlan() ?? PLANS[view]);
}

/**
 * Brawl Battle playing itself for the home screen's media: the loop is a
 * trailer cut from seeded fights between four computer fighters, the
 * poster one big moment, and the icon a staged cover over the logo. Driven
 * by requestAnimationFrame and performance.now, so the capture tool can
 * step it frame by frame and get the same film.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = pickDirector(canvas, view);
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
