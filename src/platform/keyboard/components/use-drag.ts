"use client";
import { useState, type PointerEvent as ReactPointerEvent } from "react";

const KEY = "standoff:keyboard-panel";
const MARGIN = 16;

interface Point {
  x: number;
  y: number;
}

function clamp(point: Point, size: { width: number; height: number }): Point {
  const maxX = Math.max(MARGIN, window.innerWidth - size.width - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - size.height - MARGIN);
  return { x: Math.min(maxX, Math.max(MARGIN, point.x)), y: Math.min(maxY, Math.max(MARGIN, point.y)) };
}

/** Where the tester left the panel last time, or the bottom right corner. */
function start(size: { width: number; height: number }): Point {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null") as Point | null;
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return clamp(saved, size);
  } catch {
    // A bad or blocked store just means the corner.
  }
  return clamp({ x: Infinity, y: Infinity }, size);
}

/**
 * Drags a floating box by a handle. The pointer is captured, so moving
 * over the phone page inside never steals the drag, and the box is kept
 * on screen.
 */
export function useDrag(size: { width: number; height: number }) {
  const [position, setPosition] = useState(() => start(size));
  const [grab, setGrab] = useState<Point | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as Element).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setGrab({ x: event.clientX - position.x, y: event.clientY - position.y });
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (grab) setPosition(clamp({ x: event.clientX - grab.x, y: event.clientY - grab.y }, size));
  };
  const onPointerUp = () => {
    if (!grab) return;
    setGrab(null);
    try {
      localStorage.setItem(KEY, JSON.stringify(position));
    } catch {
      // Not remembered, which is fine.
    }
  };
  return { position, handle: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp } };
}
