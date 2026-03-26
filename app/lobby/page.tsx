"use client";
// app/lobby/page.tsx
// Lobby multiplayer — usa o hook useWebSocket para comunicação em tempo real.
//
// FLUXO:
//   1. Componente monta → useWebSocket conecta ao /api/ws
//   2. Ao receber "welcome" (id), envia mensagem "join" com o nome do jogador
//   3. Servidor responde com "players" contendo todos no lobby
//   4. Quando todos clicam "Pronto", servidor envia "start_game"

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useWebSocket, type WsPlayer, type ServerMessage } from "@/hooks/useWebSocket";

/* ─── STATUS BADGE ──────────────────────────────────────────── */
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  connecting:   { label: "Conectando...",  color: "#c9942a" },
  connected:    { label: "Conectado",      color: "#3a8a3a" },
  disconnected: { label: "Desconectado",   color: "#8a7d6e" },
  error:        { label: "Erro",           color: "#8b0000" },
};

/* ─── COMPONENTE ────────────────────────────────────────────── */
export default function Lobby() {
  const router = useRouter();
  const [players, setPlayers] = useState<WsPlayer[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ── Recebe mensagens do servidor ── */
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "welcome":
        setMyId(msg.id);
        break;

      case "players":
        setPlayers(msg.players);
        break;

      case "start_game":
        // Salva estado inicial no sessionStorage e navega para o jogo
        sessionStorage.setItem("gameState", JSON.stringify(msg.state));
        router.push("/game");
        break;

      case "error":
        setErrorMsg(msg.message);
        break;
    }
  }, [router]);

  const { status, send, myId: wsId } = useWebSocket({ onMessage: handleMessage });

  /* ── Envia "join" assim que tiver ID e ainda não tiver entrado ── */
  useEffect(() => {
    if (wsId && !joined && status === "connected") {
      const name = localStorage.getItem("playerName") || "Pistoleiro";
      send({ type: "join", name });
      setJoined(true);
    }
  }, [wsId, joined, status, send]);

  /* ── Atualiza myId do hook ── */
  useEffect(() => {
    if (wsId) setMyId(wsId);
  }, [wsId]);

  const me = players.find((p) => p.id === myId);

  const toggleReady = () => {
    if (status !== "connected") return;
    send({ type: "ready" });
  };

  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.disconnected;
  const allReady = players.length > 0 && players.every((p) => p.ready);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0a0906",
      backgroundImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #1a1208 0%, #0a0906 65%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-body)",
      padding: "24px",
    }}>
      <div style={{ maxWidth: 520, width: "100%" }}>

        {/* Título */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            color: "#c9a96e",
            marginBottom: 8,
            textShadow: "0 0 40px rgba(201,169,110,0.3)",
          }}>
            SALOON
          </h1>
          <p style={{ color: "#8a7d6e", fontFamily: "var(--font-prose)", fontStyle: "italic", fontSize: "0.85rem" }}>
            Aguardando pistoleiros...
          </p>
        </div>

        {/* Status de conexão */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8, justifyContent: "center",
          marginBottom: 32,
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: statusInfo.color,
            boxShadow: status === "connected" ? `0 0 8px ${statusInfo.color}` : "none",
            display: "inline-block",
          }} />
          <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em", color: statusInfo.color }}>
            {statusInfo.label}
          </span>
        </div>

        {/* Erro */}
        {errorMsg && (
          <div style={{
            background: "rgba(122,48,16,0.2)",
            border: "1px solid #7a3010",
            borderRadius: "2px",
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: "0.8rem",
            color: "#d07050",
            textAlign: "center",
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Lista de jogadores */}
        <div className="west-card" style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.25em",
            color: "#8a6e44", marginBottom: 16,
          }}>
            Pistoleiros no Saloon ({players.length}/4)
          </div>

          {players.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "24px 0",
              color: "#3d2b1f", fontFamily: "var(--font-prose)", fontStyle: "italic", fontSize: "0.85rem",
            }}>
              {status === "connecting" ? "Conectando ao saloon..." : "Nenhum pistoleiro ainda..."}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {players.map((p) => (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  background: p.id === myId ? "rgba(201,169,110,0.06)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${p.id === myId ? "#8a6e44" : "#1e1a17"}`,
                  borderRadius: "2px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: "1.1rem" }}>🤠</span>
                    <span style={{
                      fontFamily: "var(--font-body)", fontSize: "0.9rem",
                      color: p.id === myId ? "#c9a96e" : "#d4c9b8",
                    }}>
                      {p.name}
                      {p.id === myId && (
                        <span style={{ fontSize: "0.55rem", color: "#8a6e44", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                          (você)
                        </span>
                      )}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.15em",
                    color: p.ready ? "#3a8a3a" : "#8a7d6e",
                    padding: "3px 10px",
                    border: `1px solid ${p.ready ? "#1a4a1a" : "#1e1a17"}`,
                    borderRadius: "20px",
                    background: p.ready ? "rgba(58,138,58,0.1)" : "transparent",
                  }}>
                    {p.ready ? "✓ Pronto" : "Esperando"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aviso de início */}
        {allReady && (
          <div style={{
            textAlign: "center", marginBottom: 20,
            color: "#c9a96e", fontFamily: "var(--font-prose)", fontStyle: "italic", fontSize: "0.85rem",
          }}>
            ✦ Todos prontos! Iniciando a aventura...
          </div>
        )}

        {/* Botão pronto */}
        <button
          className={me?.ready ? "btn-ghost" : "btn-primary"}
          style={{
            width: "100%", fontSize: "0.85rem", letterSpacing: "0.2em",
            padding: "14px",
            opacity: status !== "connected" || !joined ? 0.4 : 1,
          }}
          onClick={toggleReady}
          disabled={status !== "connected" || !joined}
        >
          {me?.ready ? "CANCELAR PRONTIDÃO" : "⚔️ ESTOU PRONTO"}
        </button>

        {/* Voltar */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.2em",
              color: "#3d2b1f",
            }}
          >
            ← Voltar ao menu
          </button>
        </div>
      </div>
    </main>
  );
}