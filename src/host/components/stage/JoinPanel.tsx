"use client";
import { toString as qrToSvg } from "qrcode";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SLOTS } from "@/shared/players";
import { useHostStore } from "../../host-store";
import { useSession } from "../session-context";

/**
 * The QR code phones scan. Big in the middle while the strip is empty,
 * tucked into a corner once one player is in, gone once both are. The code
 * is always dark on white, whatever the theme, because plenty of phone
 * cameras cannot read it inverted. While one person waits, it offers the
 * computer as an opponent, and a friend who scans still takes its place.
 */
export function JoinPanel() {
  const session = useSession();
  const room = useHostStore((state) => state.room);
  const seats = useHostStore((state) => state.seats);
  const inMatch = useHostStore((state) => state.hud !== null);
  const [svg, setSvg] = useState("");
  const people = SLOTS.filter((slot) => seats[slot].connected && !seats[slot].computer).length;
  const computer = seats[1].computer || seats[2].computer;
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

  if (!room || inMatch || people === 2) return null;
  return (
    <div className={`join ${people === 0 ? "join--center" : "join--corner"}`}>
      <div className="join__qr" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
      <span className="join__code mono">{room.code}</span>
      {people === 1 && (
        <button type="button" className="join__solo" onClick={() => session.setSolo(!computer)}>
          <Icon name={computer ? "close" : "cpu"} />
          {computer ? "No computer" : "Play solo"}
        </button>
      )}
    </div>
  );
}
