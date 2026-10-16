"use client";
import { useEffect, useRef, useState } from "react";
import type { PhoneState } from "../../protocol";
import { drop, IDLE, lift, litSlot, press, slide, slotAt, type Box, type Gesture } from "../throw-gesture";
import { usePhone } from "./session-context";

/**
 * Wires the throw buttons' press, slide and release (throw-gesture.ts)
 * to the pointer. The group captures the finger, so it keeps hearing it
 * as it slides over the other buttons on iOS Safari and Android Chrome
 * alike; which button is under it comes from the buttons' boxes, read
 * once as the finger lands. The light goes to the host only when it
 * changes, and the hold ends when the throw window closes.
 */
export function useThrowGesture(host: PhoneState) {
  const phone = usePhone();
  const [gesture, setGesture] = useState<Gesture>(IDLE);
  const [windowOpen, setWindowOpen] = useState(host.canThrow);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const boxes = useRef<Box[]>([]);
  const open = host.throws;

  // A pass, a pitch, a sack, a turnover or the whistle: the hold is over, whatever the finger does.
  if (windowOpen !== host.canThrow) {
    setWindowOpen(host.canThrow);
    if (!host.canThrow) setGesture(IDLE);
  }

  const lit = litSlot(gesture, open);
  useEffect(() => {
    phone.highlight(lit);
  }, [phone, lit]);
  // The buttons went away mid hold (the QB pressed Run): nothing stays lit.
  useEffect(() => () => phone.highlight(null), [phone]);

  const under = (event: React.PointerEvent) => slotAt(boxes.current, event.clientX, event.clientY);

  const handlers = {
    onPointerDown(event: React.PointerEvent<HTMLElement>) {
      if (event.button !== 0 || !host.canThrow) return;
      event.preventDefault();
      boxes.current = buttons.current.map((b) => b?.getBoundingClientRect() ?? { left: 0, top: 0, right: -1, bottom: -1 });
      const next = press(gesture, event.pointerId, under(event));
      if (next === gesture) return;
      // Captured, the finger is still ours as it slides off the button it landed on.
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setGesture(next);
    },
    onPointerMove(event: React.PointerEvent<HTMLElement>) {
      if (gesture.pointer === event.pointerId) setGesture(slide(gesture, event.pointerId, under(event)));
    },
    onPointerUp(event: React.PointerEvent<HTMLElement>) {
      const { next, throwAt } = lift(gesture, event.pointerId, under(event), open);
      if (next === gesture) return;
      if (throwAt !== null) phone.throwTo(throwAt);
      setGesture(next);
    },
    onPointerCancel(event: React.PointerEvent<HTMLElement>) {
      setGesture(drop(gesture, event.pointerId));
    },
    onLostPointerCapture(event: React.PointerEvent<HTMLElement>) {
      setGesture(drop(gesture, event.pointerId));
    },
  };

  return { gesture, lit, buttons, handlers };
}
