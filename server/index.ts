import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import type { Server } from "node:net";
import type { Duplex } from "node:stream";
import next from "next";
import { loadCertificate } from "./certificates";
import { readConfig } from "./config";
import { findLanAddress } from "./network";
import { createBackend } from "../src/relay/create-backend";
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

  const backend = await createBackend();
  const sockets = createSocketServer({
    backend,
    joinUrlFor: (code) => `${phoneOrigin}/join/${code}`,
    now: Date.now,
    // One process holds every socket, so memory is as shared as it gets.
    sharedRooms: true,
    deadline: null,
  });
  const certificate = await loadCertificate(lanAddress);

  const httpServer = createHttpServer();
  // Next hooks its own dev reload socket onto this server. Handing it the
  // server up front means that hook lands here, whichever listener sees
  // the first request.
  const app = next({ dev: config.dev, dir: process.cwd(), httpServer });
  await app.prepare();
  const handleRequest = app.getRequestHandler();

  const onRequest = (req: IncomingMessage, res: ServerResponse) => {
    handleRequest(req, res).catch((error: unknown) => {
      console.error("Request failed", error);
      if (!res.headersSent) res.writeHead(500).end("Internal error");
    });
  };

  httpServer.on("request", onRequest);
  // On plain HTTP we only take the game socket. Next's listener takes the rest.
  httpServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    sockets.handleUpgrade(req, socket, head);
  });

  const httpsServer = createHttpsServer({ key: certificate.key, cert: certificate.cert }, onRequest);
  // Phones reach the game socket here. Anything else (Next's reload socket
  // in development) is passed to the HTTP server, where Next is listening.
  httpsServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (!sockets.handleUpgrade(req, socket, head)) httpServer.emit("upgrade", req, socket, head);
  });

  await Promise.all([
    listen(httpServer, config.httpPort, config.bindHost),
    listen(httpsServer, config.httpsPort, config.bindHost),
  ]);

  console.log(`\n  Standoff is running${config.dev ? " in development" : ""}.\n`);
  console.log(`  Open on this computer:  http://localhost:${config.httpPort}`);
  console.log(`  Phones join through:    ${phoneOrigin}`);
  console.log(`  Rooms are kept in:      ${backend.label}`);
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
