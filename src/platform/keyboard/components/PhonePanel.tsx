"use client";
import type { Ref } from "react";
import { Icon } from "@/components/ui/Icon";
import { setKeyboardRoom, useKeyboardUi } from "../keyboard-store";
import { useDrag } from "./use-drag";

/** An iPhone 16's screen in CSS pixels, the size phone pages are made to fit. */
const UPRIGHT = { width: 393, height: 852 };
const SIDEWAYS = { width: 852, height: 393 };
/** Room for the panel's title bar and a margin, so the phone fits a laptop screen. */
const CHROME = 150;

/** Upright it takes most of the height. Sideways it takes under half the width. */
function fitScale(sideways: boolean): number {
  const fit = sideways ? (window.innerWidth * 0.42) / SIDEWAYS.width : (window.innerHeight - CHROME) / UPRIGHT.height;
  return Math.max(0.36, Math.min(0.62, fit));
}

/**
 * The keyboard player's phone, floating over the big screen. It can be
 * dragged by its title bar and folded down to it. The phone page inside
 * keeps the seat, so folding only hides it.
 */
export function PhonePanel({ code, ref }: { code: string; ref: Ref<HTMLIFrameElement> }) {
  const sideways = useKeyboardUi((ui) => ui.sideways);
  const phoneSize = sideways ? SIDEWAYS : UPRIGHT;
  const scale = fitScale(sideways);
  const width = Math.round(phoneSize.width * scale);
  const height = Math.round(phoneSize.height * scale);
  const { position, handle } = useDrag({ width, height: height + 40 });
  const folded = useKeyboardUi((ui) => ui.folded);
  const phone = useKeyboardUi((ui) => ui.phone);
  const cardHidden = useKeyboardUi((ui) => ui.cardHidden);
  const label = phone?.seat ? `${phone.name}, seat ${phone.seat}` : "Keyboard player";

  return (
    <section className="kb-panel" data-keyboard-skip style={{ left: position.x, top: position.y, width }} aria-label="Keyboard player phone">
      <header className="kb-panel__bar" {...handle}>
        <span className="kb-panel__title">
          <span className="kb-panel__dot" data-on={phone?.stage === "playing"} />
          {label}
        </span>
        {cardHidden && (
          <button type="button" className="kb-panel__btn" onClick={() => useKeyboardUi.setState({ cardHidden: false })}>
            Keys
          </button>
        )}
        <button type="button" className="kb-panel__btn" aria-pressed={sideways} onClick={() => useKeyboardUi.setState({ sideways: !sideways })}>
          Rotate
        </button>
        <button type="button" className="kb-panel__btn" aria-expanded={!folded} onClick={() => useKeyboardUi.setState({ folded: !folded })}>
          {folded ? "Show" : "Hide"}
        </button>
        <button type="button" className="kb-panel__btn kb-panel__btn--icon" aria-label="Turn off the keyboard player" title="Turn off" onClick={() => setKeyboardRoom(null)}>
          <Icon name="close" size={16} />
        </button>
      </header>
      <div className="kb-panel__screen" hidden={folded} style={{ width, height }}>
        <iframe
          ref={ref}
          className="kb-panel__frame"
          src={`/keyboard/${code}`}
          title="Keyboard player phone"
          style={{ width: phoneSize.width, height: phoneSize.height, transform: `scale(${scale})` }}
        />
      </div>
    </section>
  );
}
