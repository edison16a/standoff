"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/IconButton";
import { SettingsPanel } from "./SettingsPanel";

interface Anchor {
  top: number;
  right: number;
}

/**
 * The gear in the top right tools. The panel is drawn in a portal with a
 * fixed position because the tools capsule clips anything that spills out
 * of it. In full screen it goes inside the full screen element, since
 * anything outside that element is hidden.
 */
export function SettingsButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const toggle = () => {
    if (anchor) return setAnchor(null);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  };

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    // The anchor is measured once, so a resize would leave the panel adrift.
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [anchor]);

  return (
    <>
      <IconButton
        ref={buttonRef}
        icon="settings"
        label="Settings"
        aria-expanded={anchor !== null}
        aria-haspopup="dialog"
        onClick={toggle}
      />
      {anchor &&
        createPortal(
          <div ref={panelRef} className="settings" role="dialog" aria-label="Settings" style={anchor}>
            <SettingsPanel />
          </div>,
          document.fullscreenElement ?? document.body,
        )}
    </>
  );
}
