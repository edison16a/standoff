"use client";
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import type { CameraKit } from "../host/camera-kit";
import type { KitStatus } from "../host/kit-status";

/** The kit's status, re-rendering only when it changes: a few times a second at most. */
export function useKitStatus(kit: CameraKit): KitStatus {
  return useSyncExternalStore(kit.subscribe, kit.getSnapshot, kit.getSnapshot);
}

/** An element's size in CSS pixels, kept up to date as the window resizes. */
export function useBoxSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
