import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { Server } from "node:net";
import type { Duplex } from "node:stream";
import next from "next";
import { loadCertificate } from "./certificates";
import { readConfig } from "./config";
import { findLanAddress } from "./network";
import { createSocketServer } from "./realtime/socket-server";
import { RoomRegistry } from "./rooms/room-registry";

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

  const app = next({ dev: config.dev, dir: process.cwd() });
  await app.prepare();
  const handleRequest = app.getRequestHandler();
  const handleNextUpgrade = app.getUpgradeHandler();

  const registry = new RoomRegistry((code) => `${phoneOrigin}/join/${code}`);
  const sockets = createSocketServer(registry);

  const onRequest = (req: IncomingMessage, res: ServerResponse) => {
    handleRequest(req, res).catch((error: unknown) => {
      console.error("Request failed", error);
      if (!res.headersSent) res.writeHead(500).end("Internal error");
    });
  };
  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (sockets.handleUpgrade(req, socket, head)) return;
    // Anything else is Next's own dev reload socket.
    handleNextUpgrade(req, socket, head).catch(() => socket.destroy());
  };

  const certificate = await loadCertificate(lanAddress);
  const httpServer = createHttpServer(onRequest).on("upgrade", onUpgrade);
  const httpsServer = createHttpsServer({ key: certificate.key, cert: certificate.cert }, onRequest).on(
    "upgrade",
    onUpgrade,
  );

  await Promise.all([
    listen(httpServer, config.httpPort, config.bindHost),
    listen(httpsServer, config.httpsPort, config.bindHost),
  ]);

  console.log(`\n  Standoff is running${config.dev ? " in development" : ""}.\n`);
  console.log(`  Open on this computer:  http://localhost:${config.httpPort}`);
  console.log(`  Phones join through:    ${phoneOrigin}`);
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
