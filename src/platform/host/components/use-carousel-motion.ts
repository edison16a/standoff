"use client";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

const SLIDE_MS = 320;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Longer than the tiles' size transition, so a resize measures settled slots. */
const SETTLE_MS = 300;

/**
 * Animates the tile row when its order rotates, so it reads as one
 * carousel turning. The chosen game always sits in the first slot, so the
 * slots never move once laid out. Each tile slides from its old slot to
 * its new one. A tile that wrapped round from one end to the other would
 * fly across the whole row, so it fades in beside its new slot instead.
 */
export function useCarouselMotion(rowRef: RefObject<HTMLElement | null>, order: readonly string[]): void {
  const slots = useRef<number[]>([]);
  const shown = useRef(order);

  // Slot positions are read when nothing is moving: on mount and after a resize settles.
  useEffect(() => {
    const measure = () => {
      const tiles = rowRef.current?.querySelectorAll<HTMLElement>("[data-tile]");
      slots.current = tiles ? [...tiles].map((tile) => tile.offsetLeft) : [];
    };
    measure();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(measure, SETTLE_MS);
    };
    window.addEventListener("resize", later);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", later);
    };
  }, [rowRef]);

  useLayoutEffect(() => {
    const was = shown.current;
    shown.current = order;
    const row = rowRef.current;
    if (!row || was === order || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const count = order.length;
    order.forEach((id, slot) => {
      const old = was.indexOf(id);
      if (old < 0 || old === slot) return;
      const tile = row.querySelector<HTMLElement>(`[data-tile="${id}"]`);
      const wrapped = Math.abs(old - slot) > count / 2;
      const shift = (slots.current[old] ?? 0) - (slots.current[slot] ?? 0);
      const from = wrapped ? `translateX(${old < slot ? 40 : -40}px)` : `translateX(${shift}px)`;
      tile?.animate([{ transform: from, opacity: wrapped ? 0 : 1 }, { transform: "none", opacity: 1 }], { duration: SLIDE_MS, easing: EASE });
    });
  }, [rowRef, order]);
}
