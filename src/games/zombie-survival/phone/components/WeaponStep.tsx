"use client";
import { WEAPON_IDS, WEAPONS, weaponBars, weaponFacts, type WeaponBars } from "../../engine/weapons";
import { usePhoneStore } from "../phone-store";
import { GunViewer } from "./GunViewer";
import { usePhone } from "./session-context";

const ROWS: { key: keyof WeaponBars; label: string }[] = [
  { key: "damage", label: "Damage" },
  { key: "rate", label: "Fire rate" },
  { key: "magazine", label: "Magazine" },
  { key: "reload", label: "Reload speed" },
];

/** The gun pick: tabs for the four guns, the chosen one turning in 3D, and its numbers. */
export function WeaponStep() {
  const session = usePhone();
  const weapon = usePhoneStore((s) => s.weapon);
  const spec = WEAPONS[weapon];
  const bars = weaponBars(weapon);
  const facts = weaponFacts(weapon);
  const index = WEAPON_IDS.indexOf(weapon);
  const step = (by: number) => session.pick(WEAPON_IDS[(index + by + WEAPON_IDS.length) % WEAPON_IDS.length]!);

  return (
    <div className="zs-weapon">
      <div className="zs-weapon__tabs" role="tablist" aria-label="Weapons">
        {WEAPON_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === weapon}
            className={`zs-weapon__tab ${id === weapon ? "zs-weapon__tab--on" : ""}`}
            onClick={() => session.pick(id)}
          >
            {WEAPONS[id].name}
          </button>
        ))}
      </div>
      <div className="zs-weapon__stage">
        <GunViewer weapon={weapon} />
        <button type="button" className="zs-weapon__arrow zs-weapon__arrow--left" aria-label="Previous gun" onClick={() => step(-1)}>
          ‹
        </button>
        <button type="button" className="zs-weapon__arrow zs-weapon__arrow--right" aria-label="Next gun" onClick={() => step(1)}>
          ›
        </button>
      </div>
      <div className="zs-weapon__about">
        <h3>{spec.name}</h3>
        <p>{spec.blurb}</p>
        <span className="zs-weapon__mode">{spec.auto ? "Automatic: hold to fire" : "Pump action: tap to fire"}</span>
      </div>
      <dl className="zs-stats">
        {ROWS.map((row) => (
          <div key={row.key} className="zs-stats__row">
            <dt>{row.label}</dt>
            <dd>
              <span className="zs-stats__bar">
                <span className="zs-stats__fill" style={{ width: `${Math.round(bars[row.key] * 100)}%` }} />
              </span>
              <span className="zs-stats__value">{facts[row.key]}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
