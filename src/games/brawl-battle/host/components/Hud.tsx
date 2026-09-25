"use client";
import { CHARACTERS } from "../../roster";
import { Portrait } from "../../ui/Portrait";
import { useBrawlStore, type FighterCard } from "../host-store";
import { RULES } from "../../engine/tuning";
import { heatColour, shakeAmount } from "../../ui/heat";

const CALLS = { ready: "Ready?", fight: "Fight!", game: "Game!" } as const;

/** The ult meter as a ring round the portrait, glowing once full. */
function UltRing({ value, colour }: { value: number; colour: string }) {
  const r = 46;
  const length = 2 * Math.PI * r;
  return (
    <svg className={`bb-ult ${value >= 1 ? "bb-ult--full" : ""}`} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r={r} className="bb-ult__track" />
      <circle cx="50" cy="50" r={r} className="bb-ult__fill" stroke={colour} strokeDasharray={`${length * value} ${length}`} transform="rotate(-90 50 50)" />
    </svg>
  );
}

function Card({ f }: { f: FighterCard }) {
  const style = { "--fighter": f.colour, "--heat": heatColour(f.percent), "--shake": shakeAmount(f.percent) } as React.CSSProperties;
  return (
    <li className={`bb-card ${f.out ? "bb-card--out" : ""}`} style={style} aria-label={`${f.name}, ${f.percent} percent, ${f.stocks} lives`}>
      <div className="bb-card__face">
        <Portrait character={f.character} colour={f.colour} size={64} />
        <UltRing value={f.ult} colour={f.ult >= 1 ? "#fde047" : "#ffffff"} />
      </div>
      <div className="bb-card__body">
        <span className="bb-card__name">
          {f.name}
          {f.away && <em>Phone away</em>}
        </span>
        {f.out ? (
          <strong className="bb-card__percent bb-card__percent--out">Out</strong>
        ) : (
          <strong key={f.hits} className={`bb-card__percent ${f.hits > 0 ? "bb-card__percent--hit" : ""}`}>
            {f.percent}
            <small>%</small>
          </strong>
        )}
        <span className="bb-card__stocks" aria-hidden="true">
          {Array.from({ length: RULES.stocks }, (_, i) => (
            <span key={i} className={`bb-stock ${i < f.stocks ? "" : "bb-stock--lost"}`} />
          ))}
          <span className="bb-card__role">{f.bot ? "CPU" : CHARACTERS[f.character].name}</span>
        </span>
      </div>
    </li>
  );
}

function Banner() {
  const banner = useBrawlStore((s) => s.banner);
  if (!banner) return null;
  return (
    <div key={banner.key} className="bb-banner" style={{ "--banner": banner.colour } as React.CSSProperties} aria-live="polite">
      <strong>{banner.text}</strong>
      {banner.sub && <span>{banner.sub}</span>}
    </div>
  );
}

/**
 * The overlay during a match: a card per fighter along the bottom with
 * the portrait, the ult ring, lives and a big percent that reddens and
 * shakes as it climbs; the Ready, Fight and Game calls; and a strip for
 * each KO and ult.
 */
export function Hud() {
  const fighters = useBrawlStore((s) => s.fighters);
  const call = useBrawlStore((s) => s.call);
  const stageName = useBrawlStore((s) => s.stageName);
  const phase = useBrawlStore((s) => s.phase);
  const waiting = useBrawlStore((s) => s.waiting);
  return (
    <div className="bb-hud">
      {phase === "countdown" && <p className="bb-hud__stage">{stageName}</p>}
      {call && (
        <div key={call} className={`bb-call bb-call--${call}`}>
          {CALLS[call]}
        </div>
      )}
      <Banner />
      <ol className="bb-cards">
        {fighters.map((f) => (
          <Card key={f.id} f={f} />
        ))}
      </ol>
      {waiting.length > 0 && phase !== "results" && <p className="bb-hud__waiting">{waiting.join(", ")} will join the next match</p>}
    </div>
  );
}
