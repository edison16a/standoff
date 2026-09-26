"use client";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { copiesOff, railShift, shortStep, startShift, type RailSizes } from "./rail-math";

/**
 * The games are drawn this many times over so there is always a copy on
 * either side. Seven gives three whole rounds of runway each way, enough for
 * a held arrow key to race along before the row recentres.
 */
export const COPIES = 7;

/** How long the choice must stay put before the row quietly recentres. */
const IDLE_MS = 320;
/** Time constant of the glide. A new target mid glide just bends the path, so held keys never queue up. */
const GLIDE_MS = 70;

/**
 * Runs the home screen's game row. The track slides with a transform driven
 * each frame, not by scrolling, so a held arrow key moves smoothly with no
 * backlog of smooth scrolls. The row stays still while the chosen tile is in
 * view and slides to centre it once a move passes an edge. The choice lives
 * among seven copies of the games and hops back to the middle copy while
 * idle, shifting the track by exactly one copy so nothing visibly moves.
 */
export function useTileRail(
  rowRef: RefObject<HTMLElement | null>,
  trackRef: RefObject<HTMLElement | null>,
  selected: number,
  count: number,
) {
  const middle = Math.floor(COPIES / 2) * count;
  const [place, setPlace] = useState({ at: middle + selected, game: selected });
  const shift = useRef({ now: 0, target: 0, ready: false });
  const pending = useRef(0);
  const frame = useRef(0);

  // A new choice from the arrows or elsewhere: take the short way round.
  if (place.game !== selected) setPlace({ at: place.at + shortStep(place.game, selected, count), game: selected });

  // Runs before paint, so a recentre and the tile that becomes chosen land in the same frame.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    const sizes = measure(row, track);
    const s = shift.current;
    if (pending.current) {
      s.now -= pending.current;
      s.target -= pending.current;
      pending.current = 0;
      paint(track, s.now);
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove("home__tiles--jump")));
      return;
    }
    if (!s.ready) {
      s.now = s.target = startShift(place.at, sizes);
      s.ready = true;
      paint(track, s.now);
      return;
    }
    s.target = railShift(place.at, s.target, sizes);
    glide(track, s, frame);
  }, [rowRef, trackRef, place.at]);

  // Once the choice settles, hop back to the middle copy. Far out, do it at once so the runway never ends.
  useEffect(() => {
    const off = copiesOff(place.at, count, COPIES);
    if (off === 0) return;
    const hop = () => {
      const row = rowRef.current;
      const track = trackRef.current;
      if (!row || !track) return;
      pending.current = off * count * pitchOf(measure(row, track));
      row.classList.add("home__tiles--jump");
      setPlace({ at: place.at - off * count, game: place.game });
    };
    if (Math.abs(off) >= Math.floor(COPIES / 2)) {
      hop();
      return;
    }
    const timer = window.setTimeout(hop, IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [rowRef, trackRef, place, count]);

  // A new screen size changes every measurement, so settle straight onto the new layout.
  const atNow = useRef(place.at);
  useEffect(() => {
    atNow.current = place.at;
  }, [place.at]);
  useEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    let first = true;
    const observer = new ResizeObserver(() => {
      // The observer reports once on start; the layout effect has placed the row already.
      if (first) return void (first = false);
      const s = shift.current;
      s.now = s.target = railShift(atNow.current, s.target, measure(row, track));
      paint(track, s.now);
    });
    observer.observe(row);
    return () => observer.disconnect();
  }, [rowRef, trackRef]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return { at: place.at, pick: (at: number) => setPlace({ at, game: at % count }) };
}

function glide(track: HTMLElement, s: { now: number; target: number }, frame: { current: number }): void {
  cancelAnimationFrame(frame.current);
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let last = performance.now();
  const step = (time: number) => {
    const dt = time - last;
    last = time;
    s.now = still ? s.target : s.now + (s.target - s.now) * (1 - Math.exp(-dt / GLIDE_MS));
    if (Math.abs(s.target - s.now) < 0.5) s.now = s.target;
    paint(track, s.now);
    if (s.now !== s.target) frame.current = requestAnimationFrame(step);
  };
  frame.current = requestAnimationFrame(step);
}

function paint(track: HTMLElement, now: number): void {
  track.style.transform = `translate3d(${-now}px, 0, 0)`;
}

function pitchOf(sizes: RailSizes): number {
  return sizes.small + sizes.gap;
}

/** Reads the settled tile sizes from two hidden probes, so tiles caught mid transition never skew the numbers. */
function measure(row: HTMLElement, track: HTMLElement): RailSizes {
  const probe = (on: boolean) => row.querySelector<HTMLElement>(on ? ".home__probe--on" : ".home__probe--off")?.offsetWidth ?? 0;
  const style = getComputedStyle(track);
  return {
    small: probe(false),
    large: probe(true),
    gap: parseFloat(style.columnGap) || 0,
    edge: parseFloat(style.paddingLeft) || 0,
    width: row.clientWidth,
  };
}
