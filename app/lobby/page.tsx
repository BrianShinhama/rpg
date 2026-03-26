"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  ready: boolean;
}

export default function Lobby() {
  const router = useRouter();
  const [myId, setMyId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    // 1. Inicializa o endpoint que sobe o WSS no servidor Next.js
    fetch("/api/ws").finally(() => {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${window.location.host}/api/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
      };

      ws.onmessage = (event) => {
        let msg: { type: string; id?: string; players?: Player[] };
        try { msg = JSON.parse(event.data); } catch { return; }

        // 2. Servidor enviou nosso ID — agora enviamos o join com o nome
        if (msg.type === "welcome" && msg.id) {
          setMyId(msg.id);
          const name = localStorage.getItem("playerName") || "Pistoleiro";
          ws.send(JSON.stringify({ type: "join", name }));
        }

        // 3. Lista de jogadores atualizada
        if (msg.type === "players" && msg.players) {
          setPlayers(msg.players);
        }

        // 4. Jogo iniciou — todos prontos
        if (msg.type === "start_game") {
          router.push("/game");
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
      };

      ws.onerror = () => {
        setConnected(false);
      };
    });
  }, [router]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const toggleReady = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ready" }));
    }
  };

  const me = players.find(p => p.id === myId);
  const allReady = players.length >= 1 && players.every(p => p.ready);
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

        {/* Header */}
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

        {/* Slots de Jogadores */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => {
            const p = players[i];
            const isMe = p?.id === myId;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                background: p ? (isMe ? "rgba(201,169,110,0.06)" : "rgba(27,27,39,0.8)") : "rgba(10,9,6,0.25)",
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
                          {p.name}
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
                    background: p.ready ? "rgba(58,138,58,0.12)" : "transparent",
                    border: `1px solid ${p.ready ? "#3a8a3a" : "#2d1a0a"}`,
                    borderRadius: "20px", fontSize: "0.58rem", textTransform: "uppercase",
                    letterSpacing: "0.12em", color: p.ready ? "#3a8a3a" : "#5c3518",
                  }}>
                    {p.ready ? "✓ Pronto" : "aguardando"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Status */}
        <div style={{ marginBottom: 18, padding: "9px 14px", background: "rgba(10,9,6,0.5)", border: "1px solid #1a1208", borderRadius: "2px", textAlign: "center" }}>
          <p style={{ fontSize: "0.68rem", color: allReady ? "#3a8a3a" : "#8a7d6e", fontStyle: "italic" }}>
            {players.length === 0 ? "O Saloon está vazio..."
              : allReady ? "✦ Todos prontos! Abrindo as portas..."
              : `${players.filter(p => p.ready).length}/${players.length} prontos — aperte o botão abaixo`}
          </p>
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { wsRef.current?.close(); router.push("/"); }}
            className="btn-ghost"
            style={{ flex: "0 0 auto", fontSize: "0.7rem", padding: "11px 16px", cursor: "pointer" }}
          >
            ← Sair
          </button>
          <button
            onClick={toggleReady}
            className={me?.ready ? "btn-ghost" : "btn-primary"}
            style={{
              flex: 1,
              fontSize: "0.78rem",
              letterSpacing: "0.16em",
              cursor: "pointer",
            }}
            disabled={!connected || !me}
          >
            {me?.ready ? "✕ CANCELAR PRONTO" : "✦ ESTOU PRONTO ✦"}
          </button>
        </div>

      </div>
    </main>
  );
}