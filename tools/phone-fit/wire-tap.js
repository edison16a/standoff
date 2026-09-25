// A tap on the phone's line to the host, for browser tests. Add it with
// Playwright's context.addInitScript before the page loads. It keeps the
// last message of each kind the host sent, and lets a test hold the real
// ones back and hand the phone its own instead, to reach pages like a
// game over screen without playing a whole game:
//
//   window.__wire.hold = true;
//   window.__wire.inject({ ...window.__wire.last.state, phase: "down" });
(() => {
  const handlers = new Set();
  const wire = { hold: false, last: {}, inject: (payload) => deliver({ type: "host:message", payload }) };
  window.__wire = wire;

  function deliver(envelope) {
    const event = new MessageEvent("message", { data: JSON.stringify(envelope) });
    for (const handler of handlers) handler(event);
  }

  // Keeps what the host said, and drops it while the test holds the line.
  function filter(data) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      return true;
    }
    const all = Array.isArray(parsed) ? parsed : [parsed];
    for (const envelope of all) {
      if (envelope?.type === "host:message" && envelope.payload?.kind) wire.last[envelope.payload.kind] = envelope.payload;
    }
    return !(wire.hold && all.every((envelope) => envelope?.type === "host:message"));
  }

  // The WebSocket and the HTTP stream both hand frames over through onmessage.
  for (const Type of [window.WebSocket, window.EventSource]) {
    const own = Object.getOwnPropertyDescriptor(Type.prototype, "onmessage");
    if (!own?.set) continue;
    Object.defineProperty(Type.prototype, "onmessage", {
      configurable: true,
      get() {
        return own.get.call(this);
      },
      set(handler) {
        if (typeof handler !== "function") return own.set.call(this, handler);
        // Arrow functions keep this socket as their this.
        handlers.add((event) => handler.call(this, event));
        own.set.call(this, (event) => filter(event.data) && handler.call(this, event));
      },
    });
  }
})();
