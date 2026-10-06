"use client";
import { useEffect } from "react";
import { post } from "../bridge";
import { isSystemKey, isTypingTarget } from "../key-state";

/**
 * Keys pressed while the phone panel has focus, after a click on its
 * screen, go up to the host page like any other key. The phone screen is
 * made for touch, so the browser's own use of these keys is stopped: a
 * Space would otherwise press the last button clicked again.
 */
export function usePanelKeys(parent: Window | null): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      // Escape still goes up, since it puts the host page's controls card away.
      if (isSystemKey(event) && event.code !== "Escape") return;
      if (event.code !== "Escape") event.preventDefault();
      post(parent, { type: "key", input: { code: event.code, down: event.type === "keydown", repeat: event.repeat } });
    };
    const onBlur = () => post(parent, { type: "blur" });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", onBlur);
    };
  }, [parent]);
}
