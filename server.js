const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { WebSocketServer, WebSocket } = require("ws");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev });
const handle = app.getRequestHandler();

/* ─── ESTADO DO LOBBY ──────────────────────────────────── */
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
      try { p.ws.send(data); } catch (e) { /* falha silenciosa */ }
    }
  });
}

function checkStart() {
  const playerArray = Array.from(players.values());
  if (playerArray.length < 1) return;
  // Se todos os presentes estiverem prontos
  if (playerArray.every((p) => p.ready)) {
    broadcast({ 
      type: "start_game", 
      state: { round: 1, players: publicList() } 
    });
    // Opcional: não limpe o Map aqui se quiser manter os sockets vivos durante o jogo
  }
}

/* ─── BOOT ─────────────────────────────────────────────── */
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
    console.log(`🤠 Novo pistoleiro tentando entrar... (ID: ${id})`);

    ws.send(JSON.stringify({ type: "welcome", id }));

    ws.on("message", (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }

      /* join */
      if (msg.type === "join") {
        if (players.size >= 4) {
          ws.send(JSON.stringify({ type: "error", message: "Saloon cheio!" }));
          return;
        }
        const name = String(msg.name || "Pistoleiro").slice(0, 20);
        players.set(id, { id, name, ready: false, ws });
        console.log(`✅ ${name} entrou no Saloon.`);
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

      /* ping (necessário para manter conexão viva no Railway) */
      if (msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    });

    ws.on("close", () => {
      const p = players.get(id);
      if (p) {
        console.log(`👤 ${p.name} saiu do Saloon.`);
        players.delete(id);
        broadcast({ type: "players", players: publicList() });
      }
    });

    ws.on("error", () => {
      players.delete(id);
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> 🤠 Deadrails pronto em http://localhost:${port}`);
  });
});