"use client";
import { useEffect, useRef, useState } from "react";
import type { ShowcaseView } from "@/platform/games/game-api";
import { ShowcaseDirector } from "./director";
import { WinnersPreview } from "./WinnersPreview";

/**
 * Paintball Battle playing itself for the home screen's media: the loop
 * is a wordless trailer cut from a seeded 2v2 of computer players, the
 * poster holds a shotgun blast at close range, and the icon is the paint
 * hitting its target from down on the grass, under the logo. Driven by
 * requestAnimationFrame and performance.now, so the capture tool can
 * step it frame by frame and get the same film. `?winners=1` or `2`
 * shows the results' winners' scene instead, for looking it over.
 */
export function Showcase({ view }: { view: ShowcaseView }) {
  // The showcase only ever mounts in the browser, so the address can be read straight away.
  const [winners] = useState(() => new URLSearchParams(window.location.search).get("winners"));
  if (winners === "1" || winners === "2") return <WinnersPreview count={winners === "2" ? 2 : 1} />;
  return <Duel view={view} />;
}

function Duel({ view }: { view: ShowcaseView }) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    // A fresh canvas per mount, since the director gives its WebGL context back when it goes.
    const canvas = document.createElement("canvas");
    canvas.className = "cb-showcase__canvas";
    box.prepend(canvas);
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
      canvas.remove();
    };
  }, [view]);

  return (
    <div className={`cb-showcase cb-showcase--${view}`}>
      <div ref={boxRef} className="cb-showcase__box" />
      {view === "icon" && (
        <div className="cb-showcase__logo" aria-hidden="true">
          <span>Paintball</span>
          <b>Battle</b>
        </div>
      )}
    </div>
  );
}
