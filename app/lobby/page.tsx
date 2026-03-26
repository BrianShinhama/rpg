"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  ready: boolean;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Lobby() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const myIdRef = useRef<string>("");
  const [myId, setMyId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const [wsMode, setWsMode] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const startGame = useCallback((state: object) => {
    localStorage.setItem("gameState", JSON.stringify(state));
    localStorage.setItem("myId", myIdRef.current);
    router.push("/game");
  }, [router]);

  useEffect(() => {
    const name = localStorage.getItem("playerName");
    if (!name) { router.push("/"); return; }
    setPlayerName(name);

    // Stable ID for this session
    let sid = sessionStorage.getItem("playerId");
    if (!sid) { sid = genId(); sessionStorage.setItem("playerId", sid); }
    myIdRef.current = sid;
    setMyId(sid);

    // BroadcastChannel for same-device multi-tab
    const bc = new BroadcastChannel("deadrails_lobby");
    channelRef.current = bc;
    bc.onmessage = (e) => {
      if (e.data.type === "players") setPlayers(e.data.players);
      if (e.data.type === "start") startGame(e.data.state);
    };

    tryWS(name, sid, bc);

    return () => {
      wsRef.current?.close();
      if (pingRef.current) clearInterval(pingRef.current);
      bc.close();
    };
  }, []);

  const tryWS = (name: string, sid: string, bc: BroadcastChannel) => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${protocol}://${window.location.host}/api/ws`);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          fallbackMode(name, sid, bc);
        }
      }, 3000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setConnected(true);
        setWsMode(true);
        ws.send(JSON.stringify({ type: "join", name, id: sid }));
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, 25000);
      };

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "players") {
          setPlayers(msg.players);
          bc.postMessage({ type: "players", players: msg.players });
        }
        if (msg.type === "start_game") {
          bc.postMessage({ type: "start", state: msg.state });
          startGame(msg.state);
        }
      };

      ws.onerror = () => { clearTimeout(timeout); fallbackMode(name, sid, bc); };
      ws.onclose = () => { setConnected(false); if (pingRef.current) clearInterval(pingRef.current); };
    } catch {
      fallbackMode(name, sid, bc);
    }
  };

  const FALLBACK_KEY = "deadrails_lobby_v2";

  const saveFallback = (p: Player[], bc: BroadcastChannel) => {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify({ players: p, ts: Date.now() }));
    bc.postMessage({ type: "players", players: p });
  };

  const loadFallback = (): Player[] => {
    try {
      const raw = localStorage.getItem(FALLBACK_KEY);
      if (!raw) return [];
      const { players, ts } = JSON.parse(raw);
      // Expire after 2 minutes of inactivity
      if (Date.now() - ts > 120000) { localStorage.removeItem(FALLBACK_KEY); return []; }
      return players || [];
    } catch { return []; }
  };

  const fallbackMode = (name: string, sid: string, bc: BroadcastChannel) => {
    setWsMode(false);
    setConnected(true);

    const existing = loadFallback().filter(p => p.id !== sid);
    const mePlayer: Player = { id: sid, name, ready: false };
    const newList = existing.length < 4 ? [...existing, mePlayer] : [...existing.slice(0, 3), mePlayer];
    setPlayers(newList);
    saveFallback(newList, bc);

    // Poll localStorage for changes from other tabs
    const poll = setInterval(() => {
      const loaded = loadFallback();
      if (loaded.length > 0) setPlayers(loaded);
    }, 800);
    pingRef.current = poll;
  };

  const toggleReady = () => {
    if (wsMode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ready" }));
      return;
    }

    // Fallback mode: toggle self in localStorage
    const current = loadFallback();
    const updated = current.map(p =>
      p.id === myIdRef.current ? { ...p, ready: !p.ready } : p
    );
    setPlayers(updated);
    saveFallback(updated, channelRef.current!);

    const allReady = updated.length >= 1 && updated.every(p => p.ready);
    if (allReady) {
      setTimeout(() => {
        const state = { round: 0, players: updated };
        channelRef.current?.postMessage({ type: "start", state });
        startGame(state);
      }, 1000);
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
      padding: "40px 24px", fontFamily: "var(--font-body)",
    }}>
      <div style={{ maxWidth: 540, width: "100%" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center", marginBottom: 14 }}>
            <div style={{ width: 48, height: 1, background: "linear-gradient(90deg, transparent, #5c3518)" }} />
            <span style={{ color: "#8a6e44", fontSize: "0.58rem", letterSpacing: "0.3em", textTransform: "uppercase" }}>Saloon</span>
            <div style={{ width: 48, height: 1, background: "linear-gradient(90deg, #5c3518, transparent)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 5vw, 2.4rem)", color: "#c9a96e", marginBottom: 10 }}>
            Aguardando Pistoleiros
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: connected ? "#3a8a3a" : "#7a3010",
              boxShadow: connected ? "0 0 5px #3a8a3a" : "none",
            }} />
            <span style={{ color: "#8a7d6e", fontSize: "0.68rem", letterSpacing: "0.1em" }}>
              {!connected ? "Conectando..." : wsMode ? "Multijogador online" : "Modo local"}
            </span>
          </div>
          {!wsMode && (
            <div style={{ marginTop: 10, padding: "6px 14px", background: "rgba(92,53,24,0.15)", border: "1px solid #2d1a0a", borderRadius: "2px", display: "inline-block" }}>
              <p style={{ fontSize: "0.62rem", color: "#8a6e44" }}>
                💡 Para multiplayer real, use Railway ou Render (suporte a WebSocket)
              </p>
            </div>
          )}
        </div>

        {/* Slots */}
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 24 }}>
          {[0, 1, 2, 3].map(i => {
            const p = players[i];
            const isMe = p?.id === myId;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 14, padding: "13px 16px",
                background: p ? (isMe ? "rgba(201,169,110,0.04)" : "var(--panel)") : "rgba(10,9,6,0.25)",
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
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", color: isMe ? "#c9a96e" : "#d4c9b8" }}>
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
                    transition: "all 0.3s", flexShrink: 0,
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
          <p style={{ fontSize: "0.68rem", color: allReady ? "#3a8a3a" : "#8a7d6e", fontFamily: "var(--font-prose)", fontStyle: "italic" }}>
            {players.length === 0 ? "Nenhum pistoleiro ainda..."
              : allReady ? "✦ Todos prontos! Iniciando partida..."
              : `${players.filter(p => p.ready).length}/${players.length} prontos — todos precisam apertar "Estou Pronto"`}
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/")} className="btn-ghost" style={{ flex: "0 0 auto", fontSize: "0.7rem", padding: "11px 16px" }}>
            ← Sair
          </button>
          <button
            onClick={toggleReady}
            className={me?.ready ? "btn-ghost" : "btn-primary"}
            style={{ flex: 1, fontSize: "0.78rem", letterSpacing: "0.16em" }}
            disabled={!connected || !me}
          >
            {me?.ready ? "✕ Cancelar Pronto" : "✦ Estou Pronto ✦"}
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: 18, fontSize: "0.58rem", color: "#1e1208", letterSpacing: "0.1em", lineHeight: 1.7 }}>
          Todos os jogadores devem apertar "Estou Pronto" para iniciar · Máx. 4 pistoleiros
        </p>
      </div>
    </main>
  );
}