import { Server } from 'socket.io';

export default function Handler(req, res) {
  // Se o socket já estiver rodando, não faz nada
  if (res.socket.server.io) {
    console.log('Socket já está configurado');
    res.end();
    return;
  }

  console.log('Inicializando Socket.io...');
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  // Lógica de conexão
  io.on('connection', (socket) => {
    console.log('Novo cliente conectado:', socket.id);

    socket.on('send-message', (msg) => {
      io.emit('receive-message', msg); // Envia para todos
    });
  });

  res.end();
}