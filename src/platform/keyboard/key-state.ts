/** A key event boiled down to what keyboard play needs. Plain data, so it can cross into the phone panel. */
export interface KeyInput {
  code: string;
  down: boolean;
  /** The browser's own auto repeat of a held key. */
  repeat: boolean;
}

/**
 * Which keys are held. A key held down repeats in the browser, and focus
 * can move away before its key up arrives, so this keeps one clean down
 * and one up per press, and can let go of everything at once.
 */
export class KeyState {
  private readonly held = new Set<string>();

  /** Whether this event changes anything. A repeat, or an up for a key never seen going down, does not. */
  apply({ code, down, repeat }: KeyInput): boolean {
    if (down) {
      if (repeat || this.held.has(code)) return false;
      this.held.add(code);
      return true;
    }
    return this.held.delete(code);
  }

  has(code: string): boolean {
    return this.held.has(code);
  }

  /** Lets go of every held key, returning them so each can get its key up. */
  releaseAll(): string[] {
    const codes = [...this.held];
    this.held.clear();
    return codes;
  }
}

const TEXT_INPUTS = new Set(["text", "search", "email", "password", "number", "tel", "url"]);

/** Typing into a field must never steer a kart. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).tagName !== "string") return false;
  const element = target as HTMLElement;
  if (element.isContentEditable) return true;
  const tag = element.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  return tag === "input" && TEXT_INPUTS.has((element as HTMLInputElement).type || "text");
}

/**
 * Keys the browser and the platform keep: shortcuts with a modifier, Tab
 * for focus, Escape for closing things, and the function keys.
 */
export function isSystemKey(event: Pick<KeyboardEvent, "code" | "ctrlKey" | "metaKey" | "altKey">): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return true;
  return event.code === "Tab" || event.code === "Escape" || /^F\d{1,2}$/.test(event.code);
}
