"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  ready: boolean;
}

function useTick(ms = 500) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT(n => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return t;
}

/* ─── monta a URL do WebSocket corretamente em qualquer ambiente ── */
function getWsUrl() {
  // Em produção (Railway, Render, etc.) a variável NEXT_PUBLIC_WS_URL
  // deve apontar para wss://seu-app.railway.app/api/ws
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  // Fallback: deriva do host atual (funciona em dev e na maioria dos deploys)
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host     = window.location.host;
  return `${protocol}://${host}/api/ws`;
}

export default function Lobby() {
  const router = useRouter();
  const [myId, setMyId]           = useState<string | null>(null);
  const [players, setPlayers]     = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const wsRef    = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick     = useTick(500);
  const dots     = ".".repeat((tick % 3) + 1);

  const connect = useCallback(() => {
    // Limpa retry anterior se houver
    if (retryRef.current) clearTimeout(retryRef.current);

    let ws: WebSocket;
    try {
      ws = new WebSocket(getWsUrl());
    } catch (e) {
      setError("Não foi possível conectar ao servidor.");
      console.error(e);
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      let msg: { type: string; id?: string; players?: Player[]; message?: string };
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "welcome" && msg.id) {
        setMyId(msg.id);
        const name = localStorage.getItem("playerName") || "Pistoleiro";
        ws.send(JSON.stringify({ type: "join", name }));
      }
      if (msg.type === "players" && msg.players) {
        setPlayers(msg.players);
      }
      if (msg.type === "error" && msg.message) {
        setError(msg.message);
      }
      if (msg.type === "start_game") {
        setLaunching(true);
        setTimeout(() => router.push("/game"), 1800);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Tenta reconectar após 3s se não foi intencional
      retryRef.current = setTimeout(() => {
        if (!launching) connect();
      }, 3000);
    };

    ws.onerror = () => {
      setConnected(false);
    };
  }, [router, launching]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const toggleReady = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "ready" }));
    }
  };

  const me         = players.find(p => p.id === myId);
  const allReady   = players.length >= 1 && players.every(p => p.ready);
  const readyCount = players.filter(p => p.ready).length;

  const AVATARS = ["🤠", "🧔", "🧑", "👴"];
  const TITLES  = ["Pistoleiro I", "Pistoleiro II", "Pistoleiro III", "Pistoleiro IV"];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rye&family=Special+Elite&family=Playfair+Display:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:         #080705;
          --panel:      #110e0b;
          --panel-2:    #181410;
          --gold:       #c9a96e;
          --gold-dim:   #7a5e35;
          --gold-shine: #f0d090;
          --rust:       #8a3010;
          --rust-hi:    #b84020;
          --leather:    #4a2810;
          --paper:      #d4c9b8;
          --paper-dim:  #7a6e5e;
          --green:      #2a6a2a;
          --green-hi:   #3aaa3a;
          --red:        #aa3030;
          --font-d: 'Rye', serif;
          --font-b: 'Special Elite', monospace;
          --font-p: 'Playfair Display', serif;
        }

        body { background: var(--bg); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: var(--bg); }
        ::-webkit-scrollbar-thumb { background: var(--leather); border-radius: 2px; }

        .lob-root {
          min-height: 100vh;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 90% 55% at 50% 0%, #281505 0%, transparent 65%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 40px 20px; font-family: var(--font-b); color: var(--paper); position: relative;
        }
        .lob-root::before {
          content: ''; position: fixed; inset: 0; pointer-events: none;
          background: radial-gradient(ellipse 60% 35% at 50% 100%, rgba(122,48,16,0.07) 0%, transparent 70%);
        }

        .lob-card {
          width: 100%; max-width: 520px;
          background: var(--panel); border: 1px solid var(--leather); border-radius: 3px;
          padding: 36px 32px 28px;
          box-shadow: 0 0 0 1px #0a0805, 0 10px 56px rgba(0,0,0,0.9), inset 0 1px 0 rgba(201,169,110,0.06);
          position: relative; animation: cardIn 0.55s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cardIn {
          from { opacity:0; transform: translateY(20px) scale(0.975); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }
        .lob-card::before, .lob-card::after {
          content:''; position:absolute; width:14px; height:14px;
          border-color:var(--gold-dim); border-style:solid; opacity:0.45;
        }
        .lob-card::before { top:10px; left:10px; border-width:1px 0 0 1px; }
        .lob-card::after  { bottom:10px; right:10px; border-width:0 1px 1px 0; }

        .eyebrow { display:flex; align-items:center; gap:12px; justify-content:center; margin-bottom:10px; }
        .eyebrow-ln { flex:1; height:1px; background:linear-gradient(90deg, transparent, var(--leather)); }
        .eyebrow-ln.r { background:linear-gradient(90deg, var(--leather), transparent); }
        .eyebrow-txt { font-size:0.52rem; letter-spacing:0.35em; color:var(--gold-dim); text-transform:uppercase; }

        .lob-title {
          font-family:var(--font-d); color:var(--gold);
          font-size:clamp(1.5rem,4vw,2.1rem); text-align:center;
          letter-spacing:0.07em; line-height:1.15;
          text-shadow:0 0 40px rgba(201,169,110,0.22), 0 3px 12px rgba(0,0,0,0.8);
          margin-bottom:4px;
        }
        .lob-sub {
          font-family:var(--font-p); font-style:italic; color:var(--paper-dim);
          font-size:0.75rem; text-align:center; letter-spacing:0.07em; margin-bottom:8px;
        }

        .conn-pill { display:flex; align-items:center; gap:7px; justify-content:center; margin-bottom:6px; }
        .conn-dot  { width:6px; height:6px; border-radius:50%; flex-shrink:0; transition:all 0.4s; }
        .conn-dot.on  { background:var(--green-hi); box-shadow:0 0 6px var(--green-hi); animation:dpulse 2s infinite; }
        .conn-dot.off { background:var(--rust); }
        .conn-dot.err { background:var(--red); }
        @keyframes dpulse { 0%,100%{box-shadow:0 0 4px var(--green-hi)} 50%{box-shadow:0 0 12px var(--green-hi)} }
        .conn-txt { font-size:0.58rem; color:var(--paper-dim); letter-spacing:0.1em; }

        .error-bar {
          margin-bottom:10px; padding:7px 12px;
          background:rgba(170,48,48,0.12); border:1px solid rgba(170,48,48,0.4); border-radius:2px;
          font-size:0.62rem; color:#e07070; text-align:center; letter-spacing:0.05em;
          font-family:var(--font-p); font-style:italic;
        }

        .div-west { display:flex; align-items:center; gap:10px; margin:10px 0 16px; }
        .div-west::before,.div-west::after {
          content:''; flex:1; height:1px;
          background:linear-gradient(90deg, transparent, var(--leather), transparent);
        }
        .div-west span { font-size:0.7rem; color:var(--gold-dim); }

        .slots { display:flex; flex-direction:column; gap:7px; margin-bottom:18px; }

        .slot {
          display:flex; align-items:center; gap:12px; padding:10px 13px; border-radius:2px;
          border:1px dashed #1c1208; background:rgba(10,9,6,0.25);
          transition:all 0.3s; position:relative; overflow:hidden;
        }
        .slot.occ  { border-style:solid; border-color:#2d1a0a; background:rgba(18,14,9,0.7); }
        .slot.mine { border-color:var(--gold-dim); background:rgba(201,169,110,0.048); box-shadow:inset 0 0 24px rgba(201,169,110,0.04); }
        .slot.mine::before { content:''; position:absolute; left:0; top:0; bottom:0; width:2px; background:var(--gold-dim); }
        .slot-enter { animation: slotIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes slotIn { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }

        .slot-av {
          width:36px; height:36px; border-radius:2px; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; font-size:1.2rem;
          background:var(--panel-2); border:1px solid #2a1a0a; transition:border-color 0.3s;
        }
        .slot.mine .slot-av { border-color:var(--gold-dim); }
        .slot.empty .slot-av { background:transparent; border-color:#181208; }

        .slot-info { flex:1; min-width:0; }
        .slot-name { font-size:0.86rem; color:var(--paper); display:flex; align-items:center; gap:7px; line-height:1.2; }
        .slot.mine .slot-name { color:var(--gold); }
        .you-tag { font-size:0.45rem; color:var(--gold-dim); letter-spacing:0.2em; text-transform:uppercase; border:1px solid var(--gold-dim); border-radius:20px; padding:1px 5px; }
        .slot-rank { font-size:0.52rem; color:var(--leather); text-transform:uppercase; letter-spacing:0.14em; margin-top:2px; }
        .slot-empty-lbl { font-size:0.58rem; color:#231810; text-transform:uppercase; letter-spacing:0.12em; }

        .badge { padding:3px 9px; border-radius:20px; font-size:0.52rem; text-transform:uppercase; letter-spacing:0.12em; flex-shrink:0; border:1px solid; transition:all 0.35s; }
        .badge.rdy { border-color:var(--green); background:rgba(42,106,42,0.15); color:var(--green-hi); }
        .badge.wai { border-color:#2d1a0a; background:transparent; color:#4a2810; }

        .prog-wrap { margin-bottom:16px; }
        .prog-lbl { display:flex; justify-content:space-between; font-size:0.55rem; color:var(--paper-dim); letter-spacing:0.1em; margin-bottom:6px; }
        .prog-track { height:3px; background:#1c1208; border-radius:2px; overflow:hidden; border:1px solid #2a1a0a; }
        .prog-fill { height:100%; border-radius:2px; background:linear-gradient(90deg, var(--gold-dim), var(--gold)); transition:width 0.5s cubic-bezier(0.34,1.56,0.64,1); position:relative; }
        .prog-fill::after { content:''; position:absolute; right:0; top:0; bottom:0; width:16px; background:linear-gradient(90deg, transparent, rgba(240,208,144,0.55)); }

        .msg-bar { padding:8px 14px; background:rgba(10,9,6,0.55); border:1px solid #181208; border-radius:2px; text-align:center; margin-bottom:18px; min-height:34px; display:flex; align-items:center; justify-content:center; }
        .msg-bar p { font-family:var(--font-p); font-style:italic; font-size:0.68rem; letter-spacing:0.05em; }

        .btn-row { display:flex; gap:10px; }
        .btn-back { flex:0 0 auto; background:transparent; color:var(--paper-dim); border:1px solid #2d1a0a; border-radius:2px; padding:11px 16px; font-family:var(--font-b); font-size:0.65rem; letter-spacing:0.12em; text-transform:uppercase; cursor:pointer; transition:border-color 0.25s, color 0.25s; }
        .btn-back:hover { border-color:var(--gold-dim); color:var(--gold); }

        .btn-ready { flex:1; border:none; border-radius:2px; padding:13px; font-family:var(--font-b); font-size:0.76rem; letter-spacing:0.2em; text-transform:uppercase; cursor:pointer; position:relative; overflow:hidden; transition:background 0.3s, color 0.3s, box-shadow 0.3s, transform 0.15s; }
        .btn-ready.go { background:var(--rust); color:#f5e8d5; box-shadow:0 3px 0 #4a1805, 0 6px 22px rgba(138,48,16,0.45); }
        .btn-ready.go::after { content:''; position:absolute; inset:0; pointer-events:none; background:linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 55%); }
        .btn-ready.go:hover:not(:disabled) { background:var(--rust-hi); box-shadow:0 3px 0 #4a1805, 0 10px 30px rgba(184,64,32,0.5); transform:translateY(-1px); }
        .btn-ready.go:active { transform:translateY(1px); }
        .btn-ready.cancel { background:transparent; color:var(--gold-dim); border:1px solid var(--gold-dim); }
        .btn-ready.cancel:hover:not(:disabled) { background:rgba(201,169,110,0.08); color:var(--gold); border-color:var(--gold); }
        .btn-ready:disabled { opacity:0.35; cursor:not-allowed; transform:none !important; }

        .launch-ov { position:fixed; inset:0; background:#080705; z-index:200; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:18px; animation:fadeIn 0.4s ease both; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .launch-ttl { font-family:var(--font-d); color:var(--gold); font-size:clamp(2.2rem,7vw,4rem); animation:glow 0.7s ease infinite alternate; }
        @keyframes glow { from{text-shadow:0 0 30px rgba(201,169,110,0.3)} to{text-shadow:0 0 80px rgba(201,169,110,0.75)} }
        .launch-sub { font-family:var(--font-p); font-style:italic; color:var(--paper-dim); font-size:0.88rem; letter-spacing:0.1em; }

        @media (max-width:520px) { .lob-card { padding:28px 18px 22px; } }
      `}</style>

      {launching && (
        <div className="launch-ov">
          <div className="launch-ttl">DEADRAILS</div>
          <div className="launch-sub">Preparando o confronto...</div>
        </div>
      )}

      <main className="lob-root">
        <div className="lob-card">

          <div className="eyebrow">
            <div className="eyebrow-ln" />
            <span className="eyebrow-txt">Saloon · Deadrails</span>
            <div className="eyebrow-ln r" />
          </div>

          <h1 className="lob-title">Aguardando Pistoleiros</h1>
          <p className="lob-sub">Até 4 por mesa — só os corajosos entram</p>

          <div className="conn-pill">
            <div className={`conn-dot ${error ? "err" : connected ? "on" : "off"}`} />
            <span className="conn-txt">
              {error ? "Erro de conexão" : connected ? "Conectado ao servidor" : `Conectando${dots}`}
            </span>
          </div>

          {error && <div className="error-bar">{error} — tentando reconectar...</div>}

          <div className="div-west"><span>✦</span></div>

          <div className="slots">
            {[0, 1, 2, 3].map(i => {
              const p    = players[i];
              const isMe = p?.id === myId;
              return (
                <div key={i} className={`slot ${p ? "occ" : "empty"} ${isMe ? "mine" : ""} ${p ? "slot-enter" : ""}`}>
                  <div className="slot-av">{p ? AVATARS[i] : ""}</div>
                  <div className="slot-info">
                    {p ? (
                      <>
                        <div className="slot-name">
                          {p.name}
                          {isMe && <span className="you-tag">você</span>}
                        </div>
                        <div className="slot-rank">{TITLES[i]}</div>
                      </>
                    ) : (
                      <div className="slot-empty-lbl">Vago...</div>
                    )}
                  </div>
                  {p && (
                    <div className={`badge ${p.ready ? "rdy" : "wai"}`}>
                      {p.ready ? "✓ Pronto" : "Aguardando"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="prog-wrap">
            <div className="prog-lbl">
              <span>Prontos para o duelo</span>
              <span>{readyCount} / {players.length || "—"}</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{ width: players.length ? `${(readyCount / players.length) * 100}%` : "0%" }} />
            </div>
          </div>

          <div className="msg-bar">
            <p style={{ color: allReady ? "var(--green-hi)" : "var(--paper-dim)" }}>
              {players.length === 0
                ? "O saloon está vazio... entre e aguarde."
                : allReady
                  ? "✦ Todos prontos! Abrindo as portas do duelo..."
                  : `${readyCount} de ${players.length} pistoleiro${players.length > 1 ? "s" : ""} pronto${readyCount !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="btn-row">
            <button className="btn-back" onClick={() => { wsRef.current?.close(); router.push("/"); }}>
              ← Sair
            </button>
            <button
              className={`btn-ready ${me?.ready ? "cancel" : "go"}`}
              onClick={toggleReady}
              disabled={!connected || !me}
            >
              {me?.ready ? "✕ Cancelar Pronto" : "✦ Estou Pronto ✦"}
            </button>
          </div>

        </div>
      </main>
    </>
  );
}