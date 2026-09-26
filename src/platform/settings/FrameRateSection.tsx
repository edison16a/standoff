"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { onRefreshRate, refreshRate } from "@/platform/frame-rate/frame-limiter";
import {
  capChoices,
  effectiveCap,
  loadFrameRate,
  onFrameRate,
  saveFrameRate,
  type FrameRateSettings,
} from "@/platform/frame-rate/frame-rate-settings";
import "./frame-rate.css";

/**
 * The frame rate cap as a row of choices: Max, then every common rate
 * below the screen's own. Changes apply at once to the whole page.
 */
export function FrameRateSection() {
  const [settings, setSettings] = useState<FrameRateSettings>(loadFrameRate);
  const [screen, setScreen] = useState<number | null>(refreshRate);
  useEffect(() => onFrameRate(setSettings), []);
  useEffect(() => onRefreshRate(setScreen), []);

  const chosen = effectiveCap(settings.cap, screen);
  const choices: { cap: number | null; label: string }[] = [
    { cap: null, label: "Max" },
    ...capChoices(screen).map((cap) => ({ cap, label: String(cap) })),
  ];

  return (
    <>
      <p className="settings__title">
        <Icon name="sliders" />
        Frame rate
      </p>
      <div className="settings__row">
        <span className="settings__label">
          Limit
          <span className="settings__value">{screen ? `Screen ${screen} Hz` : "Measuring"}</span>
        </span>
        <div className="frame-rate" role="radiogroup" aria-label="Frame rate limit">
          {choices.map(({ cap, label }) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={cap === chosen}
              aria-label={cap === null ? "Max, the screen's own rate" : `${cap} frames per second`}
              className={`frame-rate__choice ${cap === chosen ? "frame-rate__choice--on" : ""}`}
              onClick={() => saveFrameRate({ cap })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
