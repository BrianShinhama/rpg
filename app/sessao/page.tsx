"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

/* ─── Tipos ──────────────────────────────────────────────── */
interface Ficha { id: string; nome: string; nivel: number; classe: string; atributos?: { destreza?: number } }
interface Duelista { ficha: Ficha | null; aposta: number; pronto: boolean }
interface ResultadoDuelo {
  id: number;
  vencedor: string;
  perdedor: string;
  tempo: number; // ms
  condicao: string;
  aposta: number;
  data: string;
}

/* ─── Condições Especiais ────────────────────────────────── */
const CONDICOES = [
  { id: "nenhuma",       nome: "Nenhuma",           icon: "☀",  desc: "Duelo limpo. Que o melhor vença.",               bonus: 0   },
  { id: "sol_nos_olhos", nome: "Sol nos Olhos",      icon: "🌅", desc: "Janela de saque aumentada em 15%.",              bonus: 15  },
  { id: "vento_forte",   nome: "Vento Forte",        icon: "💨", desc: "Janela de saque reduzida em 20%.",              bonus: -20 },
  { id: "chuva",         nome: "Noite Chuvosa",      icon: "🌧", desc: "Visibilidade baixa: janela reduzida em 30%.",   bonus: -30 },
  { id: "maldicao",      nome: "Maldição da Forca",  icon: "☠",  desc: "Reação invertida — sacar cedo perde o duelo.", bonus: 0   },
  { id: "poeira",        nome: "Tempestade de Pó",   icon: "🌪", desc: "Sinal atrasado em até 800ms extras.",           bonus: 0   },
  { id: "lua_cheia",     nome: "Lua Cheia",          icon: "🌕", desc: "Bônus de destreza dobrado.",                    bonus: 0   },
];

/* ─── Fases do duelo ─────────────────────────────────────── */
type Fase =
  | "config"      // Seleção de personagens, condição, apostas
  | "preparando"  // Tela de "Mãos nas armas…"
  | "aguardando"  // Esperando o sinal (sem mostrar ainda)
  | "sacar"       // SAQUE! — janela aberta
  | "resultado"   // Quem venceu
  | "historico";  // Ver histórico

const JANELA_BASE_MS = 800; // tempo que o sinal fica visível

