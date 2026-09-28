/**
 * Starting sound as early as the browser allows.
 *
 * The browser rule: a page may not start making sound on its own. An
 * AudioContext made before the visitor has interacted with the page starts
 * "suspended", and `resume()` only works once the page has had a user
 * activation: a tap, a click, a key press. Chrome relaxes this for sites
 * the visitor plays media on often, and for a visitor who already tapped
 * earlier on this site, so asking at load sometimes succeeds at once.
 * Safari on iOS is the strictest and wants the resume inside the gesture
 * itself, which is why every attempt below runs straight in the handler.
 *
 * Mouse moves, wheel turns and scrolls do not count as activation in any
 * browser today, but asking costs nothing and a browser that relaxes the
 * rule later gets the music sooner, so those are tried too.
 */

/** Events that count as activation, first, then the ones that might one day. */
export const FIRST_INTERACTION_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "click",
  "touchstart",
  "touchend",
  "keydown",
  "mousemove",
  "wheel",
] as const;

/** The parts of an AudioContext this needs, so tests can pass a stand in. */
export interface ResumableContext {
  readonly state: AudioContextState | "interrupted";
  resume(): Promise<void>;
  addEventListener(type: "statechange", listener: () => void): void;
  removeEventListener(type: "statechange", listener: () => void): void;
}

export interface StartOptions {
  /** How to start it. Defaults to `ctx.resume()`; the engine's unlock also plays a silent note for old iOS. */
  resume?: () => Promise<void>;
  /** Called once, when the context runs. */
  onRunning?: () => void;
}

/**
 * Tries to start `ctx` now, and again on the first interaction of any
 * kind until it runs. Returns a function that stops listening.
 */
export function startAudioSoon(ctx: ResumableContext, target: EventTarget, options: StartOptions = {}): () => void {
  const resume = options.resume ?? (() => ctx.resume());
  let done = false;
  const tryResume = () => {
    // A resume the browser refuses stays pending or rejects. Either way the next interaction tries again.
    if (ctx.state !== "running") resume().catch(() => undefined);
  };
  const stop = () => {
    for (const type of FIRST_INTERACTION_EVENTS) target.removeEventListener(type, tryResume, { capture: true });
    ctx.removeEventListener("statechange", onState);
  };
  const onState = () => {
    if (done || ctx.state !== "running") return;
    done = true;
    stop();
    options.onRunning?.();
  };

  ctx.addEventListener("statechange", onState);
  // Capture phase, so a control that stops the event still lets it count.
  for (const type of FIRST_INTERACTION_EVENTS) target.addEventListener(type, tryResume, { capture: true, passive: true });
  tryResume();
  onState();
  return () => {
    done = true;
    stop();
  };
}
