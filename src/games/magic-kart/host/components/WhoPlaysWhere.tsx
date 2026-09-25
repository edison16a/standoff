"use client";
import { useEffect, useState } from "react";
import { SplitMap, type SplitPane } from "@/games/kit/split/SplitMap";
import type { ViewRect } from "../../render/layout";
import type { ViewHud } from "../host-store";

/** The stage fills the window, so its shape is the window's. */
function useScreenAspect(): number {
  const [aspect, setAspect] = useState(16 / 9);
  useEffect(() => {
    const fit = () => setAspect(window.innerWidth / Math.max(1, window.innerHeight));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return aspect;
}

/** Each player's name and colour in the rect their view is drawn in. */
export function splitPanes(views: readonly ViewHud[], rects: readonly ViewRect[]): SplitPane[] {
  return views.flatMap((view, i) => {
    const rect = rects[i];
    return rect ? [{ name: view.name, color: view.color, rect }] : [];
  });
}

/**
 * The small picture of the split screen in the overview, so everyone on
 * the couch finds their own view at a glance. It takes the same rects the
 * renderer draws with, and shows nothing for a single view.
 */
export function WhoPlaysWhere({ views, rects }: { views: readonly ViewHud[]; rects: readonly ViewRect[] }) {
  const aspect = useScreenAspect();
  return <SplitMap panes={splitPanes(views, rects)} aspect={aspect} className="mk-overview__split" />;
}
