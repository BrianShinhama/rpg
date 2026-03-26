const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // URL do seu Next.js
    methods: ["GET", "POST"]
  }
});

let jogadores = [];
let faseAtual = "LOBBY";

io.on("connection", (socket) => {
  console.log("Novo pistoleiro conectado:", socket.id);

  // Evento ao entrar no Saloon
  socket.on("entrar", (nome) => {
    // Evita duplicados e limita a 4 jogadores
    if (jogadores.length < 4) {
      jogadores.push({ id: socket.id, nome, pronto: false });
    }
    // Avisa todo mundo da nova lista
    io.emit("att_game", { jogadores, fase: faseAtual });
  });

  // Evento de "Estou Pronto"
  socket.on("voto_pronto", () => {
    const player = jogadores.find(p => p.id === socket.id);
    if (player) {
      player.pronto = !player.pronto;
    }

    // Checa se todos estão prontos para iniciar o combate
    const todosProntos = jogadores.length >= 1 && jogadores.every(p => p.pronto);
    
    if (todosProntos) {
      faseAtual = "COMBATE";
    }

    io.emit("att_game", { jogadores, fase: faseAtual });
  });

  // Limpeza ao sair
  socket.on("disconnect", () => {
    jogadores = jogadores.filter(p => p.id !== socket.id);
    // Se o Saloon esvaziar, volta para o Lobby
    if (jogadores.length === 0) faseAtual = "LOBBY";
    io.emit("att_game", { jogadores, fase: faseAtual });
    console.log("Pistoleiro saiu:", socket.id);
  });
});

server.listen(3001, () => {
  console.log("🤠 Servidor do Saloon rodando na porta 3001");
});