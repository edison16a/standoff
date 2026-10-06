"use client";
import { Fragment } from "react";
import { useKeyboardUi } from "../keyboard-store";
import type { ControlRow, KeyboardBinding, KeyCaps } from "../types";

function Caps({ caps }: { caps: KeyCaps }) {
  const list = typeof caps === "string" ? [caps] : caps;
  return (
    <span className="kb-card__caps">
      {list.map((cap) => (
        <kbd key={cap} className="kb-card__cap">
          {cap}
        </kbd>
      ))}
    </span>
  );
}

function Row({ row }: { row: ControlRow }) {
  return (
    <li className="kb-card__row">
      <span className="kb-card__action">{row.action}</span>
      <span className="kb-card__keys">
        {row.keys.map((caps, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="kb-card__or">or</span>}
            <Caps caps={caps} />
          </Fragment>
        ))}
      </span>
    </li>
  );
}

/**
 * The game's keyboard controls, in a small card over the big screen while
 * the keyboard player is on. Escape puts it away and brings it back.
 */
export function ControlsCard({ binding }: { binding: KeyboardBinding | null }) {
  const hidden = useKeyboardUi((ui) => ui.cardHidden);
  const phone = useKeyboardUi((ui) => ui.phone);
  if (hidden) return null;
  const seat = phone?.seat ? `seat ${phone.seat}` : "taking a seat";

  return (
    <aside className="kb-card" data-keyboard-skip aria-label="Keyboard controls">
      <p className="kb-card__hint">
        Keyboard player: {seat}. Esc hides this card.
      </p>
      {binding ? (
        binding.controls.map((group) => (
          <section key={group.title} className="kb-card__group">
            <h3 className="kb-card__title">{group.title}</h3>
            <ul className="kb-card__rows">
              {group.rows.map((row) => (
                <Row key={row.action} row={row} />
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="kb-card__empty">This game has no keyboard controls yet. Play it with the mouse on the phone panel.</p>
      )}
      <p className="kb-card__foot">Menus and picks: click the phone panel.</p>
    </aside>
  );
}
