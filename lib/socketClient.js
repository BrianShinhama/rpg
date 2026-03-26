// lib/socketClient.js
import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (!socket && typeof window !== "undefined") {
    socket = io({
      path: "/api/socket_io",
    });
  }
  return socket;
}