/* ─── Componente Principal ───────────────────────────────── */
export default function DuelPage() {
  /* Fichas salvas */
  const [fichas, setFichas]       = useState<Ficha[]>([]);

  /* Duelistas */
  const [duelo, setDuelo]         = useState<[Duelista, Duelista]>([
    { ficha: null, aposta: 0, pronto: false },
    { ficha: null, aposta: 0, pronto: false },
  ]);

  /* Condição escolhida */
  const [condicaoId, setCondicaoId] = useState("nenhuma");

  /* Fase do minigame */
  const [fase, setFase]           = useState<Fase>("config");

  /* Sinal de saque */
  const [sinalAtivo, setSinalAtivo] = useState(false);
  const [inicioDuelo, setInicioDuelo] = useState<number>(0);

  /* Resultados da rodada atual */
  const [resultado, setResultado] = useState<{
    vencedor: 0 | 1;
    tempos: [number | null, number | null];
    motivo: string;
  } | null>(null);

  /* Histórico persistido */
  const [historico, setHistorico] = useState<ResultadoDuelo[]>([]);

  /* Timers */
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sinalRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const temposRef   = useRef<[number | null, number | null]>([null, null]);
  const histIdRef   = useRef(1);

  /* ── Load/save ───────────────────────────────────────── */
  useEffect(() => {
    const f = localStorage.getItem("fichas_west");
    if (f) setFichas(JSON.parse(f));
    const h = localStorage.getItem("historico_duelos");
    if (h) { const parsed = JSON.parse(h); setHistorico(parsed); histIdRef.current = (parsed[0]?.id ?? 0) + 1; }
  }, []);

  const salvarHistorico = (novo: ResultadoDuelo[]) => {
    localStorage.setItem("historico_duelos", JSON.stringify(novo));
  };

  /* ── Condição atual ──────────────────────────────────── */
  const condicao = CONDICOES.find((c) => c.id === condicaoId)!;

  /* ── Helpers ─────────────────────────────────────────── */
  const setDuelista = (idx: 0 | 1, patch: Partial<Duelista>) =>
    setDuelo((d) => { const novo: [Duelista, Duelista] = [{ ...d[0] }, { ...d[1] }]; novo[idx] = { ...novo[idx], ...patch }; return novo; });

  const clearTimers = () => {
    if (timerRef.current)  clearTimeout(timerRef.current);
    if (sinalRef.current)  clearTimeout(sinalRef.current);
  };

  /* ── Iniciar duelo ───────────────────────────────────── */
  const iniciarDuelo = () => {
    if (!duelo[0].ficha || !duelo[1].ficha) return;
    temposRef.current = [null, null];
    setResultado(null);
    setSinalAtivo(false);
    setFase("preparando");

    // Delay aleatório 1.5s–5s (+800ms extra se "poeira")
    const poeira     = condicaoId === "poeira";
    const delayExtra = poeira ? Math.random() * 800 : 0;
    const delay      = 1500 + Math.random() * 3500 + delayExtra;

    timerRef.current = setTimeout(() => {
      setInicioDuelo(Date.now());
      setSinalAtivo(true);
      setFase("sacar");

      // Janela de saque
      const janelaMod  = condicao.bonus !== 0 ? 1 + condicao.bonus / 100 : 1;
      const janela      = JANELA_BASE_MS * janelaMod;

      sinalRef.current = setTimeout(() => {
        setSinalAtivo(false);
        // Após janela, quem não sacou perde
        setFase((f) => {
          if (f === "sacar") {
            resolverDuelo(temposRef.current);
          }
          return f;
        });
      }, janela > 100 ? janela : 100);
    }, delay);
  };

  /* ── Saque do jogador ────────────────────────────────── */
  const sacar = useCallback((idx: 0 | 1) => {
    if (fase !== "sacar" && fase !== "aguardando") return;
    const agora = Date.now();

    // Maldição: sacar quando sinal ativo = perde
    if (condicaoId === "maldicao" && sinalAtivo) {
      temposRef.current[idx] = -1; // marcador de "sacou cedo"
      resolverDuelo(temposRef.current);
      return;
    }

    // Sacou antes do sinal
    if (!sinalAtivo) {
      temposRef.current[idx] = -1;
      resolverDuelo(temposRef.current);
      return;
    }

    const tempo = agora - inicioDuelo;
    // Bônus de destreza com lua cheia
    const destreza = duelo[idx].ficha?.atributos?.destreza ?? 1;
    const bonus     = condicaoId === "lua_cheia" ? destreza * 2 : destreza;
    const tempoFinal = Math.max(10, tempo - bonus * 5);

    temposRef.current[idx] = tempoFinal;

    // Se ambos sacaram, resolve agora
    if (temposRef.current[0] !== null && temposRef.current[1] !== null) {
      clearTimeout(sinalRef.current!);
      setSinalAtivo(false);
      resolverDuelo(temposRef.current);
    }
  }, [fase, sinalAtivo, inicioDuelo, condicaoId, duelo]);

  /* ── Resolver ────────────────────────────────────────── */
  const resolverDuelo = (tempos: [number | null, number | null]) => {
    const [t0, t1] = tempos;

    let vencedor: 0 | 1;
    let motivo: string;

    const antecipou0 = t0 === -1;
    const antecipou1 = t1 === -1;

    if (antecipou0 && antecipou1) {
      // Ambos anteciparam — quem antecipou "menos" (não há diferença aqui, sorteio)
      vencedor = Math.random() < 0.5 ? 0 : 1;
      motivo   = "Ambos anteciparam — empate sorteado.";
    } else if (antecipou0) {
      vencedor = 1; motivo = `${duelo[0].ficha!.nome} sacou antes do sinal!`;
    } else if (antecipou1) {
      vencedor = 0; motivo = `${duelo[1].ficha!.nome} sacou antes do sinal!`;
    } else if (t0 === null && t1 === null) {
      // Nenhum sacou dentro da janela
      vencedor = Math.random() < 0.5 ? 0 : 1;
      motivo   = "Nenhum sacou a tempo — decidido pela sorte.";
    } else if (t0 === null) {
      vencedor = 1; motivo = `${duelo[0].ficha!.nome} não sacou a tempo.`;
    } else if (t1 === null) {
      vencedor = 0; motivo = `${duelo[1].ficha!.nome} não sacou a tempo.`;
    } else {
      vencedor = t0 <= t1 ? 0 : 1;
      motivo   = "";
    }

    const res = { vencedor, tempos: tempos as [number | null, number | null], motivo };
    setResultado(res);
    setSinalAtivo(false);
    setFase("resultado");

    // Salva no histórico
    const aposta = duelo[0].aposta + duelo[1].aposta;
    const entrada: ResultadoDuelo = {
      id:       histIdRef.current++,
      vencedor: duelo[vencedor].ficha!.nome,
      perdedor: duelo[vencedor === 0 ? 1 : 0].ficha!.nome,
      tempo:    tempos[vencedor] ?? 0,
      condicao: condicao.nome,
      aposta,
      data:     new Date().toLocaleString("pt-BR"),
    };
    const novoHistorico = [entrada, ...historico].slice(0, 30);
    setHistorico(novoHistorico);
    salvarHistorico(novoHistorico);
  };

  /* ── Keyboard shortcuts ──────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "KeyA") sacar(0);
      if (e.code === "KeyL") sacar(1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sacar]);

  useEffect(() => () => clearTimers(), []);

  /* ─────────────────────────────────────────────────────── */
  /* RENDER                                                  */
  /* ─────────────────────────────────────────────────────── */
  return (
    <main style={{
      minHeight: "calc(100vh - 56px)",
      background: "radial-gradient(ellipse 100% 70% at 50% 0%, #200e04 0%, #0a0906 60%)",
      display: "flex", flexDirection: "column",
    }}>
      {/* ── Header ──────────────────────────────────────── */}
      <header style={{ padding: "28px 32px 0", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          <div>
            <span className="label-west" style={{ display: "block", marginBottom: 4 }}>✦ Arena de Honra ✦</span>
            <h1>Duelo ao Pôr do Sol</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-ghost"
              style={{ fontSize: "0.7rem" }}
              onClick={() => setFase(fase === "historico" ? "config" : "historico")}
            >
              {fase === "historico" ? "← Voltar" : "Histórico"}
            </button>
            <Link href="/" className="btn-ghost" style={{ fontSize: "0.7rem" }}>← Saguão</Link>
          </div>
        </div>
        <div style={{ height: 1, background: "linear-gradient(90deg, var(--rust), var(--leather), transparent)" }} />
      </header>

      {/* ── Corpo ───────────────────────────────────────── */}
      <div style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "28px 32px 48px" }}>

        {/* HISTÓRICO */}
        {fase === "historico" && (
          <HistoricoView historico={historico} onLimpar={() => { setHistorico([]); salvarHistorico([]); }} />
        )}

        {/* CONFIG */}
        {fase === "config" && (
          <ConfigView
            fichas={fichas}
            duelo={duelo}
            setDuelista={setDuelista}
            condicaoId={condicaoId}
            setCondicaoId={setCondicaoId}
            condicao={condicao}
            onIniciar={iniciarDuelo}
          />
        )}

        {/* PREPARANDO */}
        {fase === "preparando" && (
          <ArenaView
            duelo={duelo}
            condicao={condicao}
            fase="preparando"
            sinalAtivo={false}
            resultado={null}
            onSacar={sacar}
            onReiniciar={() => { clearTimers(); setFase("config"); }}
            onNovoRound={() => { clearTimers(); iniciarDuelo(); }}
          />
        )}

        {/* SACAR */}
        {fase === "sacar" && (
          <ArenaView
            duelo={duelo}
            condicao={condicao}
            fase="sacar"
            sinalAtivo={sinalAtivo}
            resultado={null}
            onSacar={sacar}
            onReiniciar={() => { clearTimers(); setFase("config"); }}
            onNovoRound={() => { clearTimers(); iniciarDuelo(); }}
          />
        )}

        {/* RESULTADO */}
        {fase === "resultado" && resultado && (
          <ArenaView
            duelo={duelo}
            condicao={condicao}
            fase="resultado"
            sinalAtivo={false}
            resultado={resultado}
            onSacar={sacar}
            onReiniciar={() => { setFase("config"); setResultado(null); }}
            onNovoRound={() => { clearTimers(); iniciarDuelo(); }}
          />
        )}
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUBCOMPONENTES
═══════════════════════════════════════════════════════════ */

/* ── ConfigView ─────────────────────────────────────────── */
function ConfigView({ fichas, duelo, setDuelista, condicaoId, setCondicaoId, condicao, onIniciar }: {
  fichas: Ficha[];
  duelo: [Duelista, Duelista];
  setDuelista: (idx: 0 | 1, patch: Partial<Duelista>) => void;
  condicaoId: string;
  setCondicaoId: (id: string) => void;
  condicao: typeof CONDICOES[0];
  onIniciar: () => void;
}) {
  const prontos = duelo[0].ficha && duelo[1].ficha;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Seleção de duelistas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 20, alignItems: "start" }}>
        <DuelistaConfig idx={0} duelista={duelo[0]} fichas={fichas} setDuelista={setDuelista} label="Duelista 1" tecla="[A]" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 40, gap: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--rust)", opacity: 0.7 }}>VS</span>
          <span style={{ fontSize: "0.6rem", color: "var(--paper-dim)", textTransform: "uppercase", letterSpacing: "0.2em" }}>ao meio-dia</span>
        </div>
        <DuelistaConfig idx={1} duelista={duelo[1]} fichas={fichas} setDuelista={setDuelista} label="Duelista 2" tecla="[L]" />
      </div>

      {/* Condições */}
      <div>
        <span className="label-west" style={{ display: "block", marginBottom: 14 }}>Condição do Duelo</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 }}>
          {CONDICOES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCondicaoId(c.id)}
              style={{
                padding: "12px 14px",
                background: condicaoId === c.id ? "rgba(201,169,110,0.1)" : "var(--panel)",
                border: condicaoId === c.id ? "var(--border-gold)" : "var(--border)",
                borderRadius: "var(--radius)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: condicaoId === c.id ? "var(--gold)" : "var(--paper)", marginBottom: 3 }}>{c.nome}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--paper-dim)", lineHeight: 1.4 }}>{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Resumo + botão */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div className="west-card" style={{ flex: 1, maxWidth: 400, padding: "14px 18px" }}>
          <span className="label-west" style={{ display: "block", marginBottom: 6 }}>Resumo da Aposta</span>
          <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)", fontSize: "0.85rem" }}>
            {duelo[0].ficha?.nome ?? "—"} vs {duelo[1].ficha?.nome ?? "—"} &nbsp;·&nbsp;
            Pote total: <span style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>{duelo[0].aposta + duelo[1].aposta} XP</span>
          </p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--paper-dim)", marginTop: 4 }}>
            {condicao.icon} {condicao.nome}
            {condicao.bonus !== 0 && <span style={{ color: condicao.bonus > 0 ? "var(--gold)" : "#d07050" }}> ({condicao.bonus > 0 ? "+" : ""}{condicao.bonus}%)</span>}
          </p>
        </div>

        <button
          onClick={onIniciar}
          disabled={!prontos}
          className="btn-primary"
          style={{ fontSize: "1rem", padding: "16px 48px", letterSpacing: "0.22em", opacity: prontos ? 1 : 0.4, cursor: prontos ? "pointer" : "not-allowed" }}
        >
          ⚡ Iniciar Duelo
        </button>
      </div>
    </div>
  );
}

