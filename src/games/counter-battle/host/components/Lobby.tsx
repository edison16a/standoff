"use client";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { SplitMap } from "@/games/kit/split/SplitMap";
import type { Difficulty, TeamId } from "../../engine/fighter";
import { GUNS } from "../../engine/guns";
import { MODES } from "../../protocol";
import { TEAMS } from "../../teams";
import { GunIcon } from "../../ui/GunIcon";
import { useCounterStore, type SpotView } from "../host-store";
import { useSession } from "./session-context";

const LEVELS: { id: Difficulty; name: string }[] = [
  { id: "easy", name: "Easy" },
  { id: "normal", name: "Normal" },
  { id: "hard", name: "Hard" },
];
const MODE_NAMES = { "1v1": "1 v 1", "2v2": "2 v 2" } as const;

function SpotCard({ spot, level, onMove }: { spot: SpotView; level: string; onMove(seat: number): void }) {
  const style = { "--player": spot.colour } as CSSProperties;
  const body = (
    <>
      <span className="cb-spot__dot" aria-hidden="true" />
      <strong className="cb-spot__name">{spot.name}</strong>
      {spot.seat !== null && <span className={`cb-spot__ready ${spot.ready ? "cb-spot__ready--on" : ""}`}>{spot.ready ? "Ready" : "Setting up"}</span>}
      <span className="cb-spot__role">
        {spot.gun && <GunIcon gun={spot.gun} size={40} className="cb-spot__gun" />}
        {spot.seat === null ? `Computer, ${level}` : spot.gun ? GUNS[spot.gun].name : "Picking a gun"}
      </span>
    </>
  );
  if (spot.seat === null) return <li className="cb-spot cb-spot--bot">{body}</li>;
  return (
    <li className="cb-spot" style={style}>
      <button type="button" className="cb-spot__button" aria-label={`Move ${spot.name} to the other team`} onClick={() => onMove(spot.seat!)}>
        {body}
      </button>
    </li>
  );
}

function TeamColumn({ team, spots, level, onMove }: { team: TeamId; spots: SpotView[]; level: string; onMove(seat: number): void }) {
  const t = TEAMS[team];
  return (
    <section className="cb-team" style={{ "--team": t.color, "--team-dark": t.dark } as CSSProperties} aria-label={`${t.name} team`}>
      <h2 className="cb-team__name">{t.name}</h2>
      <ul className="cb-team__spots">
        {spots.map((spot, i) => (
          <SpotCard key={spot.seat ?? `bot-${i}`} spot={spot} level={level} onMove={onMove} />
        ))}
      </ul>
    </section>
  );
}

function Segments<T extends string>({ label, options, value, onPick }: { label: string; options: { id: T; name: string }[]; value: T; onPick(id: T): void }) {
  return (
    <div className="cb-option">
      <span className="cb-option__label">{label}</span>
      <div className="cb-segments" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onPick(o.id)}>
            {o.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The lobby on the big screen: the two teams with everyone placed and
 * computer players in the empty places, the split screen as it will be,
 * so each player can find their own view to calibrate in, and the host's
 * choices: one against one or two against two, and how good the
 * computer players are.
 */
export function Lobby() {
  const session = useSession();
  const { spots, mode, difficulty, split, bench, choosing, canStart } = useCounterStore();
  const level = LEVELS.find((l) => l.id === difficulty)?.name ?? "Normal";
  const humans = spots.filter((s) => s.seat !== null).length;
  const move = (seat: number) => {
    const spot = spots.find((s) => s.seat === seat);
    if (spot) session.setTeam(seat, spot.team === 0 ? 1 : 0);
  };
  const note =
    humans === 0
      ? "Scan the code to join. Your phone is your gun."
      : choosing.length > 0
        ? `Setting up: ${choosing.join(", ")}. Anyone not ready sits the match out.`
        : "Everyone is ready. Click a player to switch sides.";

  return (
    <div className="cb-lobby">
      <header className="cb-lobby__title">
        <h1 className="cb-logo">
          Counter <b>Battle</b>
        </h1>
        <p>Your fighter runs the bunkers. You aim and shoot. First to five rounds.</p>
      </header>
      <div className="cb-lobby__middle">
        <TeamColumn team={0} spots={spots.filter((s) => s.team === 0)} level={level} onMove={move} />
        <span className="cb-lobby__vs">VS</span>
        <TeamColumn team={1} spots={spots.filter((s) => s.team === 1)} level={level} onMove={move} />
        {split.length > 1 && (
          <aside className="cb-lobby__views" aria-label="Views on the big screen">
            <span className="cb-option__label">Your views</span>
            <SplitMap panes={split} />
          </aside>
        )}
      </div>
      <footer className="cb-lobby__footer">
        <Segments label="Match" options={MODES.map((id) => ({ id, name: MODE_NAMES[id] }))} value={mode} onPick={(m) => session.setMode(m)} />
        <Segments label="Computer skill" options={LEVELS} value={difficulty} onPick={(d) => session.setDifficulty(d)} />
        <p className="cb-lobby__note">
          {note}
          {bench.length > 0 && <span className="cb-lobby__bench"> Waiting for a place: {bench.join(", ")}.{mode === "1v1" ? " Pick 2 v 2 to let them in." : ""}</span>}
        </p>
        {mode === "2v2" && humans > 1 && (
          <button type="button" className="btn btn--lg cb-lobby__shuffle" onClick={() => session.shuffle()}>
            <Icon name="refresh" />
            Shuffle
          </button>
        )}
        <button type="button" className="btn btn--primary btn--lg cb-lobby__start" disabled={!canStart} onClick={() => session.start()}>
          <Icon name="play" />
          Start match
        </button>
      </footer>
    </div>
  );
}
