import { createServer } from "node:http";
import { loadEnvConfig } from "@next/env";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { initializeMultiplayer } from "./server/multiplayer";
import type { ClientToServerEvents, ServerToClientEvents } from "./src/shared/multiplayer-types";

const production = process.argv.includes("--production") || process.env.NODE_ENV === "production";
loadEnvConfig(process.cwd(), !production);
const hostname = process.env.HOSTNAME_BIND || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

async function start() {
  const app = next({ dev: !production, hostname, port });
  await app.prepare();
  const handle = app.getRequestHandler();
  const httpServer = createServer((request, response) => handle(request, response).catch((error) => { console.error("Next.js request failed:", error); if (!response.headersSent) response.statusCode = 500; if (!response.writableEnded) response.end("Internal Server Error"); }));
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, { path: "/socket.io", maxHttpBufferSize: 10_000 });
  const multiplayer = initializeMultiplayer(io);
  let shuttingDown = false;
  const shutdown = () => { if (shuttingDown) return; shuttingDown = true; multiplayer.close(); io.close(); httpServer.close(() => process.exit(0)); setTimeout(() => process.exit(1), 10_000).unref(); };
  process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
  httpServer.listen(port, hostname, () => console.info(`Next.js + Socket.IO running at http://${hostname}:${port}`));
}
start().catch((error) => { console.error("Server startup failed:", error); process.exit(1); });
