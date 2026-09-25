"use client";
import { useEffect, useRef } from "react";

const COLOURS = ["#ff4fd8", "#3ee6ff", "#ffe14d", "#3dff6e", "#ff8a3d", "#a98bff"];

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  turn: number;
  size: number;
  colour: string;
}

/**
 * A burst of confetti over a finished level: two cannons from the bottom
 * corners, then a slow fall. It fills its parent and stops by itself.
 */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const g = canvas?.getContext("2d");
    if (!canvas || !g) return;
    const width = (canvas.width = canvas.clientWidth);
    const height = (canvas.height = canvas.clientHeight);
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pieces: Piece[] = Array.from({ length: 180 }, (_, i) => {
      const left = i % 2 === 0;
      const angle = (left ? -1 : -2.14) + (random() - 0.5) * 0.7;
      const speed = height * (1.1 + random() * 0.9);
      return {
        x: left ? 0 : width,
        y: height,
        vx: Math.cos(angle) * speed * 0.6,
        vy: Math.sin(angle) * speed,
        spin: (random() - 0.5) * 14,
        turn: random() * 6,
        size: 6 + random() * 8,
        colour: COLOURS[i % COLOURS.length]!,
      };
    });
    let last = performance.now();
    let frame = 0;
    const started = last;
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.clearRect(0, 0, width, height);
      for (const p of pieces) {
        p.vy += height * 1.1 * dt;
        p.vx *= 1 - 1.2 * dt;
        p.vy *= 1 - 0.8 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.turn += p.spin * dt;
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.turn);
        g.fillStyle = p.colour;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, (p.size / 2) * Math.abs(Math.cos(p.turn * 1.7)) + 1);
        g.restore();
      }
      if (now - started < 5000) frame = requestAnimationFrame(draw);
      else g.clearRect(0, 0, width, height);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={ref} className="cg-confetti" aria-hidden="true" />;
}
