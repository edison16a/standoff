"use client";
import { Icon } from "@/components/ui/Icon";
import { DIFFICULTIES } from "../../engine/bots/brain";
import { fighterColours } from "../../render/colors";
import { CHARACTERS } from "../../roster";
import { Portrait } from "../../ui/Portrait";
import { useBrawlStore, type SlotView } from "../host-store";
import { MAX_FIGHTERS } from "../lobby";
import { useSession } from "./session-context";

const LEVEL_NAMES = { easy: "Easy", normal: "Normal", hard: "Hard" } as const;

function SlotCard({ slot, colour, index }: { slot: SlotView; colour: string; index: number }) {
  if (slot.kind === "open") {
    return (
      <li className="bb-slot bb-slot--open">
        <span className="bb-slot__plus" aria-hidden="true">
          <Icon name="plus" size={30} />
        </span>
        <strong className="bb-slot__name">Open</strong>
        <span className="bb-slot__role">Scan to join</span>
      </li>
    );
  }
  const c = CHARACTERS[slot.character];
  return (
    <li className={`bb-slot bb-slot--${slot.kind}`} style={{ "--slot": colour, animationDelay: `${index * 60}ms` } as React.CSSProperties}>
      <Portrait character={slot.character} colour={colour} size={96} className="bb-slot__face" />
      <strong className="bb-slot__name">{slot.name}</strong>
      <span className="bb-slot__role">{slot.kind === "bot" ? "Computer" : c.name}</span>
    </li>
  );
}

/** How many computer fighters join, from none to as many as fit. */
function BotStepper() {
  const session = useSession();
  const bots = useBrawlStore((s) => s.bots);
  const players = useBrawlStore((s) => s.slots.filter((slot) => slot.kind === "player").length);
  const max = MAX_FIGHTERS - Math.max(1, players);
  // A player alone always gets one computer to fight.
  const floor = players === 1 ? 1 : 0;
  const shown = Math.max(floor, Math.min(bots, max));
  return (
    <div className="bb-option">
      <span className="bb-option__label">Computer fighters</span>
      <div className="bb-stepper">
        <button type="button" aria-label="Fewer computer fighters" disabled={shown <= floor} onClick={() => session.setBots(shown - 1)}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </button>
        <output aria-live="polite">{shown}</output>
        <button type="button" aria-label="More computer fighters" disabled={shown >= max} onClick={() => session.setBots(shown + 1)}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

function DifficultyPicker() {
  const session = useSession();
  const difficulty = useBrawlStore((s) => s.difficulty);
  return (
    <div className="bb-option">
      <span className="bb-option__label">Computer skill</span>
      <div className="bb-segments" role="group" aria-label="Computer skill">
        {DIFFICULTIES.map((level) => (
          <button key={level} type="button" aria-pressed={difficulty === level} onClick={() => session.setDifficulty(level)}>
            {LEVEL_NAMES[level]}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The lobby on the big screen: four places filled by players as they
 * get ready, then by computer fighters, how many and how good the host
 * chooses. The stage is picked at random when the match starts.
 */
export function Lobby() {
  const session = useSession();
  const slots = useBrawlStore((s) => s.slots);
  const seats = useBrawlStore((s) => s.seats);
  const canStart = useBrawlStore((s) => s.canStart);
  const choosing = seats.filter((s) => s.connected && !s.ready);
  const players = slots.filter((s) => s.kind === "player").length;
  // Colours as the match will give them: seat colours for players, spare ones for computers.
  const colours = fighterColours(slots.flatMap((s) => (s.kind === "open" ? [] : [{ seat: s.kind === "player" ? s.seat : null, character: s.character }])));
  let fighter = 0;
  const colourOf = (slot: SlotView) => (slot.kind === "open" ? "#64748b" : (colours[fighter++]?.colour ?? "#64748b"));
  const note =
    choosing.length > 0
      ? `Still choosing: ${choosing.map((s) => s.name).join(", ")}.`
      : players === 0
        ? "Scan the code with your phone to join. Up to four fighters."
        : "Everyone is ready. The stage is picked at random.";

  return (
    <div className="bb-lobby">
      <header className="bb-lobby__title">
        <h1 className="bb-logo">
          <span>Brawl</span> <b>Battle</b>
        </h1>
        <p>Two lives each. Knock everyone off the stage.</p>
      </header>
      <ol className="bb-slots" aria-label="Fighters">
        {slots.map((slot, i) => (
          <SlotCard key={slot.kind === "player" ? `p${slot.seat}` : `${slot.kind}${i}`} slot={slot} index={i} colour={colourOf(slot)} />
        ))}
      </ol>
      <footer className="bb-lobby__footer">
        <BotStepper />
        <DifficultyPicker />
        <p className="bb-lobby__note">{note}</p>
        <button type="button" className="btn btn--primary btn--lg bb-lobby__start" disabled={!canStart} onClick={() => session.start()}>
          <Icon name="play" />
          Start fight
        </button>
      </footer>
    </div>
  );
}
