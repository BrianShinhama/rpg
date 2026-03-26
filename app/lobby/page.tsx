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
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // 1. Pega o nome do localStorage (definido na sua tela de login)
    const name = localStorage.getItem("playerName") || "Pistoleiro";
    setPlayerName(name);

    // 2. Conecta ao servidor Socket.io
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      // Avisa o servidor que entramos
      socket.emit("entrar", name);
    });

    // 3. ATUALIZAÇÃO IMEDIATA: Recebe a lista de jogadores sempre que algo muda
    socket.on("att_game", (data) => {
      setPlayers(data.jogadores);
      
      // Se o servidor mudar a fase para COMBATE, todos mudam de página
      if (data.fase === "COMBATE") {
        router.push("/game");
      }
    });

    socket.on("disconnect", () => setConnected(false));

    return () => {
      socket.disconnect();
    };
  }, [router]);

  const toggleReady = () => {
    socketRef.current?.emit("voto_pronto");
  };

  const me = players.find(p => p.id === socketRef.current?.id);
  const allReady = players.length >= 1 && players.every(p => p.pronto);
  const ICONS = ["🤠", "🧔", "🧑", "👴"];
  const SLOTS = ["Pistoleiro I", "Pistoleiro II", "Pistoleiro III", "Pistoleiro IV"];

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0a0906",
      backgroundImage: "radial-gradient(ellipse 70% 50% at 50% 0%, #1e1005 0%, #0a0906 60%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "40px 24px", color: "#e6e6f0"
    }}>
      <div style={{ maxWidth: 540, width: "100%" }}>

        {/* Header - Mantendo seu estilo original */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 14 }}>
            <div style={{ width: 48, height: 1, background: "linear-gradient(90deg, transparent, #5c3518)" }} />
            <span style={{ color: "#8a6e44", fontSize: "0.58rem", letterSpacing: "0.3em", textTransform: "uppercase" }}>Saloon</span>
            <div style={{ width: 48, height: 1, background: "linear-gradient(90deg, #5c3518, transparent)" }} />
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.4rem)", color: "#c9a96e", marginBottom: 10, fontWeight: "bold" }}>
            Aguardando Pistoleiros
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? "#3a8a3a" : "#7a3010",
              boxShadow: connected ? "0 0 5px #3a8a3a" : "none",
            }} />
            <span style={{ color: "#8a7d6e", fontSize: "0.68rem", letterSpacing: "0.1em" }}>
              {connected ? "Conectado ao Multiplayer" : "Tentando conexão..."}
            </span>
          </div>
        </div>

        {/* Slots de Jogadores - Sincronizado e Bonito */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => {
            const p = players[i];
            const isMe = p?.id === socketRef.current?.id;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                background: p ? (isMe ? "rgba(201,169,110,0.06)" : "rgba(27, 27, 39, 0.8)") : "rgba(10,9,6,0.25)",
                border: isMe ? "1px solid #8a6e44" : p ? "1px solid #2d1a0a" : "1px dashed #1a1208",
                borderRadius: "2px", transition: "all 0.3s",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "2px",
                  background: p ? "#1c1814" : "transparent",
                  border: p ? "1px solid #2d1a0a" : "1px dashed #1a1208",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1.2rem", flexShrink: 0,
                }}>
                  {p ? ICONS[i] : ""}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {p ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.9rem", color: isMe ? "#c9a96e" : "#d4c9b8", fontWeight: "bold" }}>
                          {p.nome}
                        </span>
                        {isMe && <span style={{ fontSize: "0.52rem", color: "#8a6e44", textTransform: "uppercase", letterSpacing: "0.15em" }}>você</span>}
                      </div>
                      <div style={{ fontSize: "0.58rem", color: "#5c3518", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 1 }}>
                        {SLOTS[i]}
                      </div>
                    </>
                  ) : (
                    <span style={{ color: "#1e1208", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Vago...</span>
                  )}
                </div>
                {p && (
                  <div style={{
                    padding: "3px 11px",
                    background: p.pronto ? "rgba(58,138,58,0.12)" : "transparent",
                    border: `1px solid ${p.pronto ? "#3a8a3a" : "#2d1a0a"}`,
                    borderRadius: "20px", fontSize: "0.58rem", textTransform: "uppercase",
                    letterSpacing: "0.12em", color: p.pronto ? "#3a8a3a" : "#5c3518",
                  }}>
                    {p.pronto ? "✓ Pronto" : "aguardando"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status de Início */}
        <div style={{ marginBottom: 18, padding: "9px 14px", background: "rgba(10,9,6,0.5)", border: "1px solid #1a1208", borderRadius: "2px", textAlign: "center" }}>
          <p style={{ fontSize: "0.68rem", color: allReady ? "#3a8a3a" : "#8a7d6e", fontStyle: "italic" }}>
            {players.length === 0 ? "O Saloon está vazio..."
              : allReady ? "✦ Todos prontos! Abrindo as portas..."
              : `${players.filter(p => p.pronto).length}/${players.length} prontos — aperte o botão abaixo`}
          </p>
        </div>

        {/* Botões - Corrigidos */}
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            onClick={() => { socketRef.current?.disconnect(); router.push("/"); }} 
            className="btn-ghost" 
            style={{ flex: "0 0 auto", fontSize: "0.7rem", padding: "11px 16px", cursor: "pointer" }}
          >
            ← Sair
          </button>
          <button
            onClick={toggleReady}
            className={me?.pronto ? "btn-ghost" : "btn-primary"}
            style={{ 
               flex: 1, 
               fontSize: "0.78rem", 
               letterSpacing: "0.16em", 
               cursor: "pointer",
               background: me?.pronto ? "transparent" : "var(--accent)", // Garante que a cor mude
               color: me?.pronto ? "#8a6e44" : "#000"
            }}
            disabled={!connected || !me}
          >
            {me?.pronto ? "✕ CANCELAR PRONTO" : "✦ ESTOU PRONTO ✦"}
          </button>
        </div>

      </div>
    </main>
  );
}