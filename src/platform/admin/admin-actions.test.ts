import { describe, expect, it, vi } from "vitest";
import { adminActions, registerAdminActions, subscribeAdminActions } from "./admin-actions";

describe("admin actions", () => {
  it("lists registered actions until they are removed", () => {
    const run = vi.fn();
    const remove = registerAdminActions("soccer", [{ id: "free-kick", label: "Free kick", run }]);
    expect(adminActions().map((a) => a.id)).toEqual(["free-kick"]);
    adminActions()[0]?.run();
    expect(run).toHaveBeenCalledOnce();
    remove();
    expect(adminActions()).toEqual([]);
  });

  it("tells listeners about changes", () => {
    const listener = vi.fn();
    const stop = subscribeAdminActions(listener);
    const remove = registerAdminActions("basketball", []);
    remove();
    stop();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores a stale remove after the owner registered again", () => {
    const first = registerAdminActions("x", [{ id: "a", label: "A", run() {} }]);
    const second = registerAdminActions("x", [{ id: "b", label: "B", run() {} }]);
    first();
    expect(adminActions().map((a) => a.id)).toEqual(["b"]);
    second();
  });
});
