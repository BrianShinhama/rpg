// server.js — servidor customizado Next.js + WebSocket
// Rode com: node server.js
// No Railway: defina o Start Command como "node server.js"

const { createServer } = require("http");
const { parse }        = require("url");
const next             = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app  = next({ dev });
const handle = app.getRequestHandler();

/* ─── estado do lobby ──────────────────────────────────── */
/** @type {Map<string, { id: string, name: string, ready: boolean, ws: import("ws").WebSocket }>} */
const players = new Map();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function publicList() {
  return Array.from(players.values()).map(({ id, name, ready }) => ({ id, name, ready }));
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  players.forEach((p) => {
    if (p.ws.readyState === WebSocket.OPEN) {
      try { p.ws.send(data); } catch { /* ignora */ }
    }
  });
}

function checkStart() {
  if (players.size < 1) return;
  if (!Array.from(players.values()).every((p) => p.ready)) return;

  broadcast({ type: "start_game", state: { round: 0, players: publicList() } });
  players.clear();
}

/* ─── boot ─────────────────────────────────────────────── */
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  /* WebSocket na rota /api/ws */
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url);
    if (pathname === "/api/ws") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws) => {
    const id = uid();

    ws.send(JSON.stringify({ type: "welcome", id }));

    ws.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      /* join */
      if (msg.type === "join" && msg.name) {
        if (players.size >= 4) {
          ws.send(JSON.stringify({ type: "error", message: "Saloon cheio! Máximo 4 pistoleiros." }));
          ws.close();
          return;
        }
        const name = String(msg.name).slice(0, 20);
        players.set(id, { id, name, ready: false, ws });
        broadcast({ type: "players", players: publicList() });
      }

      /* ready */
      if (msg.type === "ready") {
        const p = players.get(id);
        if (p) {
          p.ready = !p.ready;
          broadcast({ type: "players", players: publicList() });
          checkStart();
        }
      }

      /* ping */
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    });

    ws.on("close", () => {
      players.delete(id);
      broadcast({ type: "players", players: publicList() });
    });

    ws.on("error", () => {
      players.delete(id);
    });
  });

  server.listen(port, () => {
    console.log(`🤠 Deadrails rodando em http://localhost:${port}`);
    console.log(`🔌 WebSocket pronto em ws://localhost:${port}/api/ws`);
  });
});