"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface Player {
  id: string;
  nome: string;
  pronto: boolean;
}

export default function Lobby() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const [fase, setFase] = useState("LOBBY");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const name = localStorage.getItem("playerName") || "Pistoleiro";
    
    // Conecta ao servidor
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("entrar", name);
    });

    socket.on("att_game", (data) => {
      setPlayers(data.jogadores);
      setFase(data.fase);
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  // Efeito separado para navegação (Mais seguro no Next.js)
  useEffect(() => {
    if (fase === "COMBATE") {
      router.push("/game");
    }
  }, [fase, router]);

  const toggleReady = () => {
    socketRef.current?.emit("voto_pronto");
  };

  const me = players.find(p => p.id === socketRef.current?.id);
  const allReady = players.length >= 1 && players.every(p => p.pronto);
  const ICONS = ["🤠", "🧔", "🧑", "👴"];
  const SLOTS = ["Pistoleiro I", "Pistoleiro II", "Pistoleiro III", "Pistoleiro IV"];

  return (
    <main style={{ minHeight: "100vh", background: "#0a0906", color: "#e6e6f0", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <div style={{ maxWidth: 500, width: "100%" }}>
        
        <h1 style={{ textAlign: "center", color: "#c9a96e" }}>{connected ? "Saloon Aberto" : "Conectando..."}</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, margin: "20px 0" }}>
          {[0, 1, 2, 3].map(i => {
            const p = players[i];
            const isMe = p?.id === socketRef.current?.id;
            return (
              <div key={i} style={{ 
                padding: 15, border: "1px solid #2d1a0a", 
                background: p ? (isMe ? "#1e1005" : "#141414") : "transparent",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span>{p ? `${ICONS[i]} ${p.nome}` : "Vazio..."}</span>
                {p && (
                  <span style={{ color: p.pronto ? "#3a8a3a" : "#5c3518" }}>
                    {p.pronto ? "✓ PRONTO" : "AGUARDANDO"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <button 
          onClick={toggleReady}
          disabled={!connected}
          style={{ 
            width: "100%", padding: 15, cursor: "pointer",
            background: me?.pronto ? "#5c3518" : "#c9a96e",
            color: me?.pronto ? "#fff" : "#000",
            border: "none", fontWeight: "bold"
          }}
        >
          {me?.pronto ? "CANCELAR" : "ESTOU PRONTO"}
        </button>
      </div>
    </main>
  );
}