"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket, type WsPlayer, type ServerMessage } from "@/hooks/useWebSocket";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  connecting:   { label: "Procurando Saloon...",  color: "#c9942a" },
  connected:    { label: "Dentro do Saloon",      color: "#3a8a3a" },
  disconnected: { label: "Conexão Perdida",       color: "#8b0000" },
};

export default function Lobby() {
  const router = useRouter();
  const [players, setPlayers] = useState<WsPlayer[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Processa mensagens vindas do servidor
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "welcome":
        setMyId(msg.id!);
        break;
      case "players":
        setPlayers(msg.players || []);
        break;
      case "start_game":
        // Salva o estado e vai para o jogo
        sessionStorage.setItem("gameState", JSON.stringify(msg.state));
        router.push("/game");
        break;
      case "error":
        setErrorMsg(msg.message || "Erro desconhecido");
        break;
    }
  }, [router]);

  const { status, send, myId: wsId } = useWebSocket({ onMessage: handleMessage });

  // Envia o comando "join" assim que o socket conecta
  useEffect(() => {
    if (status === "connected" && wsId && !joined) {
      const name = localStorage.getItem("playerName") || "Pistoleiro Solitário";
      send({ type: "join", name });
      setJoined(true);
    }
  }, [status, wsId, joined, send]);

  const toggleReady = () => {
    if (status !== "connected") return;
    send({ type: "ready" });
  };

  const me = players.find(p => p.id === myId);
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.disconnected;

  return (
    <main style={{
      minHeight: "100vh", background: "#0a0906",
      backgroundImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #1a1208 0%, #0a0906 65%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "24px", color: "#e6e6f0"
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        
        {/* Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: "3rem", color: "#c9a96e", letterSpacing: "0.1em", marginBottom: 8 }}>SALOON</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusInfo.color }} />
            <span style={{ fontSize: "0.7rem", textTransform: "uppercase", color: statusInfo.color }}>{statusInfo.label}</span>
          </div>
        </div>

        {/* Lista de Pistoleiros */}
        <div style={{ background: "rgba(27, 27, 39, 0.8)", padding: "24px", border: "1px solid #2d1a0a", borderRadius: "4px", marginBottom: 24 }}>
          <p style={{ fontSize: "0.6rem", color: "#8a6e44", marginBottom: 16, letterSpacing: "0.2em" }}>PISTOLEIROS ({players.length}/4)</p>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {players.map((p) => (
              <div key={p.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px", border: `1px solid ${p.id === myId ? "#c9a96e" : "#1e1a17"}`,
                background: p.id === myId ? "rgba(201,169,110,0.05)" : "transparent"
              }}>
                <span style={{ color: p.id === myId ? "#c9a96e" : "#d4c9b8" }}>
                  🤠 {p.name} {p.id === myId && "(Você)"}
                </span>
                <span style={{ 
                  fontSize: "0.6rem", padding: "4px 12px", borderRadius: "20px",
                  border: `1px solid ${p.ready ? "#3a8a3a" : "#3d2b1f"}`,
                  color: p.ready ? "#3a8a3a" : "#8a7d6e"
                }}>
                  {p.ready ? "PRONTO" : "ESPERANDO"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Botão de Ação */}
        <button
          onClick={toggleReady}
          disabled={status !== "connected"}
          style={{
            width: "100%", padding: "16px", cursor: "pointer", fontWeight: "bold",
            background: me?.ready ? "transparent" : "#c9a96e",
            color: me?.ready ? "#c9a96e" : "#000",
            border: me?.ready ? "1px solid #c9a96e" : "none",
            letterSpacing: "0.2em", transition: "all 0.2s"
          }}
        >
          {me?.ready ? "CANCELAR PRONTIDÃO" : "⚔️ ESTOU PRONTO"}
        </button>

        <button onClick={() => router.push("/")} style={{ width: "100%", background: "none", border: "none", color: "#5c3518", marginTop: 20, cursor: "pointer", fontSize: "0.7rem" }}>
          ← SAIR DO GRUPO
        </button>
      </div>
    </main>
  );
}