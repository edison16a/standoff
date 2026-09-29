"use client";
import { toString as qrToSvg } from "qrcode";
import { useEffect, useState, type ComponentType } from "react";
import { Spinner } from "@/components/ui/Loader";
import type { HostGame } from "@/platform/games/game-api";
import { useHostStore, type RoomHealth } from "../host-store";
import { RegenerateButton } from "./RegenerateButton";

/** While the room is unproven or broken, nothing on screen can be scanned. */
const TILE: Partial<Record<RoomHealth, string>> = {
  checking: "Checking the room",
  fixing: "Making a new room",
  lost: "This room is not working",
};

/**
 * The QR code phones scan, the same for every game. Big in the middle
 * until someone joins, then tucked into the bottom left until the game
 * starts or every seat is taken. The code is always dark on white,
 * whatever the theme, because plenty of phone cameras cannot read it
 * inverted. It only shows once the room has passed a check, so nobody
 * scans a dead code, and Regenerate room sits right under it. A game can
 * add a control under that, like Blade Clash's Play solo, keep the card in
 * the corner from the start, or hide it when phones are not used.
 */
export function JoinPanel({ title, Extra, placement = "center" }: { title: string; Extra?: ComponentType; placement?: HostGame["join"] }) {
  const room = useHostStore((state) => state.room);
  const players = useHostStore((state) => state.players);
  const playing = useHostStore((state) => state.playing);
  const health = useHostStore((state) => state.health);
  const [svg, setSvg] = useState("");
  const joined = players.filter((player) => player.connected).length;
  const url = room?.joinUrl ?? "";

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    qrToSvg(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111214", light: "#ffffff" } })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!room || playing || joined >= room.seats || placement === "hidden") return null;
  const center = joined === 0 && placement !== "corner";
  const tile = TILE[health];
  return (
    <div className={`join ${center ? "join--center" : "join--corner"}`}>
      {center && (
        <div className="join__head">
          <span className="join__label">Scan to play</span>
          <strong className="join__title">{title}</strong>
        </div>
      )}
      {tile ? (
        <div className="join__check" role="status">
          {health !== "lost" && <Spinner />}
          <span className="join__check-text">{tile}</span>
        </div>
      ) : (
        <>
          <div className="join__qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <span className="join__code mono">{room.code}</span>
        </>
      )}
      <RegenerateButton />
      {!center && Extra && <Extra />}
    </div>
  );
}
