"use client";
import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { ROOM_CODE_LENGTH } from "@/platform/protocol";
import { roomCodeFrom } from "../join-code";
import { canScanQr } from "../qr-detect";
import { QrScanner } from "./QrScanner";

/**
 * The way into a game from a phone: type the four letter code under the
 * host's QR code, or scan the code with this phone's camera where the
 * browser can read QR codes. Used by the join screen and after a game ends.
 */
export function JoinForm({ onCode }: { onCode(code: string): void }) {
  const [typed, setTyped] = useState("");
  const [scanning, setScanning] = useState(false);
  const [canScan, setCanScan] = useState(false);
  const code = roomCodeFrom(typed);

  useEffect(() => {
    let alive = true;
    void canScanQr().then((yes) => alive && setCanScan(yes));
    return () => {
      alive = false;
    };
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (code) onCode(code);
  };

  return (
    <form className="join-form" onSubmit={submit}>
      <label className="name-field">
        <span className="name-field__label">Room code</span>
        <input
          className="name-field__input join-form__code mono"
          value={typed}
          onChange={(event) => setTyped(event.target.value.toUpperCase())}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="ABCD"
        />
      </label>
      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={!code}>
        Join
      </button>
      {canScan && (
        <button type="button" className="btn btn--lg btn--block" onClick={() => setScanning(true)}>
          <Icon name="scan" />
          Scan QR code
        </button>
      )}
      {scanning && (
        <QrScanner
          onCode={(scanned) => {
            setScanning(false);
            onCode(scanned);
          }}
          onClose={() => setScanning(false)}
        />
      )}
    </form>
  );
}
