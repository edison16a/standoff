import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { Server } from "node:net";
import type { Duplex } from "node:stream";
import next from "next";
import { loadCertificate } from "./certificates";
import { readConfig } from "./config";
import { findLanAddress } from "./network";
import { createBackend } from "../src/relay/create-backend";
import { setLocalPhoneOrigin } from "../src/relay/route-context";
import { createSocketServer } from "./realtime/socket-server";

/**
 * Boots Standoff. One Node process serves the Next pages and the game
 * socket on two listeners: plain HTTP for the computer on localhost and
 * HTTPS for phones on the LAN. Both share one room registry.
 */
async function main() {
  const config = readConfig();
  const lanAddress = findLanAddress();
  const phoneHost = config.publicHost ?? lanAddress ?? "localhost";
  const phoneOrigin = `https://${phoneHost}:${config.httpsPort}`;

  // Next's routes serve the HTTP fallback in this same process. They share
  // the backend (see createBackend) and need the phone address too.
  setLocalPhoneOrigin(phoneOrigin);
  const backend = await createBackend();
  const sockets = createSocketServer({
    backend,
    joinUrlFor: (code) => `${phoneOrigin}/join/${code}`,
    now: Date.now,
    // One process holds every socket, so memory is as shared as it gets.
    sharedRooms: true,
  }, config.socketLifetimeMs);
  const certificate = await loadCertificate(lanAddress);

  // Next hooks its own upgrade listener (the dev reload socket) onto the
  // server it is given. It gets this one, which never listens: we forward
  // it every upgrade that is not the game socket. Next must not see the
  // game socket, because /api/ws is also a route file (for Vercel) and Next
  // closes upgrades that match a route.
  const nextUpgrades = createHttpServer();
  const app = next({ dev: config.dev, dir: process.cwd(), httpServer: nextUpgrades });
  await app.prepare();
  const handleRequest = app.getRequestHandler();

  const onRequest = (req: IncomingMessage, res: ServerResponse) => {
    handleRequest(req, res).catch((error: unknown) => {
      console.error("Request failed", error);
      if (!res.headersSent) res.writeHead(500).end("Internal error");
    });
  };

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!sockets.handleUpgrade(req, socket, head)) nextUpgrades.emit("upgrade", req, socket, head);
  };
  const httpServer = createHttpServer(onRequest).on("upgrade", onUpgrade);
  const httpsServer = createHttpsServer({ key: certificate.key, cert: certificate.cert }, onRequest).on("upgrade", onUpgrade);

  await Promise.all([
    listen(httpServer, config.httpPort, config.bindHost),
    listen(httpsServer, config.httpsPort, config.bindHost),
  ]);

  console.log(`\n  Standoff is running${config.dev ? " in development" : ""}.\n`);
  console.log(`  Open on this computer:  http://localhost:${config.httpPort}`);
  console.log(`  Phones join through:    ${phoneOrigin}`);
  console.log(`  Rooms are kept in:      ${backend.label}`);
  if (config.socketLifetimeMs) console.log(`  Sockets are cut after:  ${config.socketLifetimeMs / 1000} s, like Vercel`);
  if (!lanAddress && !config.publicHost) {
    console.log("\n  No network address found. Connect to WiFi so phones can reach this machine.");
  }
  if (certificate.selfSigned) {
    console.log("\n  Phones will warn about the certificate once. That is expected on a local network.");
  }
  console.log("");

  const shutdown = () => {
    sockets.close();
    httpServer.close();
    httpsServer.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

function listen(server: Server, port: number, host: string) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
