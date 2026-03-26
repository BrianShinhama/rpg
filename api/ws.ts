// pages/api/ws.ts
// WebSocket server via Next.js Pages API route.
// Funciona em dev local e em deploys persistentes (Railway, Render, Fly.io).
// NÃO funciona em Vercel (serverless não suporta WebSocket persistente).

import type { NextApiRequest, NextApiResponse } from "next";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage, Server as HttpServer } from "http";
import type { Duplex } from "stream";

export const config = { api: { bodyParser: false } };

/* ─── TYPES ────────────────────────────────────────────────── */
interface Player {
  id: string;
  name: string;
  ready: boolean;
  ws: WebSocket;
}

type ServerWithWss = HttpServer & { wss?: WebSocketServer };
type SocketWithServer = NodeJS.Socket & { server: ServerWithWss };

/* ─── GLOBALS (hot-reload safe) ────────────────────────────── */
declare global {
  // eslint-disable-next-line no-var
  var _wss: WebSocketServer | undefined;
  // eslint-disable-next-line no-var
  var _players: Map<string, Player> | undefined;
}

/* ─── HELPERS ──────────────────────────────────────────────── */
function getPlayers(): Map<string, Player> {
  if (!global._players) global._players = new Map();
  return global._players;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function publicList(players: Map<string, Player>) {
  return Array.from(players.values()).map(({ id, name, ready }) => ({ id, name, ready }));
}

function send(ws: WebSocket, msg: object) {
  if (ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
  }
}

function broadcastAll(players: Map<string, Player>, msg: object) {
  players.forEach((p) => send(p.ws, msg));
}

function checkStart(players: Map<string, Player>) {
  if (players.size < 1) return;
  const all = Array.from(players.values());
  if (all.every((p) => p.ready)) {
    broadcastAll(players, {
      type: "start_game",
      state: { round: 0, players: publicList(players) },
    });
    all.forEach((p) => { p.ready = false; });
  }
}

/* ─── HANDLER ──────────────────────────────────────────────── */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ── FIX 1: Verificação de upgrade antes de qualquer outra coisa ──
  // O Next.js redireciona requisições de upgrade de protocolo para cá,
  // mas "res.socket" pode ser undefined em alguns contextos.
  const socket = res.socket as SocketWithServer | null;
  if (!socket?.server) {
    res.status(500).end("Sem servidor HTTP disponível");
    return;
  }

  const httpServer = socket.server;

  // ── FIX 2: Inicialização idempotente do WSS ──
  // Usamos global._wss em vez de httpServer.wss para sobreviver a hot-reloads
  // do Next.js dev server, que recria o httpServer mas mantém o global.
  if (global._wss) {
    res.status(200).end("WebSocket server já está rodando");
    return;
  }

  console.log("[ws] Inicializando WebSocketServer...");

  const wss = new WebSocketServer({ noServer: true });
  global._wss = wss;

  // ── FIX 3: Listener de "upgrade" no servidor HTTP ──
  // O Next.js não faz o upgrade automaticamente; precisamos interceptar
  // o evento "upgrade" no httpServer raiz e delegar ao nosso wss.
  httpServer.on("upgrade", (request: IncomingMessage, duplex: Duplex, head: Buffer) => {
    const { pathname } = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (pathname === "/api/ws") {
      wss.handleUpgrade(request, duplex, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      // Outros upgrades (ex: HMR do Next.js) → não interferir
      duplex.destroy();
    }
  });

  // ── Lógica de conexão ──
  wss.on("connection", (ws: WebSocket) => {
    const players = getPlayers();
    const id = uid();
    let playerName = "Pistoleiro";

    console.log(`[ws] Nova conexão: ${id}`);

    // Envia ID ao cliente logo ao conectar
    send(ws, { type: "welcome", id });

    ws.on("message", (raw: Buffer | string) => {
      let msg: { type: string; name?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        console.warn("[ws] Mensagem inválida (não é JSON):", raw.toString().slice(0, 80));
        return;
      }

      switch (msg.type) {
        case "join": {
          if (!msg.name?.trim()) {
            send(ws, { type: "error", message: "Nome inválido." });
            return;
          }
          playerName = msg.name.trim().slice(0, 20);

          if (players.size >= 4) {
            send(ws, { type: "error", message: "Saloon cheio! Máximo 4 pistoleiros." });
            ws.close(1008, "Lobby cheio");
            return;
          }

          players.set(id, { id, name: playerName, ready: false, ws });
          console.log(`[ws] ${playerName} (${id}) entrou. Total: ${players.size}`);
          broadcastAll(players, { type: "players", players: publicList(players) });
          break;
        }

        case "ready": {
          const p = players.get(id);
          if (p) {
            p.ready = !p.ready;
            broadcastAll(players, { type: "players", players: publicList(players) });
            checkStart(players);
          }
          break;
        }

        case "ping": {
          send(ws, { type: "pong" });
          break;
        }

        default:
          console.warn(`[ws] Tipo de mensagem desconhecido: ${msg.type}`);
      }
    });

    ws.on("close", (code, reason) => {
      console.log(`[ws] ${playerName} (${id}) desconectou — código ${code} ${reason}`);
      players.delete(id);
      broadcastAll(players, { type: "players", players: publicList(players) });
    });

    ws.on("error", (err) => {
      console.error(`[ws] Erro na conexão ${id}:`, err.message);
      players.delete(id);
    });
  });

  // ── FIX 4: Responde 101 apenas em upgrades; aqui respondemos 200
  // pois este handler é chamado via fetch() para inicializar o servidor.
  res.status(200).end("WebSocket server iniciado");
}