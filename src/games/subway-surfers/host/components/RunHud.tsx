"use client";
import { playerColor } from "@/games/kit/players";
import { POWER_NAMES } from "../../engine/powers";
import { STEP_TEXT, TUTORIAL_STEPS } from "../../engine/tutorial";
import { POWER_COLORS } from "../../render/models/pickups";
import { useSurfStore, type RunnerHud } from "../store";
import { CoinIcon, PowerIcon } from "./icons";
import { useSession } from "./session-context";

const CRASH_TEXT = { caught: "Caught by the guard!", train: "Crashed into a train!", low: "Tripped on a barrier!", high: "Hit a barrier!", ramp: "Crashed!" } as const;

/** The overlay on each player's half: score, coins, power up timers, shouts and the tutorial. */
export function RunHud() {
  const hud = useSurfStore((s) => s.hud);
  const phase = useSurfStore((s) => s.phase);
  const countdown = useSurfStore((s) => s.countdown);
  const session = useSession();
  return (
    <div className={`ss-hud ss-hud--${hud.length}`}>
      {hud.map((h) => (
        <section key={h.slot} className="ss-view" style={{ ["--pc" as string]: playerColor(h.slot) }} aria-label={h.name}>
          {phase === "tutorial" ? <TutorialPanel h={h} /> : <Scoreboard h={h} />}
          {h.banner && (
            <div key={h.banner.id} className="ss-banner">
              {h.banner.text}
            </div>
          )}
          {h.away && <div className="ss-away">{hud.length > 1 ? `${h.name}, step back into view` : "Step back into view"}</div>}
          {!h.away && h.resume !== null && <div className="ss-away ss-away--ready">Get ready {h.resume}</div>}
          {h.crashed && phase === "running" && (
            <div className="ss-crashed">
              <strong>{CRASH_TEXT[h.crashed]}</strong>
              <span>{h.score.toLocaleString()} points</span>
            </div>
          )}
        </section>
      ))}
      {countdown !== null && (
        <div key={countdown} className={`ss-count${countdown === 0 ? " ss-count--go" : ""}`}>
          {countdown === 0 ? "GO!" : countdown}
        </div>
      )}
      {phase === "tutorial" && (
        <button type="button" className="ss-button ss-button--quiet ss-skip" onClick={() => session.skipTutorial()}>
          Skip
        </button>
      )}
    </div>
  );
}

function Scoreboard({ h }: { h: RunnerHud }) {
  return (
    <>
      <div className="ss-tag">{h.name}</div>
      <div className="ss-score">
        <span className="ss-score__value">{h.score.toLocaleString()}</span>
        <span className={`ss-mult${h.multiplier > 1 ? " ss-mult--hot" : ""}`}>x{h.multiplier}</span>
      </div>
      <div className="ss-coins">
        <CoinIcon />
        <span>{h.coins}</span>
      </div>
      <div className="ss-powers">
        {h.powers.map((p) => (
          <div key={p.kind} className="ss-power" style={{ ["--power" as string]: `#${POWER_COLORS[p.kind].toString(16).padStart(6, "0")}`, ["--left" as string]: p.share }} title={POWER_NAMES[p.kind]}>
            <PowerIcon kind={p.kind} />
          </div>
        ))}
      </div>
    </>
  );
}

function TutorialPanel({ h }: { h: RunnerHud }) {
  const step = TUTORIAL_STEPS[h.tutorial];
  return (
    <div className="ss-tut">
      <div className="ss-tag">{h.name}</div>
      <h2 className="ss-tut__title">{step ? STEP_TEXT[step].title : "Ready!"}</h2>
      <p className="ss-tut__hint">{step ? STEP_TEXT[step].hint : "Waiting for everyone"}</p>
      <ol className="ss-tut__list">
        {TUTORIAL_STEPS.map((s, i) => (
          <li key={s} className={i < h.tutorial ? "ss-tut__done" : i === h.tutorial ? "ss-tut__now" : ""}>
            {STEP_TEXT[s].title}
          </li>
        ))}
      </ol>
    </div>
  );
}
