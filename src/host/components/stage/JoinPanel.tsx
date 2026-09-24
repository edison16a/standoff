"use client";
import { toString as qrToSvg } from "qrcode";
import { useEffect, useState } from "react";
import { useHostStore } from "../../host-store";

/**
 * The QR code phones scan. Big in the middle while the strip is empty,
 * tucked into a corner once one player is in, gone once both are. The code
 * is always dark on white, whatever the theme, because plenty of phone
 * cameras cannot read it inverted.
 */
export function JoinPanel() {
  const room = useHostStore((state) => state.room);
  const seats = useHostStore((state) => state.seats);
  const inMatch = useHostStore((state) => state.hud !== null);
  const [svg, setSvg] = useState("");
  const joined = Number(seats[1].connected) + Number(seats[2].connected);
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

  if (!room || inMatch || joined === 2) return null;
  return (
    <div className={`join ${joined === 0 ? "join--center" : "join--corner"}`}>
      <div className="join__qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="join__code mono">{room.code}</span>
    </div>
  );
}
