"use client";
import { ITEM_NAMES } from "../../engine/items";
import type { PhoneState } from "../../protocol";
import { CubeGlyph, ItemIcon } from "../../ui/icons";
import { Roulette } from "../../ui/Roulette";
import { useController } from "./session-context";

/**
 * The power up button: a round slot that shows the held item with its
 * name underneath, spins while the roulette runs, and glows once the
 * item can be used. Tap it to fire. It reacts on touch down, since a
 * thumb that is also steering cannot be trusted to lift cleanly.
 */
export function PowerButton({ host }: { host: PhoneState }) {
  const session = useController();
  const item = host.item;
  const live = item !== null && !host.rolling && host.phase === "racing";
  const state = host.rolling ? "rolling" : live ? "live" : item ? "held" : "empty";
  const name = host.rolling ? "Rolling" : item ? ITEM_NAMES[item] : "No power up";
  return (
    <div className={`mk-power mk-power--${state}`}>
      <button
        type="button"
        className="mk-power__button"
        disabled={!live}
        aria-label={live && item ? `Use ${ITEM_NAMES[item]}` : name}
        onPointerDown={() => live && session.useItem()}
      >
        <span className="mk-power__icon">{item ? host.rolling ? <Roulette /> : <ItemIcon item={item} /> : <CubeGlyph />}</span>
      </button>
      <span className="mk-power__name" aria-hidden="true">
        {name}
      </span>
      <span className="mk-power__hint" aria-hidden="true">
        {live ? "Tap to use" : item ? "" : "Drive through a cube"}
      </span>
    </div>
  );
}
