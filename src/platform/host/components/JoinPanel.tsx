"use client";
import { toString as qrToSvg } from "qrcode";
import { useEffect, useState, type ComponentType } from "react";
import type { HostGame } from "@/platform/games/game-api";
import { useHostStore } from "../host-store";

/**
 * The QR code phones scan, the same for every game. Big in the middle
 * until someone joins, then tucked into the bottom left until the game
 * starts or every seat is taken. The code is always dark on white,
 * whatever the theme, because plenty of phone cameras cannot read it
 * inverted. A game can add a control under it, like fencing's Play solo,
 * keep it in the corner from the start, or hide it when phones are not used.
 */
export function JoinPanel({ title, Extra, placement = "center" }: { title: string; Extra?: ComponentType; placement?: HostGame["join"] }) {
  const room = useHostStore((state) => state.room);
  const players = useHostStore((state) => state.players);
  const playing = useHostStore((state) => state.playing);
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
  return (
    <div className={`join ${center ? "join--center" : "join--corner"}`}>
      {center && (
        <div className="join__head">
          <span className="join__label">Scan to play</span>
          <strong className="join__title">{title}</strong>
        </div>
      )}
      <div className="join__qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="join__code mono">{room.code}</span>
      {!center && Extra && <Extra />}
    </div>
  );
}
