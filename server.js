// server.js
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Porta do seu Next.js
    methods: ["GET", "POST"]
  }
});

let jogadores = [];

io.on("connection", (socket) => {
  console.log("🤠 Um pistoleiro entrou no saloon:", socket.id);

  // 1. Ouvir quando um jogador entra
  socket.on("entrar", (nome) => {
    // Evita duplicados caso a página recarregue
    jogadores = jogadores.filter(j => j.id !== socket.id);
    
    if (jogadores.length < 4) {
      jogadores.push({
        id: socket.id,
        nome: nome || "Pistoleiro Anônimo",
        pronto: false
      });
    }
    // Envia a lista atualizada para TODOS
    io.emit("att_game", { jogadores, fase: "LOBBY" });
  });

  // 2. Ouvir o botão de "Pronto"
  socket.on("voto_pronto", () => {
    const j = jogadores.find(p => p.id === socket.id);
    if (j) {
      j.pronto = !j.pronto;
      
      // Verifica se todos estão prontos
      const todosProntos = jogadores.length >= 1 && jogadores.every(p => p.pronto);
      
      io.emit("att_game", { 
        jogadores, 
        fase: todosProntos ? "COMBATE" : "LOBBY" 
      });
    }
  });

  // 3. Remover jogador instantaneamente ao sair
  socket.on("disconnect", () => {
    jogadores = jogadores.filter(j => j.id !== socket.id);
    io.emit("att_game", { jogadores, fase: "LOBBY" });
    console.log("👤 Um pistoleiro saiu pela porta dos fundos.");
  });
});

httpServer.listen(3001, () => {
  console.log("🚀 Servidor Socket rodando em http://localhost:3001");
});