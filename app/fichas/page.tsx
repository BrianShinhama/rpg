"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const CLASSES = [
  "Forasteiro",
  "Pistoleiro",
  "Caçador de Recompensas",
  "Pregador",
  "Médico de Campanha",
  "Bandoleiro",
  "Xerife",
  "Índio Aliado",
];

export default function ListaFichas() {
  const [fichas, setFichas]   = useState<any[]>([]);
  const [nome, setNome]       = useState("");
  const [classe, setClasse]   = useState(CLASSES[0]);
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const salvas = localStorage.getItem("fichas_west");
    if (salvas) setFichas(JSON.parse(salvas));
  }, []);

  const criarFicha = () => {
    if (!nome.trim()) return;
    const nova = {
      id:       Date.now().toString(),
      nome:     nome.trim(),
      nivel:    1,
      classe,
      hp:       { atual: 10, max: 10 },
      criadoEm: new Date().toLocaleDateString("pt-BR"),
    };
    const lista = [...fichas, nova];
    setFichas(lista);
    localStorage.setItem("fichas_west", JSON.stringify(lista));
    setNome("");
    setClasse(CLASSES[0]);
  };

  const deletarFicha = (id: string) => {
    const lista = fichas.filter((f) => f.id !== id);
    setFichas(lista);
    localStorage.setItem("fichas_west", JSON.stringify(lista));
    setDeleting(null);
  };

  if (!mounted) return null;

  return (
    <main
      style={{
        minHeight: "calc(100vh - 56px)",
        background:
          "radial-gradient(ellipse 80% 50% at 50% 0%, #1a1005 0%, #0a0906 60%)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "48px 24px" }}>

        {/* ── Cabeçalho ─────────────────────────────────── */}
        <header style={{ marginBottom: 40 }}>
          <div style={{ marginBottom: 8 }}>
            <span className="label-west">✦ Registro Geral ✦</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h1 style={{ marginBottom: 4 }}>Saloon das Fichas</h1>
              <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)", fontSize: "0.9rem" }}>
                {fichas.length === 0
                  ? "Nenhum pistoleiro registrado ainda."
                  : `${fichas.length} pistoleiro${fichas.length > 1 ? "s" : ""} no registro`}
              </p>
            </div>
            <Link href="/" className="btn-ghost" style={{ fontSize: "0.7rem" }}>
              ← Voltar ao Saguão
            </Link>
          </div>
          <div style={{ marginTop: 24, height: 1, background: "linear-gradient(90deg, var(--leather), transparent)" }} />
        </header>

        {/* ── Grid ──────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}
        >
          {/* Card "Criar Nova Ficha" */}
          <div
            className="west-card"
            style={{ border: "1px dashed var(--leather)", background: "rgba(22,18,16,0.6)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <span style={{ color: "var(--gold)", fontSize: "1.1rem" }}>✦</span>
              <span className="label-west">Novo Personagem</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="label-west" style={{ display: "block", marginBottom: 6 }}>
                Nome do Atirador
              </label>
              <input
                className="input-west"
                placeholder="Ex: Jack 'Três Dedos' Calloway"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && criarFicha()}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label className="label-west" style={{ display: "block", marginBottom: 6 }}>
                Ocupação
              </label>
              <select
                className="input-west-box"
                value={classe}
                onChange={(e) => setClasse(e.target.value)}
              >
                {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              onClick={criarFicha}
              className="btn-primary"
              style={{ width: "100%" }}
              disabled={!nome.trim()}
            >
              + Registrar Personagem
            </button>
          </div>

          {/* Cards de fichas existentes */}
          {fichas.map((f, i) => (
            <FichaCard
              key={f.id}
              ficha={f}
              index={i}
              onDelete={() => setDeleting(f.id)}
            />
          ))}
        </div>

        {/* Estado vazio */}
        {fichas.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 64, opacity: 0.4 }}>
            <p style={{ fontFamily: "var(--font-display)", fontSize: "3rem", color: "var(--leather)" }}>✦</p>
            <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)", fontSize: "0.9rem" }}>
              O saloon está vazio. Crie seu primeiro pistoleiro.
            </p>
          </div>
        )}
      </div>

      {/* ── Modal de confirmação ───────────────────────── */}
      {deleting && (
        <div className="overlay-west" onClick={() => setDeleting(null)}>
          <div className="modal-west west-card-ornate" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8 }}>Apagar Ficha?</h3>
            <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)", fontSize: "0.9rem", marginBottom: 28 }}>
              Essa ação não pode ser desfeita. O pistoleiro será removido do registro permanentemente.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="btn-primary" onClick={() => deletarFicha(deleting)}>Apagar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ─── Card de ficha individual ───────────────────────────── */
function FichaCard({ ficha, index, onDelete }: { ficha: any; index: number; onDelete: () => void }) {
  const hpPercent = ficha.hp ? Math.round((ficha.hp.atual / ficha.hp.max) * 100) : 100;
  const hpColor   = hpPercent > 60 ? "bar-fill-green" : hpPercent > 30 ? "bar-fill-gold" : "bar-fill-rust";

  return (
    <div
      className="west-card west-card-ornate animate-in"
      style={{
        animationDelay: `${index * 0.06}s`,
        opacity: 0,
        animationFillMode: "forwards",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Topo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", marginBottom: 2 }}>{ficha.nome}</h2>
          <span className="label-west">Nível {ficha.nivel} · {ficha.classe}</span>
        </div>
        <span className="badge-west badge-smoke">{ficha.criadoEm || "—"}</span>
      </div>

      {/* Barra de HP */}
      {ficha.hp && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span className="label-west">Vitalidade</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", color: "var(--gold)" }}>
              {ficha.hp.atual}/{ficha.hp.max}
            </span>
          </div>
          <div className="bar-track">
            <div className={`bar-fill ${hpColor}`} style={{ width: `${hpPercent}%` }} />
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
        <Link
          href={`/fichas/${ficha.id}`}
          className="btn-west"
          style={{ flex: 1, textAlign: "center", padding: "10px 12px", fontSize: "0.75rem" }}
        >
          Ver Ficha →
        </Link>
        <button
          onClick={onDelete}
          style={{
            background: "transparent",
            border: "var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--paper-dim)",
            padding: "10px 12px",
            cursor: "pointer",
            fontSize: "0.8rem",
            transition: "color 0.2s, border-color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#d07050";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--rust)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--paper-dim)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--leather)";
          }}
          title="Apagar ficha"
        >
          ✕
        </button>
      </div>
    </div>
  );
}