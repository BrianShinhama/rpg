// server.js
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

let jogadores = [];
let estadoJogo = "LOBBY"; // LOBBY, LOJA, COMBATE
let sessaoAtual = 1;

io.on("connection", (socket) => {
  socket.on("entrar_partida", (nome) => {
    if (jogadores.length < 4) {
      const novoJogador = {
        id: socket.id,
        nome,
        hp: 100,
        maxHp: 100,
        dinheiro: 100,
        pronto: false,
        arma: { nome: "Soco Inglês", atk: 2 }
      };
      jogadores.push(novoJogador);
      io.emit("atualizar_jogadores", jogadores);
    }
  });

  socket.on("marcar_pronto", () => {
    const jogador = jogadores.find(j => j.id === socket.id);
    if (jogador) {
      jogador.pronto = !jogador.pronto;
      io.emit("atualizar_jogadores", jogadores);
      
      if (jogadores.length >= 1 && jogadores.every(j => j.pronto)) {
        estadoJogo = estadoJogo === "LOBBY" || estadoJogo === "LOJA" ? "COMBATE" : "LOJA";
        jogadores.forEach(j => j.pronto = false);
        io.emit("iniciar_fase", { estadoJogo, sessaoAtual });
      }
    }
  });

  socket.on("acao_combate", (data) => {
    // Sincroniza dano nos monstros e logs para todos
    io.emit("atualizar_combate", data);
  });

  socket.on("disconnect", () => {
    jogadores = jogadores.filter(j => j.id !== socket.id);
    io.emit("atualizar_jogadores", jogadores);
  });
});

httpServer.listen(3001);