"use client";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { adminActions, subscribeAdminActions } from "./admin-actions";
import { fpsMeterShown, setFpsMeterShown, subscribeFpsMeter } from "./fps-meter";
import "./admin.css";

const NONE: readonly never[] = [];

/**
 * The hidden admin panel, for testing on the big screen. It lists the
 * shortcuts the running game has registered, such as a free kick or a
 * skip to the results, and a few tools for the whole platform.
 */
export function AdminPanel() {
  const actions = useSyncExternalStore(subscribeAdminActions, adminActions, () => NONE);
  const fps = useSyncExternalStore(subscribeFpsMeter, fpsMeterShown, () => false);

  return (
    <>
      <p className="settings__title">
        <Icon name="cpu" />
        Admin
      </p>
      <section className="admin__group" aria-label="Game shortcuts">
        <span className="admin__heading">This game</span>
        {actions.length === 0 ? (
          <p className="admin__empty">No shortcuts right now. Games add them while a match runs.</p>
        ) : (
          <div className="admin__actions">
            {actions.map((action) => (
              <button key={action.id} type="button" className="admin__action" onClick={() => action.run()}>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </section>
      <section className="admin__group" aria-label="Platform tools">
        <span className="admin__heading">Platform</span>
        <label className="admin__switch">
          <span>Show frame rate</span>
          <input type="checkbox" role="switch" checked={fps} onChange={(event) => setFpsMeterShown(event.target.checked)} />
        </label>
        <button type="button" className="admin__action" onClick={() => window.location.reload()}>
          <Icon name="refresh" />
          Reload the page
        </button>
      </section>
    </>
  );
}
