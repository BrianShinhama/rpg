// server.js
const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // Porta do teu Next.js
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🤠 Um pistoleiro entrou no saloon:", socket.id);

  socket.on("rolar_dado", (data) => {
    console.log(`🎲 ${data.jogador} rolou ${data.valor}`);
    // Envia para todos, incluindo quem rolou
    io.emit("resultado_global", data);
  });

  socket.on("disconnect", () => {
    console.log("👤 Um pistoleiro saiu pela porta dos fundos.");
  });
});

httpServer.listen(3001, () => {
  console.log("🚀 Servidor Socket rodando em http://localhost:3001");
});