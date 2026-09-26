"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";

/**
 * Basketball 3v3 playing itself for the home screen's media: the loop is a
 * highlight from the broadcast camera, the poster one great frame, and
 * the icon a close hero shot under the logo. Driven by
 * requestAnimationFrame and performance.now, with seeded randomness, so
 * the capture tool can step it frame by frame and get the same film.
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
    <div className="nba-showcase">
      <canvas ref={canvasRef} className="nba-showcase__canvas" />
      {view === "icon" && (
        <div className="nba-showcase__logo" aria-hidden="true">
          <span className="nba-showcase__nba">Basketball</span>
          <span className="nba-showcase__3v3">3v3</span>
        </div>
      )}
    </div>
  );
}
