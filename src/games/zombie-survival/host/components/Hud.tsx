"use client";
import { useSurvivalStore } from "../host-store";

/**
 * The strip across the top during a run: stage and goal, team health,
 * zombies left, and a boss's weak points as a row of lights that go out
 * one by one.
 */
export function Hud() {
  const hud = useSurvivalStore((s) => s.hud);
  const share = hud.health / hud.maxHealth;
  return (
    <div className="zs-hud">
      <div className="zs-hud__stage">
        <span className="zs-hud__count">
          Stage {hud.stage} <em>of 25</em>
        </span>
        <strong>{hud.stageTitle}</strong>
        <span className="zs-hud__goal">{hud.objective}</span>
      </div>
      <div className={`zs-hud__health ${share < 0.35 ? "zs-hud__health--low" : ""}`}>
        <span className="zs-hud__label">Team health</span>
        <div className="zs-bar">
          <span className="zs-bar__fill" style={{ width: `${Math.max(0, share * 100)}%` }} />
        </div>
        <span className="zs-hud__value">{hud.health}</span>
      </div>
      {hud.remaining !== null && (
        <div className="zs-hud__left">
          <strong>{hud.remaining}</strong>
          <span>{hud.remaining === 1 ? "zombie left" : "zombies left"}</span>
        </div>
      )}
      {hud.boss && (
        <div className="zs-boss">
          <strong>{hud.boss.name}</strong>
          <div className="zs-boss__points" aria-label={`${hud.boss.left} of ${hud.boss.total} weak points left`}>
            {Array.from({ length: hud.boss.total }, (_, i) => (
              <i key={i} className={i < hud.boss!.left ? "zs-boss__point zs-boss__point--on" : "zs-boss__point"} />
            ))}
          </div>
          <span>Weak points glow on its joints. Aim together.</span>
        </div>
      )}
    </div>
  );
}
