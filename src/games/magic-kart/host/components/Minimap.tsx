"use client";
import { useEffect, useRef } from "react";
import { Minimap as Painter } from "../../render/minimap";
import { THEMES } from "../../render/themes";
import { useSession } from "./session-context";

/**
 * The overview map at the top right: the whole track and every kart as
 * a dot in its player's colour. Drawn on its own small canvas every
 * frame, straight from the race.
 */
export function Minimap({ className = "" }: { className?: string }) {
  const session = useSession();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const painter = new Painter();
    let frame = 0;
    let size = { w: 0, h: 0 };
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (w !== size.w || h !== size.h) {
        size = { w, h };
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        painter.reset();
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const world = session.world;
      painter.draw(ctx, world, w, h, (id) => {
        const kart = world.karts[id];
        return { color: session.label(id).color, big: kart?.seat !== null };
      }, THEMES[world.track.def.theme].pad);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return <canvas ref={canvasRef} className={`mk-minimap ${className}`} aria-label="Track map" role="img" />;
}
