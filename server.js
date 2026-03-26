const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let jogadores = [];
let fase = "LOBBY"; // LOBBY, LOJA, COMBATE
let sessao = 1;
let boss = null;

const BOSSES = [
  { nome: "Bando de Ladrões", hp: 150, maxHp: 150, atk: 10 },
  { nome: "O Renegado", hp: 400, maxHp: 400, atk: 20 },
  { nome: "Irmãos Dalton", hp: 800, maxHp: 800, atk: 35 },
  { nome: "Xerife Corrupto", hp: 1500, maxHp: 1500, atk: 50 },
  { nome: "O REI DE CINZAS", hp: 3000, maxHp: 3000, atk: 80 }
];

io.on("connection", (socket) => {
  socket.on("entrar", (nome) => {
    if (jogadores.length < 4 && fase === "LOBBY") {
      jogadores.push({
        id: socket.id,
        nome: nome || "Pistoleiro",
        hp: 100,
        maxHp: 100,
        dinheiro: 100,
        pronto: false,
        arma: { nome: "Soco Inglês", atk: 8 }
      });
      io.emit("att_game", { jogadores, fase, sessao, boss });
    }
  });

  socket.on("voto_pronto", () => {
    const j = jogadores.find(p => p.id === socket.id);
    if (j) {
      j.pronto = !j.pronto;
      if (jogadores.length >= 1 && jogadores.every(p => p.pronto)) {
        jogadores.forEach(p => p.pronto = false);
        if (fase === "LOBBY" || fase === "LOJA") {
          fase = "COMBATE";
          boss = { ...BOSSES[sessao - 1] };
        }
      }
      io.emit("att_game", { jogadores, fase, sessao, boss });
    }
  });

  socket.on("atacar", () => {
    const j = jogadores.find(p => p.id === socket.id);
    if (j && j.hp > 0 && fase === "COMBATE" && boss) {
      boss.hp -= j.arma.atk;
      if (boss.hp <= 0) {
        fase = "LOJA";
        jogadores.forEach(p => { p.dinheiro += 150 * sessao; p.pronto = false; });
        sessao++;
        boss = null;
      } else {
        // Boss ataca alguém aleatório
        const alvo = jogadores[Math.floor(Math.random() * jogadores.length)];
        if (alvo.hp > 0) alvo.hp -= boss.atk;
      }
      io.emit("att_game", { jogadores, fase, sessao, boss });
    }
  });

  socket.on("comprar", (item) => {
    const j = jogadores.find(p => p.id === socket.id);
    if (j && j.dinheiro >= item.preco) {
      j.dinheiro -= item.preco;
      if (item.tipo === "arma") j.arma = { nome: item.nome, atk: item.atk };
      if (item.tipo === "cura") j.hp = Math.min(j.hp + 50, j.maxHp);
      io.emit("att_game", { jogadores, fase, sessao, boss });
    }
  });

  socket.on("disconnect", () => {
    jogadores = jogadores.filter(p => p.id !== socket.id);
    io.emit("att_game", { jogadores, fase, sessao, boss });
  });
});

httpServer.listen(process.env.PORT || 3001);