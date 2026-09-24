"use client";
import { useEffect, useRef } from "react";

const COLORS = ["#ff4d5e", "#ffb347", "#ffe14d", "#6cf08a", "#5fd8ff", "#c77dff", "#ffffff"];
const COUNT = 280;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  w: number;
  h: number;
  color: string;
}

/**
 * Confetti over the results, fired up from both bottom corners and then
 * fluttering down. Plain 2D canvas, drawn only while the results are up.
 */
export function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const w = (canvas.width = canvas.clientWidth);
    const h = (canvas.height = canvas.clientHeight);
    const pieces: Piece[] = [];
    const fire = (fromLeft: boolean) => {
      for (let i = 0; i < COUNT / 2; i++) {
        const angle = ((58 + Math.random() * 30) * Math.PI) / 180;
        const speed = h * (1 + Math.random() * 0.8);
        pieces.push({
          x: fromLeft ? 0 : w,
          y: h,
          vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed,
          vy: -Math.sin(angle) * speed,
          angle: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 16,
          w: 8 + Math.random() * 6,
          h: 12 + Math.random() * 8,
          color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        });
      }
    };
    fire(true);
    fire(false);
    let last = performance.now();
    let frame = 0;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const keep = Math.pow(0.35, dt);
      for (const p of pieces) {
        p.vx *= keep;
        p.vy = p.vy * keep + 900 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        if (p.y > h + 30) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        // Squashing one side makes a flat piece look like it tumbles.
        ctx.scale(1, Math.cos(p.angle * 1.7));
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (pieces.some((p) => p.y <= h + 30)) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="ss-confetti" aria-hidden="true" />;
}
