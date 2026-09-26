"use client";
import { GUN_IDS, GUNS, gunBars } from "../../engine/guns";
import { GunIcon } from "../../ui/GunIcon";
import { usePhoneStore } from "../phone-store";
import { usePhone } from "./session-context";

const ROWS = [
  { key: "damage", label: "Damage" },
  { key: "rate", label: "Fire rate" },
  { key: "magazine", label: "Magazine" },
  { key: "range", label: "Range" },
] as const;

/** The gun pick: four cards, and the chosen gun's story and numbers under them. */
export function GunStep() {
  const session = usePhone();
  const wanted = usePhoneStore((s) => s.wanted);
  const spec = GUNS[wanted];
  const bars = gunBars(wanted);
  return (
    <div className="cb-guns">
      <div className="cb-guns__grid" role="radiogroup" aria-label="Guns">
        {GUN_IDS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={id === wanted} className={`cb-gun ${id === wanted ? "cb-gun--on" : ""}`} onClick={() => session.pick(id)}>
            <GunIcon gun={id} size={84} className="cb-gun__art" />
            <strong>{GUNS[id].name}</strong>
            <span>{GUNS[id].auto ? "Hold to fire" : "Tap to fire"}</span>
          </button>
        ))}
      </div>
      <div className="cb-guns__about">
        <p>{spec.blurb}</p>
        <dl className="cb-stats">
          {ROWS.map((row) => (
            <div key={row.key} className="cb-stats__row">
              <dt>{row.label}</dt>
              <dd>
                <span className="cb-stats__fill" style={{ width: `${Math.round(bars[row.key] * 100)}%` }} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
