// A stand in for a real phone's motion sensors, for browser tests.
// Add it with Playwright's context.addInitScript before the page loads.
// It fires deviceorientation and devicemotion at 60 Hz from whatever the
// test puts in window.__sensors, so a test can "point" or "tilt" a phone:
//
//   await page.evaluate(() => Object.assign(window.__sensors, { alpha: -20, beta: 8, gamma: 0 }));
//
// alpha is the compass turn (turning right lowers it), beta tips the top
// edge up, gamma rolls the right edge down. window.__push(a, ms) queues a
// vertical acceleration in m/s² for fencing's jabs and parries.
(() => {
  // Some browsers and test contexts lack the event constructors, so plain events stand in.
  const make = (type, init) => {
    const Ctor = type === "deviceorientation" ? window.DeviceOrientationEvent : window.DeviceMotionEvent;
    if (typeof Ctor === "function") return new Ctor(type, init);
    return Object.assign(new Event(type), init);
  };
  const state = { alpha: 0, beta: 0, gamma: 0, queue: [] };
  window.__sensors = state;
  window.__push = (a, ms) => {
    for (let t = 0; t < ms; t += 16) state.queue.push(a);
  };
  window.__jab = () => state.queue.push(0, 10, 26, 32, 14, -16, -24, -10, 0);
  window.__parry = () => state.queue.push(0, -10, -24, -28, -8, 6, 0);
  setInterval(() => {
    window.dispatchEvent(
      make("deviceorientation", { alpha: state.alpha, beta: state.beta, gamma: state.gamma, absolute: false }),
    );
    const a = state.queue.length ? state.queue.shift() : (Math.random() - 0.5) * 0.04;
    window.dispatchEvent(
      make("devicemotion", {
        acceleration: { x: 0, y: 0, z: -a },
        accelerationIncludingGravity: { x: 0, y: 0, z: 9.81 - a },
        rotationRate: { alpha: 0, beta: 0, gamma: 0 },
        interval: 16,
      }),
    );
  }, 16);
})();
