// pages/api/ws.ts
// This is the working WebSocket server. Next.js App Router doesn't natively
// support WebSocket upgrades, so we use the pages/ API route with a custom
// server setup. For Vercel deployment, Vercel's serverless functions don't
// support persistent WebSockets — we use a polling fallback + localStorage
// for single-player, and this works for local dev / Railway / Render.

import type { NextApiRequest, NextApiResponse } from "next";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Duplex } from "stream";

export const config = { api: { bodyParser: false } };

interface Player {
  id: string;
  name: string;
  ready: boolean;
  ws: WebSocket;
}

declare global {
  // eslint-disable-next-line no-var
  var _wss: WebSocketServer | undefined;
  // eslint-disable-next-line no-var
  var _players: Map<string, Player> | undefined;
}

function getStore() {
  if (!global._players) global._players = new Map<string, Player>();
  return global._players;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function publicList(players: Map<string, Player>) {
  return Array.from(players.values()).map(({ id, name, ready }) => ({ id, name, ready }));
}

function broadcastAll(players: Map<string, Player>, msg: object) {
  const data = JSON.stringify(msg);
  players.forEach((p) => {
    if (p.ws.readyState === WebSocket.OPEN) {
      try { p.ws.send(data); } catch (_) { /* ignore */ }
    }
  });
}

function checkStart(players: Map<string, Player>) {
  if (players.size < 1) return;
  const all = Array.from(players.values());
  if (all.every((p) => p.ready)) {
    broadcastAll(players, {
      type: "start_game",
      state: {
        round: 0,
        players: publicList(players),
      },
    });
    // Reset ready for potential future use
    all.forEach((p) => { p.ready = false; });
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(res.socket as NodeJS.Socket & { server?: { wss?: WebSocketServer } }).server) {
    res.status(500).end("No server");
    return;
  }

  // Init WSS once
  const server = (res.socket as NodeJS.Socket & { server: import("http").Server & { wss?: WebSocketServer } }).server;

  if (!global._wss) {
    const wss = new WebSocketServer({ noServer: true });
    global._wss = wss;

    server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
      const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
      if (url.pathname === "/api/ws") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit("connection", ws, request);
        });
      }
    });

    wss.on("connection", (ws: WebSocket) => {
      const players = getStore();
      const id = uid();
      let playerName = "Pistoleiro";

      // Send welcome
      ws.send(JSON.stringify({ type: "welcome", id }));

      ws.on("message", (raw: Buffer) => {
        let msg: { type: string; name?: string };
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        if (msg.type === "join" && msg.name) {
          playerName = msg.name.slice(0, 20);
          if (players.size >= 4) {
            ws.send(JSON.stringify({ type: "error", message: "Saloon cheio! Máximo 4 pistoleiros." }));
            ws.close();
            return;
          }
          players.set(id, { id, name: playerName, ready: false, ws });
          broadcastAll(players, { type: "players", players: publicList(players) });
        }

        if (msg.type === "ready") {
          const p = players.get(id);
          if (p) {
            p.ready = !p.ready;
            broadcastAll(players, { type: "players", players: publicList(players) });
            checkStart(players);
          }
        }

        if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      });

      ws.on("close", () => {
        players.delete(id);
        broadcastAll(players, { type: "players", players: publicList(players) });
      });

      ws.on("error", () => {
        players.delete(id);
      });
    });
  }

  res.end();
}