"use client";
import { ITEM_NAMES } from "../../engine/items";
import type { PhoneState } from "../../protocol";
import { Arrival, SlotIcon } from "../../ui/SlotIcon";
import { useSlideForward } from "../../ui/use-slide";
import { useController } from "./session-context";

/** What the button says about the item queued behind, for a screen reader. */
function nextLabel(host: PhoneState): string {
  if (!host.next) return "";
  return host.nextRolling ? ". Another is rolling behind it" : `. ${ITEM_NAMES[host.next]} is next`;
}

/**
 * The power up button: a round slot that shows the item a tap uses, with
 * its name underneath, and a smaller slot stacked behind it with the one
 * queued next. It spins while a roulette runs and glows once the item can
 * be used. Using it slides the queued item forward into the big slot. It
 * reacts on touch down, since a thumb that is also steering cannot be
 * trusted to lift cleanly.
 */
export function PowerButton({ host }: { host: PhoneState }) {
  const session = useController();
  const item = host.item;
  const live = item !== null && !host.rolling && host.phase === "racing";
  const state = host.rolling ? "rolling" : live ? "live" : item ? "held" : "empty";
  const name = host.rolling ? "Rolling" : item ? ITEM_NAMES[item] : "No power up";
  const slid = useSlideForward(host.uses, item, host.next);
  return (
    <div className={`mk-power mk-power--${state}`}>
      <div className="mk-power__stack">
        <span className={`mk-power__next ${host.next ? "mk-power__next--full" : ""} ${host.nextRolling ? "mk-power__next--rolling" : ""}`} aria-hidden="true">
          <Arrival key={`${host.uses}-${host.next ?? "none"}`} className="mk-power__next-icon" motion="mk-power__next-icon--in" play={host.next !== null}>
            <SlotIcon item={host.next} rolling={host.nextRolling} />
          </Arrival>
          {host.next && <span className="mk-power__next-tag">Next</span>}
        </span>
        <button
          type="button"
          className="mk-power__button"
          disabled={!live}
          aria-label={(live && item ? `Use ${ITEM_NAMES[item]}` : name) + nextLabel(host)}
          onPointerDown={() => live && session.useItem()}
        >
          <Arrival key={host.uses} className="mk-power__icon" motion="mk-power__icon--slide" play={slid}>
            <SlotIcon item={item} rolling={host.rolling} />
          </Arrival>
        </button>
      </div>
      <span className="mk-power__name" aria-hidden="true">
        {name}
      </span>
      <span className="mk-power__hint" aria-hidden="true">
        {live ? "Tap to use" : item ? "" : "Drive through a box"}
      </span>
    </div>
  );
}
