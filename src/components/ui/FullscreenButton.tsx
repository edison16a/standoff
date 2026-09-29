"use client";
import { IconButton } from "./IconButton";

/**
 * Full screen for the whole page, not one screen's frame. The browser
 * leaves full screen when the full screen element is removed, so a frame
 * that unmounts on the way home would drop it. The page root never does,
 * so going home and into another game keeps the big screen full.
 */
export function FullscreenButton() {
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };
  return <IconButton icon="expand" label="Full screen" onClick={toggle} />;
}
