"use client";
import { useEffect, useRef, useState } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { PLANS, ShowcaseDirector, type Plan } from "./director";
import { FinishPreview, type FinishSample } from "./FinishPreview";
import { Logo } from "./Logo";

const SAMPLES: readonly string[] = ["solo", "race", "tie", "early"];

/**
 * Cube Game playing itself for the home screen's captured media. The
 * icon adds the name as a logo. Everything moves from animation frames
 * alone, so the capture tool can step it. `?finish=solo`, `race`, `tie`
 * or `early` shows the results' celebration instead, for looking it over.
 */
export default function ShowcaseScene({ view }: { view: ShowcaseView }) {
  // The showcase only ever mounts in the browser, so the address can be read straight away.
  const [finish] = useState(() => new URLSearchParams(window.location.search).get("finish"));
  if (finish && SAMPLES.includes(finish)) return <FinishPreview sample={finish as FinishSample} />;
  return <Run view={view} />;
}

function Run({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Tuning scripts can pick any moment of any level with ?plan={...}. Development builds only.
    const custom = process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("plan") : null;
    const director = new ShowcaseDirector(canvas, custom ? { ...PLANS[view], ...(JSON.parse(custom) as Partial<Plan>) } : PLANS[view]);
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
    <div className={`cg-showcase cg-showcase--${view}`}>
      <canvas ref={canvasRef} className="cg-canvas" />
      <div className="cg-showcase__shade" aria-hidden="true" />
      {view === "icon" && <Logo />}
    </div>
  );
}
