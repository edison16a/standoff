"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";

/**
 * Counter Battle playing itself for the home screen's media: the loop
 * cuts over the shoulders of a seeded 2v2 of computer players as each
 * takes a kill, the poster holds a shotgun blast at close range, and the
 * icon is the same moment closer, under the logo. Driven by
 * requestAnimationFrame and performance.now, so the capture tool can
 * step it frame by frame and get the same film.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new ShowcaseDirector(canvas, view);
    const fit = () => director.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    let frame = 0;
    // performance.now rather than the frame's timestamp: the capture tool fakes the former.
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
    <div className="cb-showcase">
      <canvas ref={canvasRef} className="cb-showcase__canvas" />
      {view === "icon" && (
        <div className="cb-showcase__logo" aria-hidden="true">
          <span>Counter</span>
          <b>Battle</b>
        </div>
      )}
    </div>
  );
}
