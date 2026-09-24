"use client";
import { ITEM_NAMES } from "../../engine/items";
import type { ViewRect } from "../../render/layout";
import { CubeGlyph, ItemIcon } from "../../ui/icons";
import { Roulette } from "../../ui/Roulette";
import { ordinal } from "../../ui/format";
import type { ViewHud as Hud } from "../host-store";

/**
 * The overlay on one player's view: their name tag, place and lap in the
 * corners, the held power up, and big messages in the middle: the
 * countdown, wrong way, final lap and the finish.
 */
export function ViewHud({ hud, rect, countdown, laps }: { hud: Hud; rect: ViewRect; countdown: number | null; laps: number }) {
  const style = { left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.w * 100}%`, height: `${rect.h * 100}%`, "--player": hud.color } as React.CSSProperties;
  return (
    <div className="mk-view" style={style}>
      <div className="mk-view__tag">
        <span className="mk-view__dot" />
        {hud.name}
        {hud.away && <span className="mk-view__away">computer driving</span>}
      </div>
      <div className="mk-view__place">
        <strong>{ordinal(hud.place)}</strong>
      </div>
      <div className="mk-view__lap">
        Lap <strong>{hud.lap}</strong>/{laps}
      </div>
      <div
        key={hud.item ?? "empty"}
        className={`mk-view__item ${hud.item ? "mk-view__item--full" : ""} ${hud.rolling ? "mk-view__item--rolling" : ""}`}
        title={hud.item ? ITEM_NAMES[hud.item] : "No power up"}
      >
        {hud.item ? hud.rolling ? <Roulette /> : <ItemIcon item={hud.item} /> : <CubeGlyph />}
        {hud.item && !hud.rolling && <span className="mk-view__item-name">{ITEM_NAMES[hud.item]}</span>}
      </div>
      {countdown !== null && (
        <div key={countdown} className={`mk-view__count ${countdown === 0 ? "mk-view__count--go" : ""}`}>
          {countdown === 0 ? "GO!" : countdown}
        </div>
      )}
      {hud.wrongWay && !hud.finished && <div className="mk-view__warn">Wrong way</div>}
      {hud.banner && !hud.wrongWay && <div key={hud.banner} className={`mk-view__banner ${hud.finished ? "mk-view__banner--finish" : ""}`}>{hud.banner}</div>}
    </div>
  );
}
