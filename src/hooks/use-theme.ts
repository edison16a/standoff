"use client";
/**
 * Light and dark theme. The theme lives on the html element as a
 * `data-theme` attribute, set before first paint by the layout script so
 * the page never flashes the wrong colours.
 */
import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
/** The layout's boot script reads the same key. */
export const THEME_STORAGE_KEY = "standoff:theme";

function read(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Lets anything (the canvas, for one) react when the theme flips. */
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const theme = useSyncExternalStore(subscribe, read, () => "light" as Theme);
  const toggleTheme = useCallback(() => {
    const next: Theme = read() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked. The theme still applies for this visit.
    }
  }, []);
  return { theme, toggleTheme };
}
