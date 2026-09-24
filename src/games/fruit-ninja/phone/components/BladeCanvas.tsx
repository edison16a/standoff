"use client";
import { useEffect, useRef } from "react";
import type { BladeId } from "../../blades";
import { BladePreview } from "../blade-preview";

/** A live, looping preview of one blade style. */
export function BladeCanvas({ blade, colour, className }: { blade: BladeId; colour: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const preview = new BladePreview(blade, colour);
    let frame = 0;
    let last = performance.now();
    // Each card starts at a different point of the loop, so the grid never moves in lockstep.
    const offset = Math.random() * 10;
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
      if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      preview.draw(ctx, width, height, now / 1000 + offset, dt);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [blade, colour]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
