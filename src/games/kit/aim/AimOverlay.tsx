"use client";
import "./aim.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Player } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";
import { sameZone, WHOLE_SCREEN, type AimZone, type ScreenPoint } from "./aim-math";
import { TARGET_POINTS } from "./aim-targets";
import { insideBox, zonePixels, type HostAim } from "./host-aim";
import { TargetMark } from "./look/TargetMark";
import { drawDot, drawZone, planMark, type MarkPlan } from "./overlay-draw";
import type { AimStep } from "./protocol";

const TARGETS: Partial<Record<AimStep, ScreenPoint>> = TARGET_POINTS;

/** A dot held at the edge is drawn this far inside it, so all of it stays in sight. */
const DOT_MARGIN = 14;
/** For a game with its own pointer, the dot at the edge fades out over this long once the aim comes back in, so a hand shaking right at the edge never makes it blink. */
const EDGE_FADE_MS = 250;

interface AimOverlayProps {
  aim: HostAim;
  players: () => readonly Player[];
  /**
   * Draw each player's laser dot. Off for games that draw their own
   * pointer, which still get the dot while the aim is held at the edge,
   * where the page's tool bar or the game's own scoreboard could hide theirs.
   */
  dots?: boolean;
  /** Show calibration targets. Games can hide them during cutscenes and end screens. */
  targets?: boolean;
}

const noSubscribe = () => () => undefined;

/**
 * A see through layer over the whole game screen. While a player
 * calibrates it shows the target they should point at, drawn the way
 * every aiming game draws it (look/TargetMark), with their name. During play it draws every player's laser dot.
 * A seat given a zone (see HostAim.setZone) sees its targets inside it,
 * with the zone outlined in its colour, and its dot moves within it.
 * Games that draw their own pointer still get the dot at the edge, so an
 * aim held there is always in sight.
 * Targets and dots are pointers, so the layer sits on top of the page,
 * over the join card and the tool bar, while still drawing in the box of
 * the element it is placed in.
 */
export function AimOverlay({ aim, players, dots = true, targets = true }: AimOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  // Targets are page elements, so they pulse and glow exactly as Blade Clash's do. They change only with a step or a resize.
  const [marks, setMarks] = useState<MarkPlan[]>([]);
  // The page only exists in the browser, so the layer is added there.
  const client = useSyncExternalStore(noSubscribe, () => true, () => false);
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
    // The game's own box: the element the overlay is placed in.
    const stage = anchorRef.current?.parentElement;
    if (!canvas || !ctx || !stage) return;
    let frame = 0;
    let shown = "";
    const lastAtEdge = new Map<number, number>();
    const draw = (now: number) => {
      // The next frame is booked first, so one frame that fails never stops the layer.
      frame = requestAnimationFrame(draw);
      const { dots, targets } = showRef.current;
      const dpr = window.devicePixelRatio || 1;
      const page = { w: canvas.clientWidth, h: canvas.clientHeight };
      if (canvas.width !== Math.round(page.w * dpr)) canvas.width = Math.round(page.w * dpr);
      if (canvas.height !== Math.round(page.h * dpr)) canvas.height = Math.round(page.h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, page.w, page.h);
      const { left, top, width, height } = stage.getBoundingClientRect();
      ctx.translate(left, top);
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
      const plans: MarkPlan[] = [];
      if (targets) {
        for (const { at, zone, who } of waiting.values()) {
          const box = { x: zone.x * width, y: zone.y * height, w: zone.w * width, h: zone.h * height };
          if (!sameZone(zone, WHOLE_SCREEN)) drawZone(ctx, box, playerColor(who[0]!.seat));
          const plan = planMark(at, who, box);
          // Whole pixels, so a resize redraws them but float noise never does.
          plans.push({ ...plan, at: { x: Math.round(left + at.x), y: Math.round(top + at.y) } });
        }
      }
      const signature = JSON.stringify(plans.map((p) => [p.at.x, p.at.y, p.colour, p.words, p.above, p.align]));
      if (signature !== shown) {
        shown = signature;
        setMarks(plans);
      }
      for (const player of everyone) {
        if (!dots && aim.atEdge(player.seat, now)) lastAtEdge.set(player.seat, now);
        const fade = dots ? 1 : 1 - (now - (lastAtEdge.get(player.seat) ?? -Infinity)) / EDGE_FADE_MS;
        if (fade <= 0) continue;
        const point = aim.point(player.seat, now);
        if (!point) continue;
        const zone = aim.zone(player.seat);
        const box = { x: zone.x * width, y: zone.y * height, w: zone.w * width, h: zone.h * height };
        const at = insideBox(zonePixels(point, zone, width, height), box, DOT_MARGIN);
        // A game with its own pointer says whose it is its own way, so its dot at the edge needs no name.
        drawDot(ctx, at, playerColor(player.seat), dots ? player.name : "", box, Math.min(1, fade));
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [aim, client]);

  return (
    <>
      <span ref={anchorRef} hidden />
      {client &&
        createPortal(
          <>
            <canvas ref={canvasRef} className="aim-overlay" aria-hidden="true" />
            <div className="aim-overlay">
              {marks.map((mark) => (
                <TargetMark key={mark.key} left={`${mark.at.x}px`} top={`${mark.at.y}px`} colour={mark.colour} words={mark.words} wordsAbove={mark.above} align={mark.align} />
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
