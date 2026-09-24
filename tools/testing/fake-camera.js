// Runs camera games with no camera and no pose model, for browser tests.
// Add it with Playwright's context.addInitScript before the page loads:
//
//   await context.addInitScript({ path: "tools/testing/fake-camera.js" });
//
// Every CameraKit made in development then starts in test mode: the camera
// shows as on at once, the model as ready, and each player stands still in
// their spot until the test moves them through window.__cameraKit:
//
//   await page.evaluate(() => window.__cameraKit.inject(1, { crouch: 0.6 }));        // hold a pose
//   await page.evaluate(() => window.__cameraKit.play(2, window.__cameraKit.timelines.jump()));
//   await page.evaluate(() => window.__cameraKit.calibrate());                        // skip calibration
//   await page.evaluate(() => window.__cameraKit.takeEvents());                       // what happened
//
// Adding ?camera=fake to the host page's address does the same by hand.
window.__cameraKitFake = true;
