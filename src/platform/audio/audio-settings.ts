/**
 * The player's own volume for music and for sound effects, set from the
 * settings button and kept on this device only. Every audio engine that is
 * open applies them on a stage of its own, after the game's mix, so a game
 * setting its levels never undoes the player's choice.
 */
export interface AudioSettings {
  /** 0 to 1. */
  music: number;
  /** 0 to 1, for effects, crowds and interface sounds. */
  effects: number;
}

const KEY = "standoff:audio";
const DEFAULTS: AudioSettings = { music: 0.8, effects: 1 };

type Listener = (settings: AudioSettings) => void;
const listeners = new Set<Listener>();
let current: AudioSettings | null = null;

const clamp = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

export function loadAudioSettings(): AudioSettings {
  if (current) return current;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<AudioSettings> | null;
    current = { music: clamp(raw?.music, DEFAULTS.music), effects: clamp(raw?.effects, DEFAULTS.effects) };
  } catch {
    current = { ...DEFAULTS };
  }
  return current;
}

export function saveAudioSettings(next: AudioSettings): void {
  current = { music: clamp(next.music, DEFAULTS.music), effects: clamp(next.effects, DEFAULTS.effects) };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Without storage the choice still holds until the page closes.
  }
  for (const listener of listeners) listener(current);
}

/** Hears every change. Returns an unsubscribe. */
export function onAudioSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
