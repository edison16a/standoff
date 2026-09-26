"use client";
import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const read = () => window.innerWidth / Math.max(1, window.innerHeight);
const server = () => 16 / 9;

/** The window's shape, width over height, so a small map of the screen matches the real one. */
export function useScreenAspect(): number {
  return useSyncExternalStore(subscribe, read, server);
}
