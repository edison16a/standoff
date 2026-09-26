"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Slider } from "@/components/ui/Slider";
import {
  loadAudioSettings,
  onAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from "@/platform/audio/audio-settings";
import { FrameRateSection } from "./FrameRateSection";

const ROWS: { key: keyof AudioSettings; label: string }[] = [
  { key: "music", label: "Music" },
  { key: "effects", label: "Sound effects" },
];

/** Two volume sliders and the frame rate cap. Changes apply live. */
export function SettingsPanel() {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);
  useEffect(() => onAudioSettings(setSettings), []);

  return (
    <>
      <p className="settings__title">
        <Icon name="volume" />
        Sound
      </p>
      {ROWS.map(({ key, label }) => {
        const percent = Math.round(settings[key] * 100);
        return (
          <label key={key} className="settings__row">
            <span className="settings__label">
              {label}
              <span className="settings__value">{percent === 0 ? "Off" : `${percent}%`}</span>
            </span>
            <Slider
              min={0}
              max={100}
              value={percent}
              aria-label={`${label} volume`}
              onChange={(value) => saveAudioSettings({ ...settings, [key]: value / 100 })}
            />
          </label>
        );
      })}
      <FrameRateSection />
    </>
  );
}
