"use client";
import { toString as qrToSvg } from "qrcode";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";

/**
 * The QR code phones scan, with the address and room code under it for
 * anyone who would rather type. The code is always dark on white, whatever
 * the theme, because plenty of phone cameras cannot read it inverted.
 */
export function JoinQr({ url, code }: { url: string; code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    qrToSvg(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#111214", light: "#ffffff" } })
      .then((markup) => !cancelled && setSvg(markup))
      .catch(() => !cancelled && setSvg(null));
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be refused. The address is on screen anyway.
    }
  };

  return (
    <div className="join">
      <div className="join__qr" aria-label={`QR code for ${url}`} role="img" dangerouslySetInnerHTML={{ __html: svg ?? "" }} />
      <div className="join__code">
        <span className="label">Room</span>
        <span className="join__code-value mono">{code}</span>
      </div>
      <div className="join__url">
        <span className="mono">{url}</span>
        <IconButton icon={copied ? "check" : "copy"} label={copied ? "Copied" : "Copy join link"} onClick={copy} />
      </div>
    </div>
  );
}
