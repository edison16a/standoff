"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadWithRetry } from "@/platform/games/load-with-retry";
import { useHostStore } from "@/platform/host/host-store";
import { post, receive, type PanelMessage } from "../bridge";
import { KeyboardSeat } from "../keyboard-seat";
import { setKeyboardRoom, useKeyboardUi } from "../keyboard-store";
import type { KeyboardBinding } from "../types";
import { ControlsCard } from "./ControlsCard";
import { PhonePanel } from "./PhonePanel";
import { useStageInput } from "./use-stage-input";
import "../keyboard.css";

/** The game's binding, or null for a game without one. Undefined while loading. */
type Loaded = { binding: KeyboardBinding | null } | undefined;

/**
 * The keyboard player on the host page, while it is on for this room: the
 * phone panel, the controls card, and the keys and mouse feeding the
 * game's binding. A remade lobby gets a new code, and the player follows.
 */
export function KeyboardDock() {
  const room = useHostStore((state) => state.room);
  const kbRoom = useKeyboardUi((state) => state.room);
  const code = room?.code ?? null;
  const game = room?.game ?? null;
  const previous = useRef({ code, game });

  useEffect(() => {
    const before = previous.current;
    previous.current = { code, game };
    if (code && before.code && before.code !== code && before.game === game && kbRoom === before.code) setKeyboardRoom(code);
  }, [code, game, kbRoom]);

  if (!code || !game || kbRoom !== code) return null;
  return <Dock key={code} code={code} game={game} />;
}

function Dock({ code, game }: { code: string; game: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState<Loaded>(undefined);
  const [seat, setSeat] = useState<KeyboardSeat | null>(null);
  const toggleCard = useCallback(() => useKeyboardUi.setState((ui) => ({ cardHidden: !ui.cardHidden })), []);

  useEffect(() => {
    let alive = true;
    loadWithRetry(game)
      .then((mod) => alive && setLoaded({ binding: mod.keyboard ?? null }))
      .catch(() => alive && setLoaded({ binding: null }));
    return () => {
      alive = false;
    };
  }, [game]);

  // One seat per panel. The binding starts once the panel says which seat it took.
  useEffect(() => {
    if (!loaded) return;
    const made = new KeyboardSeat(
      loaded.binding ?? undefined,
      (message) => post(frame.current?.contentWindow, message),
      (phone) => useKeyboardUi.setState({ phone }),
    );
    const onMessage = (event: MessageEvent) => {
      const message = receive<PanelMessage>(event, frame.current?.contentWindow);
      if (!message) return;
      if (message.type === "key" && message.input.code === "Escape") {
        if (message.input.down && !message.input.repeat) toggleCard();
        return;
      }
      if (message.type === "blur") setTimeout(() => !document.hasFocus() && made.release(), 0);
      made.fromPanel(message);
    };
    window.addEventListener("message", onMessage);
    setSeat(made);
    return () => {
      window.removeEventListener("message", onMessage);
      made.dispose();
      setSeat(null);
    };
  }, [loaded, toggleCard]);

  useStageInput(seat, toggleCard);
  if (!loaded) return null;
  return (
    <>
      <PhonePanel ref={frame} code={code} />
      <ControlsCard binding={loaded.binding} />
    </>
  );
}
