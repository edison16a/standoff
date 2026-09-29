"use client";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { adminActions, subscribeAdminActions } from "./admin-actions";
import { meterVisible, setMeterVisible, subscribeMeter } from "./frame-meter";
import "./admin.css";

const NO_ACTIONS: readonly never[] = [];

/**
 * The hidden testing panel. Game shortcuts come first, whatever the running
 * game has registered, then a few tools that work on every screen.
 */
export function AdminPanel() {
  const actions = useSyncExternalStore(subscribeAdminActions, adminActions, () => NO_ACTIONS);
  const meterOn = useSyncExternalStore(subscribeMeter, meterVisible, () => false);

  return (
    <>
      <p className="settings__title">
        <Icon name="cpu" />
        Admin
      </p>
      <div className="admin__group" aria-label="Game shortcuts">
        <span className="admin__heading">Game</span>
        {actions.length === 0 ? (
          <p className="admin__empty">Start a match to see its shortcuts.</p>
        ) : (
          <div className="admin__grid">
            {actions.map((action) => (
              <button key={action.id} type="button" className="admin__action" onClick={() => action.run()}>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="admin__group" aria-label="Platform tools">
        <span className="admin__heading">Platform</span>
        <div className="admin__grid">
          <button
            type="button"
            className={`admin__action ${meterOn ? "admin__action--on" : ""}`}
            aria-pressed={meterOn}
            onClick={() => setMeterVisible(!meterOn)}
          >
            Frame rate
          </button>
          <button type="button" className="admin__action" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    </>
  );
}
