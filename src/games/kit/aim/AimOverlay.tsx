"use client";
import "./aim.css";
import { useEffect, useRef } from "react";
import type { Player } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";
import { TARGET_INSET, type ScreenPoint } from "./aim-math";
import { toPixels, type HostAim } from "./host-aim";
import type { AimStep } from "./protocol";

const TARGETS: Partial<Record<AimStep, ScreenPoint>> = {
  center: { x: 0, y: 0 },
  "top-left": { x: -TARGET_INSET, y: TARGET_INSET },
  "bottom-right": { x: TARGET_INSET, y: -TARGET_INSET },
};

interface AimOverlayProps {
  aim: HostAim;
  players: () => readonly Player[];
  /** Draw each player's laser dot. Off for games that draw their own aim in 3D. */
  dots?: boolean;
  /** Show calibration targets. Games can hide them during cutscenes and end screens. */
  targets?: boolean;
}

/**
 * A see through layer over the whole game screen. While a player
 * calibrates it shows the target they should point at, ringed in their
 * colour with their name. During play it draws every player's laser dot.
 */
export function AimOverlay({ aim, players, dots = true, targets = true }: AimOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read through a ref, so a new players function each render never restarts the drawing loop.
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
      if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const everyone = playersRef.current().filter((player) => player.connected);
      // Players looking for the same target share it, their names stacked under it.
      const waiting = new Map<AimStep, Player[]>();
      for (const player of everyone) {
        const step = aim.step(player.seat);
        if (step && TARGETS[step]) waiting.set(step, [...(waiting.get(step) ?? []), player]);
      }
      if (targets) for (const [step, who] of waiting) drawTarget(ctx, toPixels(TARGETS[step]!, width, height), who, now);
      if (dots) {
        for (const player of everyone) {
          const point = aim.point(player.seat, now);
          if (point) drawDot(ctx, toPixels(point, width, height), playerColor(player.seat), player.name);
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [aim, dots, targets]);

  return <canvas ref={canvasRef} className="aim-overlay" aria-hidden="true" />;
}

function drawTarget(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, who: Player[], now: number): void {
  const pulse = 1 + Math.sin(now / 220) * 0.08;
  const colour = playerColor(who[0]!.seat);
  ctx.save();
  ctx.lineWidth = 4;
  for (const [radius, alpha] of [[46, 1], [28, 0.8]] as const) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius * pulse, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  who.forEach((player, i) => {
    const below = at.y + 78 + i * 30;
    const y = below > ctx.canvas.clientHeight - 24 ? at.y - 70 - i * 30 : below;
    const text = `${player.name}, point here`;
    // A dark pill behind the name, so it reads on any game's background.
    const width = ctx.measureText(text).width + 24;
    ctx.fillStyle = "rgba(10, 10, 20, 0.78)";
    ctx.beginPath();
    ctx.roundRect(at.x - width / 2, y - 13, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = playerColor(player.seat);
    ctx.fillText(text, at.x, y);
  });
  ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, colour: string, name: string): void {
  ctx.save();
  const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 28);
  glow.addColorStop(0, colour);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(at.x, at.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = "600 13px system-ui, sans-serif";
  ctx.fillStyle = colour;
  ctx.fillText(name, at.x + 16, at.y - 14);
  ctx.restore();
}