/* ── DuelistaConfig ──────────────────────────────────────── */
function DuelistaConfig({ idx, duelista, fichas, setDuelista, label, tecla }: {
  idx: 0 | 1; duelista: Duelista; fichas: Ficha[];
  setDuelista: (idx: 0 | 1, patch: Partial<Duelista>) => void;
  label: string; tecla: string;
}) {
  return (
    <div className="west-card west-card-ornate" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="label-west">{label}</span>
        <span className="badge-west badge-smoke" style={{ fontFamily: "var(--font-display)", fontSize: "0.7rem" }}>{tecla}</span>
      </div>

      {/* Seleção de ficha */}
      <div>
        <label className="label-west" style={{ display: "block", marginBottom: 6 }}>Personagem</label>
        {fichas.length === 0 ? (
          <p style={{ fontSize: "0.75rem", color: "var(--paper-dim)", fontStyle: "italic", fontFamily: "var(--font-prose)" }}>
            Nenhuma ficha encontrada.{" "}
            <Link href="/fichas" style={{ color: "var(--gold-dim)", textDecoration: "underline" }}>Criar ficha</Link>
          </p>
        ) : (
          <select
            className="input-west-box"
            value={duelista.ficha?.id ?? ""}
            onChange={(e) => {
              const f = fichas.find((f) => f.id === e.target.value) ?? null;
              setDuelista(idx, { ficha: f });
            }}
          >
            <option value="">— Selecionar —</option>
            {fichas.map((f) => (
              <option key={f.id} value={f.id}>{f.nome} (Nv.{f.nivel} {f.classe})</option>
            ))}
          </select>
        )}
      </div>

      {/* Ficha selecionada */}
      {duelista.ficha && (
        <div style={{ display: "flex", gap: 8 }}>
          <div className="stat-box" style={{ flex: 1 }}>
            <span className="stat-value" style={{ fontSize: "1.1rem" }}>{duelista.ficha.nivel}</span>
            <span className="stat-label">Nível</span>
          </div>
          <div className="stat-box" style={{ flex: 1 }}>
            <span className="stat-value" style={{ fontSize: "1.1rem" }}>{duelista.ficha.atributos?.destreza ?? "?"}</span>
            <span className="stat-label">Destreza</span>
          </div>
        </div>
      )}

      {/* Aposta */}
      <div>
        <label className="label-west" style={{ display: "block", marginBottom: 6 }}>Aposta (XP)</label>
        <input
          type="number"
          min={0}
          className="input-west-box"
          value={duelista.aposta || ""}
          placeholder="0"
          onChange={(e) => setDuelista(idx, { aposta: parseInt(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}

/* ── ArenaView ───────────────────────────────────────────── */
function ArenaView({ duelo, condicao, fase, sinalAtivo, resultado, onSacar, onReiniciar, onNovoRound }: {
  duelo: [Duelista, Duelista];
  condicao: typeof CONDICOES[0];
  fase: "preparando" | "sacar" | "resultado";
  sinalAtivo: boolean;
  resultado: { vencedor: 0 | 1; tempos: [number | null, number | null]; motivo: string } | null;
  onSacar: (idx: 0 | 1) => void;
  onReiniciar: () => void;
  onNovoRound: () => void;
}) {
  /* Cor do fundo de arena baseada na condição / fase */
  const bgGlow =
    fase === "resultado" && resultado
      ? resultado.vencedor === 0
        ? "radial-gradient(ellipse 60% 40% at 20% 50%, rgba(201,169,110,0.06) 0%, transparent 70%)"
        : "radial-gradient(ellipse 60% 40% at 80% 50%, rgba(201,169,110,0.06) 0%, transparent 70%)"
      : sinalAtivo
      ? "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(201,169,110,0.08) 0%, transparent 70%)"
      : "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Condição ativa */}
      <div style={{ textAlign: "center" }}>
        <span className="badge-west badge-smoke" style={{ fontSize: "0.7rem" }}>
          {condicao.icon} {condicao.nome}
          {condicao.bonus !== 0 && ` (${condicao.bonus > 0 ? "+" : ""}${condicao.bonus}%)`}
        </span>
      </div>

      {/* Campo da arena */}
      <div
        style={{
          position: "relative",
          background: `var(--panel), ${bgGlow}`,
          border: sinalAtivo ? "var(--border-gold)" : "var(--border)",
          borderRadius: "var(--radius)",
          padding: "40px 32px",
          transition: "border-color 0.2s",
          overflow: "hidden",
        }}
      >
        {/* Efeito de fundo da arena */}
        <div style={{
          position: "absolute", inset: 0,
          background: bgGlow,
          pointerEvents: "none",
          transition: "opacity 0.3s",
        }} />

        {/* Linha central */}
        <div style={{
          position: "absolute", left: "50%", top: "10%", bottom: "10%",
          width: 1,
          background: "linear-gradient(180deg, transparent, var(--leather), transparent)",
          transform: "translateX(-50%)",
        }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, alignItems: "center" }}>
          {/* Duelista 0 */}
          <DuelistaArena
            idx={0}
            duelista={duelo[0]}
            fase={fase}
            venceu={resultado?.vencedor === 0}
            perdeu={resultado?.vencedor === 1}
            tempo={resultado?.tempos[0]}
            sacouCedo={resultado?.tempos[0] === -1}
            onSacar={() => onSacar(0)}
            tecla="A"
          />

          {/* Centro — sinal */}
          <div style={{ textAlign: "center", minWidth: 120 }}>
            {fase === "preparando" && (
              <div style={{ animation: "fadeIn 0.4s ease" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--paper-dim)", marginBottom: 8 }}>Mãos nas armas...</p>
                <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "var(--leather)",
                      animation: `dust-drift 1.2s ease-in-out ${i * 0.3}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {fase === "sacar" && sinalAtivo && (
              <div style={{ animation: "fadeIn 0.1s ease" }}>
                <p style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2.2rem",
                  color: "#f0c840",
                  textShadow: "0 0 30px rgba(240,200,64,0.6)",
                  lineHeight: 1,
                  marginBottom: 4,
                }}>
                  SAQUE!
                </p>
              </div>
            )}

            {fase === "sacar" && !sinalAtivo && (
              <div style={{ animation: "fadeIn 0.1s ease" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--paper-dim)" }}>
                  Aguarde...
                </p>
              </div>
            )}

            {fase === "resultado" && resultado && (
              <div style={{ animation: "fadeIn 0.4s ease" }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", color: "var(--gold)", marginBottom: 4 }}>
                  {duelo[resultado.vencedor].ficha?.nome}
                </p>
                <p style={{ fontSize: "0.65rem", color: "var(--paper-dim)", fontFamily: "var(--font-body)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  venceu
                </p>
                {resultado.motivo && (
                  <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)", fontSize: "0.75rem", marginTop: 8, lineHeight: 1.4 }}>
                    {resultado.motivo}
                  </p>
                )}
                {(duelo[0].aposta + duelo[1].aposta) > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <span className="badge-west badge-gold">+{duelo[0].aposta + duelo[1].aposta} XP</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Duelista 1 */}
          <DuelistaArena
            idx={1}
            duelista={duelo[1]}
            fase={fase}
            venceu={resultado?.vencedor === 1}
            perdeu={resultado?.vencedor === 0}
            tempo={resultado?.tempos[1]}
            sacouCedo={resultado?.tempos[1] === -1}
            onSacar={() => onSacar(1)}
            tecla="L"
          />
        </div>
      </div>

      {/* Controles pós-resultado */}
      {fase === "resultado" && (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", animation: "fadeIn 0.5s ease" }}>
          <button className="btn-primary" onClick={onNovoRound} style={{ fontSize: "0.85rem" }}>
            ↺ Revanche
          </button>
          <button className="btn-ghost" onClick={onReiniciar} style={{ fontSize: "0.85rem" }}>
            Mudar Configuração
          </button>
        </div>
      )}
    </div>
  );
}

/* ── DuelistaArena ───────────────────────────────────────── */
function DuelistaArena({ idx, duelista, fase, venceu, perdeu, tempo, sacouCedo, onSacar, tecla }: {
  idx: 0 | 1; duelista: Duelista;
  fase: "preparando" | "sacar" | "resultado";
  venceu?: boolean; perdeu?: boolean;
  tempo?: number | null; sacouCedo?: boolean;
  onSacar: () => void; tecla: string;
}) {
  const align = idx === 0 ? "left" : "right";

  return (
    <div style={{ textAlign: align as "left" | "right", display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Info */}
      <div>
        <h3 style={{
          fontSize: "1.1rem",
          color: venceu ? "var(--gold)" : perdeu ? "var(--paper-dim)" : "var(--paper)",
          marginBottom: 2,
          opacity: perdeu ? 0.5 : 1,
          transition: "all 0.4s",
        }}>
          {duelista.ficha?.nome ?? "—"}
        </h3>
        <span className="label-west">{duelista.ficha?.classe ?? ""}</span>
      </div>

      {/* Avatar / silhueta */}
      <div style={{
        width: 100, height: 120,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginLeft: idx === 0 ? 0 : "auto",
        marginRight: idx === 1 ? 0 : "auto",
        border: venceu ? "var(--border-gold)" : perdeu ? "1px solid var(--dust)" : "var(--border)",
        borderRadius: "var(--radius)",
        background: venceu ? "rgba(201,169,110,0.06)" : "var(--smoke)",
        transition: "all 0.4s",
        position: "relative",
        overflow: "hidden",
      }}>
        <span style={{
          fontSize: "3.5rem",
          filter: perdeu ? "grayscale(1) opacity(0.3)" : "none",
          transform: idx === 1 ? "scaleX(-1)" : "none",
          transition: "filter 0.4s",
        }}>
          🤠
        </span>
        {venceu && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            background: "rgba(201,169,110,0.12)",
            padding: "4px",
            textAlign: "center",
            fontSize: "0.6rem",
            fontFamily: "var(--font-display)",
            color: "var(--gold)",
            letterSpacing: "0.12em",
          }}>
            VENCEDOR
          </div>
        )}
      </div>

      {/* Tempo de reação */}
      {fase === "resultado" && (
        <div style={{ animation: "fadeIn 0.5s ease 0.2s both" }}>
          {sacouCedo ? (
            <span className="badge-west badge-rust">Antecipou!</span>
          ) : tempo ? (
            <div>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: venceu ? "var(--gold)" : "var(--paper-dim)" }}>
                {tempo}ms
              </span>
              <span className="label-west" style={{ display: "block" }}>Tempo de reação</span>
            </div>
          ) : (
            <span className="badge-west badge-smoke">Não sacou</span>
          )}
        </div>
      )}

      {/* Botão de saque */}
      {(fase === "preparando" || fase === "sacar") && (
        <button
          onClick={onSacar}
          className={fase === "sacar" ? "btn-primary" : "btn-ghost"}
          style={{
            fontSize: "0.8rem",
            padding: "12px 20px",
            letterSpacing: "0.18em",
            transition: "all 0.15s",
          }}
        >
          SACAR! [{tecla}]
        </button>
      )}

      {/* Aposta */}
      {duelista.aposta > 0 && (
        <span className="badge-west badge-gold" style={{ alignSelf: align === "left" ? "flex-start" : "flex-end" }}>
          Aposta: {duelista.aposta} XP
        </span>
      )}
    </div>
  );
}

/* ── HistoricoView ───────────────────────────────────────── */
function HistoricoView({ historico, onLimpar }: { historico: ResultadoDuelo[]; onLimpar: () => void }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: "1.4rem" }}>Registro de Duelos</h2>
        {historico.length > 0 && (
          <button className="btn-ghost" style={{ fontSize: "0.7rem", color: "#d07050", borderColor: "var(--rust)" }} onClick={onLimpar}>
            Limpar Histórico
          </button>
        )}
      </div>

      {historico.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.4 }}>
          <p style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--leather)" }}>✦</p>
          <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)" }}>
            Nenhum duelo registrado ainda.
          </p>
        </div>
      ) : (
        <table className="table-west">
          <thead>
            <tr>
              <th>Vencedor</th>
              <th>Perdedor</th>
              <th>Tempo</th>
              <th>Condição</th>
              <th>Pote</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((d, i) => (
              <tr key={d.id} style={{ animation: i < 3 ? "fadeIn 0.3s ease" : "none" }}>
                <td>
                  <span style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>✦</span>
                  {" "}{d.vencedor}
                </td>
                <td style={{ color: "var(--paper-dim)", opacity: 0.6 }}>{d.perdedor}</td>
                <td>
                  {d.tempo > 0
                    ? <span style={{ fontFamily: "var(--font-display)", color: "var(--gold)" }}>{d.tempo}ms</span>
                    : <span className="badge-west badge-rust" style={{ fontSize: "0.6rem" }}>Antecipou</span>}
                </td>
                <td><span className="badge-west badge-smoke">{d.condicao}</span></td>
                <td>
                  {d.aposta > 0
                    ? <span className="badge-west badge-gold">{d.aposta} XP</span>
                    : <span style={{ color: "var(--paper-dim)" }}>—</span>}
                </td>
                <td style={{ color: "var(--paper-dim)", fontSize: "0.75rem" }}>{d.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}