"use client";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "@/components/ui/IconButton";
import { AdminPanel } from "@/platform/admin/AdminPanel";
import { FrameMeterBadge } from "@/platform/admin/FrameMeterBadge";
import { TapBurst } from "@/platform/admin/tap-burst";
import { startFrameLimiter } from "@/platform/frame-rate/frame-limiter";
import { SettingsPanel } from "./SettingsPanel";

interface Anchor {
  top: number;
  right: number;
}

type Mode = "settings" | "admin";

/**
 * The gear in the top right tools. The panel is drawn in a portal with a
 * fixed position because the tools capsule clips anything that spills out
 * of it. Full screen covers the whole page, so the body is always shown.
 *
 * Three quick taps open the hidden admin panel instead. A single tap
 * still opens settings straight away, so nobody waits on the count.
 */
export function SettingsButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [mode, setMode] = useState<Mode>("settings");
  const [burst] = useState(() => new TapBurst());

  // The gear is on every host screen, so it is where the frame limiter
  // starts. Starting is idempotent and the limiter outlives the button.
  useEffect(startFrameLimiter, []);

  const open = (next: Mode) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMode(next);
    setAnchor({ top: rect.bottom + 10, right: window.innerWidth - rect.right });
  };

  const onTap = (event: MouseEvent) => {
    if (burst.tap(event.timeStamp)) return open("admin");
    if (anchor) return setAnchor(null);
    open("settings");
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
        onClick={onTap}
      />
      {anchor &&
        createPortal(
          <div
            ref={panelRef}
            className="settings"
            role="dialog"
            aria-label={mode === "admin" ? "Admin" : "Settings"}
            style={anchor}
          >
            {mode === "admin" ? <AdminPanel /> : <SettingsPanel />}
          </div>,
          document.body,
        )}
      <FrameMeterBadge />
    </>
  );
}
