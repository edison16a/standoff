"use client";
import "./aim.css";
import { useEffect, useRef } from "react";
import type { Player } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";
import { sameZone, TARGET_INSET, WHOLE_SCREEN, type AimZone, type ScreenPoint } from "./aim-math";
import { zonePixels, type HostAim } from "./host-aim";
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

type Box = { x: number; y: number; w: number; h: number };

/**
 * A see through layer over the whole game screen. While a player
 * calibrates it shows the target they should point at, ringed in their
 * colour with their name. During play it draws every player's laser dot.
 * A seat given a zone (see HostAim.setZone) sees its targets inside it,
 * with the zone outlined in its colour, and its dot moves within it.
 */
export function AimOverlay({ aim, players, dots = true, targets = true }: AimOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read through refs, so new props on a render never restart the drawing loop.
  const playersRef = useRef(players);
  const showRef = useRef({ dots, targets });
  useEffect(() => {
    playersRef.current = players;
    showRef.current = { dots, targets };
  }, [players, dots, targets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const draw = (now: number) => {
      // The next frame is booked first, so one frame that fails never stops the layer.
      frame = requestAnimationFrame(draw);
      const { dots, targets } = showRef.current;
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * dpr)) canvas.width = Math.round(width * dpr);
      if (canvas.height !== Math.round(height * dpr)) canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const everyone = playersRef.current().filter((player) => player.connected);
      // Players looking for the same target in the same zone share it, their names stacked under it.
      const waiting = new Map<string, { at: { x: number; y: number }; zone: AimZone; who: Player[] }>();
      for (const player of everyone) {
        const step = aim.step(player.seat);
        const target = step ? TARGETS[step] : undefined;
        if (!target) continue;
        const zone = aim.zone(player.seat);
        const at = zonePixels(target, zone, width, height);
        const key = `${Math.round(at.x)},${Math.round(at.y)}`;
        const spot = waiting.get(key) ?? { at, zone, who: [] };
        spot.who.push(player);
        waiting.set(key, spot);
      }
      if (targets) {
        for (const { at, zone, who } of waiting.values()) {
          const box = { x: zone.x * width, y: zone.y * height, w: zone.w * width, h: zone.h * height };
          if (!sameZone(zone, WHOLE_SCREEN)) drawZone(ctx, box, playerColor(who[0]!.seat));
          drawTarget(ctx, at, who, now, box);
        }
      }
      if (dots) {
        for (const player of everyone) {
          const point = aim.point(player.seat, now);
          if (point) drawDot(ctx, zonePixels(point, aim.zone(player.seat), width, height), playerColor(player.seat), player.name);
        }
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [aim]);

  return <canvas ref={canvasRef} className="aim-overlay" aria-hidden="true" />;
}

/** The outline of a player's zone while they calibrate in it, so they can see which part of the screen is theirs. */
function drawZone(ctx: CanvasRenderingContext2D, box: Box, colour: string): void {
  ctx.save();
  ctx.fillStyle = "rgba(10, 10, 20, 0.28)";
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.roundRect(box.x + 8, box.y + 8, box.w - 16, box.h - 16, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTarget(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, who: Player[], now: number, box: Box): void {
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
    const y = below > box.y + box.h - 24 ? at.y - 70 - i * 30 : below;
    const text = `${player.name}, point here`;
    // A dark pill behind the name, so it reads on any game's background.
    const width = ctx.measureText(text).width + 24;
    // Kept inside the zone, so a target near its edge never pushes the name off it.
    const x = Math.min(Math.max(at.x, box.x + width / 2 + 4), box.x + box.w - width / 2 - 4);
    ctx.fillStyle = "rgba(10, 10, 20, 0.78)";
    ctx.beginPath();
    ctx.roundRect(x - width / 2, y - 13, width, 26, 13);
    ctx.fill();
    ctx.fillStyle = playerColor(player.seat);
    ctx.fillText(text, x, y);
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
