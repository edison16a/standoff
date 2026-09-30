"use client";
import { useEffect, useRef, useState } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { CeremonyNames, showSampleWin } from "./CeremonyNames";
import { ShowcaseDirector } from "./director";
import "../styles/showcase.css";

/**
 * Blade Clash playing itself for the home screen's media: the loop is a
 * trailer cut from a scripted duel, the icon a low shot of the blades
 * meeting under the title, the poster the winning cut. Driven by requestAnimationFrame and
 * performance.now, with a scripted duel, so the capture tool can step it
 * frame by frame and get the same film every time. With `?ceremony` it
 * stays on the winner's ceremony, names and all, for looking it over.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The showcase only ever mounts in the browser, so the address can be read straight away.
  const [ceremony] = useState(() => new URLSearchParams(window.location.search).has("ceremony"));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const director = new ShowcaseDirector(canvas, view, showSampleWin);
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
      {ceremony && <CeremonyNames />}
      {view === "icon" && (
        <div className="bc-show__title" aria-hidden="true">
          <span>Blade</span>
          <b>Clash</b>
        </div>
      )}
    </div>
  );
}
