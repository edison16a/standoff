"use client";
import { useEffect, useRef } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";
import "../styles/showcase.css";

/**
 * Blade Clash playing itself for the home screen's media: the loop and
 * the poster are the split screen duel, the icon a close shot of blades
 * meeting under the title. Driven by requestAnimationFrame and
 * performance.now, with a scripted duel, so the capture tool can step it
 * frame by frame and get the same film every time.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new ShowcaseDirector(canvas, view);
    const fit = () => director.resize(canvas.clientWidth, canvas.clientHeight, 1);
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
    <div className={`bc-show bc-show--${view}`}>
      <canvas ref={canvasRef} className="bc-show__canvas" />
      {view === "icon" && (
        <div className="bc-show__title" aria-hidden="true">
          <span>Blade</span>
          <b>Clash</b>
        </div>
      )}
    </div>
  );
}
