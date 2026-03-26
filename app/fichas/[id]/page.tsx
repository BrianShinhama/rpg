"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ─── Tipos ──────────────────────────────────────────────── */
interface Ficha {
  id: string;
  nome: string;
  nivel: number;
  classe: string;
  hp: { atual: number; max: number };
  criadoEm?: string;
  atributos: { corpo: number; destreza: number; mente: number; presenca: number };
  fortuna: number;
  armas: Arma[];
  habilidades: Habilidade[];
  anotacoes: string;
}

interface Arma {
  id: string;
  nome: string;
  dano: string;
  atributo: string;
  alcance: string;
}

interface Habilidade {
  id: string;
  nome: string;
  descricao: string;
}

interface RolagemResult {
  atributo: string;
  dado: number;
  bonus: number;
  total: number;
}

/* ─── Defaults ───────────────────────────────────────────── */
const FICHA_DEFAULT: Ficha = {
  id: "",
  nome: "Pistoleiro Desconhecido",
  nivel: 1,
  classe: "Forasteiro",
  hp: { atual: 20, max: 20 },
  atributos: { corpo: 2, destreza: 2, mente: 2, presenca: 2 },
  fortuna: 5,
  armas: [
    { id: "1", nome: "Revólver Colt .45", dano: "1d10", atributo: "Destreza", alcance: "Médio" },
    { id: "2", nome: "Rifle Winchester",  dano: "2d10", atributo: "Destreza", alcance: "Longo" },
  ],
  habilidades: [
    { id: "1", nome: "Mira Certeira", descricao: "Re-role um dado de ataque por sessão." },
  ],
  anotacoes: "",
};

const ATTR_LABELS: Record<string, string> = {
  corpo:    "Corpo",
  destreza: "Destreza",
  mente:    "Mente",
  presenca: "Presença",
};

const ATTR_ICONS: Record<string, string> = {
  corpo:    "✊",
  destreza: "⚡",
  mente:    "☽",
  presenca: "✦",
};

/* ─── Componente Principal ───────────────────────────────── */
export default function FichaDetalhada({ params }: { params: { id: string } }) {
  const [ficha, setFicha]           = useState<Ficha>({ ...FICHA_DEFAULT, id: params.id });
  const [mounted, setMounted]       = useState(false);
  const [rolagem, setRolagem]       = useState<RolagemResult | null>(null);
  const [rolagemAnim, setRolagemAnim] = useState(false);
  const [novaArma, setNovaArma]     = useState(false);
  const [novaHab, setNovaHab]       = useState(false);
  const [armaForm, setArmaForm]     = useState({ nome: "", dano: "", atributo: "Destreza", alcance: "Médio" });
  const [habForm, setHabForm]       = useState({ nome: "", descricao: "" });
  const [tab, setTab]               = useState<"atributos" | "arsenal" | "habilidades" | "notas">("atributos");
  const rolagemRef                  = useRef<HTMLDivElement>(null);

  /* Carrega do localStorage */
  useEffect(() => {
    setMounted(true);
    const salvas = localStorage.getItem("fichas_west");
    if (salvas) {
      const lista: Ficha[] = JSON.parse(salvas);
      const found = lista.find((f) => f.id === params.id);
      if (found) {
        setFicha({ ...FICHA_DEFAULT, ...found });
      }
    }
  }, [params.id]);

  /* Salva no localStorage sempre que ficha muda */
  useEffect(() => {
    if (!mounted) return;
    const salvas = localStorage.getItem("fichas_west");
    const lista: Ficha[] = salvas ? JSON.parse(salvas) : [];
    const idx = lista.findIndex((f) => f.id === params.id);
    if (idx >= 0) lista[idx] = ficha; else lista.push(ficha);
    localStorage.setItem("fichas_west", JSON.stringify(lista));
  }, [ficha, mounted]);

  /* ── Helpers ─────────────────────────────────────────── */
  const updateAttr = (key: keyof Ficha["atributos"], delta: number) => {
    setFicha((f) => ({
      ...f,
      atributos: { ...f.atributos, [key]: Math.max(1, Math.min(10, f.atributos[key] + delta)) },
    }));
  };

  const updateHp = (delta: number) => {
    setFicha((f) => ({
      ...f,
      hp: { ...f.hp, atual: Math.max(0, Math.min(f.hp.max, f.hp.atual + delta)) },
    }));
  };

  const rolarDado = (atributo: string, valor: number) => {
    const dado = Math.floor(Math.random() * 10) + 1;
    setRolagem({ atributo, dado, bonus: valor, total: dado + valor });
    setRolagemAnim(false);
    setTimeout(() => setRolagemAnim(true), 10);
    setTimeout(() => rolagemRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  const adicionarArma = () => {
    if (!armaForm.nome) return;
    const nova: Arma = { id: Date.now().toString(), ...armaForm };
    setFicha((f) => ({ ...f, armas: [...f.armas, nova] }));
    setArmaForm({ nome: "", dano: "", atributo: "Destreza", alcance: "Médio" });
    setNovaArma(false);
  };

  const removerArma = (id: string) =>
    setFicha((f) => ({ ...f, armas: f.armas.filter((a) => a.id !== id) }));

  const adicionarHab = () => {
    if (!habForm.nome) return;
    const nova: Habilidade = { id: Date.now().toString(), ...habForm };
    setFicha((f) => ({ ...f, habilidades: [...f.habilidades, nova] }));
    setHabForm({ nome: "", descricao: "" });
    setNovaHab(false);
  };

  const removerHab = (id: string) =>
    setFicha((f) => ({ ...f, habilidades: f.habilidades.filter((h) => h.id !== id) }));

  const hpPercent  = Math.round((ficha.hp.atual / ficha.hp.max) * 100);
  const hpBarClass = hpPercent > 60 ? "bar-fill-green" : hpPercent > 30 ? "bar-fill-gold" : "bar-fill-rust";

  if (!mounted) return null;

  /* ── Render ──────────────────────────────────────────── */
  return (
    <main
      style={{
        minHeight: "calc(100vh - 56px)",
        background: "radial-gradient(ellipse 80% 50% at 50% 0%, #1a1005 0%, #0a0906 60%)",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 24px 60px" }}>

        {/* ── Header ──────────────────────────────────── */}
        <header style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <Link href="/fichas" style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--gold-dim)", marginBottom: 10, display: "inline-flex", alignItems: "center", gap: 6 }}>
                ← Saloon
              </Link>
              {/* Nome editável */}
              <input
                value={ficha.nome}
                onChange={(e) => setFicha((f) => ({ ...f, nome: e.target.value }))}
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
                  color: "var(--gold)",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  width: "100%",
                  lineHeight: 1.1,
                  marginBottom: 6,
                }}
              />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge-west badge-gold">Nível {ficha.nivel}</span>
                <span className="badge-west badge-smoke">{ficha.classe}</span>
              </div>
            </div>

            {/* HP + Fortuna */}
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <HpPanel ficha={ficha} hpPercent={hpPercent} hpBarClass={hpBarClass} updateHp={updateHp} setFicha={setFicha} />
              <div className="stat-box" style={{ minWidth: 80 }}>
                <span className="stat-value" style={{ fontSize: "1.6rem" }}>{ficha.fortuna}</span>
                <span className="stat-label">Fortuna</span>
                <div style={{ display: "flex", gap: 4, marginTop: 8, justifyContent: "center" }}>
                  <AdjBtn onClick={() => setFicha((f) => ({ ...f, fortuna: Math.max(0, f.fortuna - 1) }))}>−</AdjBtn>
                  <AdjBtn onClick={() => setFicha((f) => ({ ...f, fortuna: f.fortuna + 1 }))}>+</AdjBtn>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 20, height: 1, background: "linear-gradient(90deg, var(--leather), transparent)" }} />
        </header>

        {/* ── Tabs ────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 2, marginBottom: 28, borderBottom: "var(--border)" }}>
          {(["atributos", "arsenal", "habilidades", "notas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                padding: "10px 18px",
                background: "transparent",
                border: "none",
                borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent",
                color: tab === t ? "var(--gold)" : "var(--paper-dim)",
                cursor: "pointer",
                transition: "color 0.2s",
                marginBottom: -1,
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Conteúdo por Tab ─────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* TAB: ATRIBUTOS */}
          {tab === "atributos" && (
            <>
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                {(Object.keys(ficha.atributos) as (keyof Ficha["atributos"])[]).map((key) => {
                  const val = ficha.atributos[key];
                  return (
                    <div key={key} className="west-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: "1.6rem", width: 36, textAlign: "center", color: "var(--gold-dim)", flexShrink: 0 }}>
                        {ATTR_ICONS[key]}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span className="label-west" style={{ display: "block", marginBottom: 2 }}>{ATTR_LABELS[key]}</span>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--gold)", lineHeight: 1 }}>{val}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <AdjBtn onClick={() => updateAttr(key, 1)}>+</AdjBtn>
                        <AdjBtn onClick={() => updateAttr(key, -1)}>−</AdjBtn>
                      </div>
                      <button
                        onClick={() => rolarDado(ATTR_LABELS[key], val)}
                        title="Rolar D10"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: "0.75rem",
                          background: "var(--smoke)",
                          border: "var(--border-gold)",
                          borderRadius: "var(--radius)",
                          color: "var(--gold)",
                          padding: "6px 10px",
                          cursor: "pointer",
                          transition: "background 0.2s",
                          letterSpacing: "0.08em",
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(201,169,110,0.12)")}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "var(--smoke)")}
                      >
                        D10
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Resultado de Rolagem */}
              <div ref={rolagemRef} style={{ gridColumn: "1 / -1" }}>
                {rolagem && (
                  <div
                    className="west-card west-card-ornate"
                    style={{
                      textAlign: "center",
                      borderColor: "var(--gold-dim)",
                      animation: rolagemAnim ? "fadeIn 0.35s ease forwards" : "none",
                    }}
                  >
                    <span className="label-west" style={{ display: "block", marginBottom: 8 }}>
                      Rolagem de {rolagem.atributo}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 8 }}>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "3.5rem", color: "var(--gold)", lineHeight: 1 }}>{rolagem.total}</span>
                        <span className="label-west" style={{ display: "block" }}>Total</span>
                      </div>
                      <span style={{ color: "var(--paper-dim)", fontSize: "0.9rem" }}>=</span>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--paper-dim)", lineHeight: 1 }}>{rolagem.dado}</span>
                        <span className="label-west" style={{ display: "block" }}>Dado</span>
                      </div>
                      <span style={{ color: "var(--paper-dim)", fontSize: "0.9rem" }}>+</span>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--paper-dim)", lineHeight: 1 }}>{rolagem.bonus}</span>
                        <span className="label-west" style={{ display: "block" }}>Bônus</span>
                      </div>
                    </div>
                    {rolagem.dado === 10 && <span className="badge-west badge-gold" style={{ fontSize: "0.7rem" }}>✦ Acerto Crítico!</span>}
                    {rolagem.dado === 1  && <span className="badge-west badge-rust" style={{ fontSize: "0.7rem" }}>☠ Falha Crítica!</span>}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB: ARSENAL */}
          {tab === "arsenal" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <table className="table-west" style={{ marginBottom: 20 }}>
                <thead>
                  <tr>
                    <th>Arma</th>
                    <th>Dano</th>
                    <th>Atributo</th>
                    <th>Alcance</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {ficha.armas.map((a) => (
                    <tr key={a.id}>
                      <td style={{ color: "var(--gold)", fontFamily: "var(--font-body)" }}>{a.nome}</td>
                      <td>{a.dano}</td>
                      <td><span className="badge-west badge-smoke">{a.atributo}</span></td>
                      <td style={{ color: "var(--paper-dim)" }}>{a.alcance}</td>
                      <td>
                        <button onClick={() => removerArma(a.id)} style={{ background: "none", border: "none", color: "var(--paper-dim)", cursor: "pointer", fontSize: "0.8rem" }}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!novaArma ? (
                <button className="btn-ghost" style={{ fontSize: "0.75rem" }} onClick={() => setNovaArma(true)}>
                  + Adicionar Arma
                </button>
              ) : (
                <div className="west-card" style={{ border: "1px dashed var(--leather)" }}>
                  <span className="label-west" style={{ display: "block", marginBottom: 14 }}>Nova Arma</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label className="label-west" style={{ display: "block", marginBottom: 4 }}>Nome</label>
                      <input className="input-west" placeholder="Ex: Espingarda" value={armaForm.nome} onChange={(e) => setArmaForm((f) => ({ ...f, nome: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-west" style={{ display: "block", marginBottom: 4 }}>Dano</label>
                      <input className="input-west" placeholder="Ex: 2d6" value={armaForm.dano} onChange={(e) => setArmaForm((f) => ({ ...f, dano: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label-west" style={{ display: "block", marginBottom: 4 }}>Atributo</label>
                      <select className="input-west-box" value={armaForm.atributo} onChange={(e) => setArmaForm((f) => ({ ...f, atributo: e.target.value }))}>
                        <option>Corpo</option><option>Destreza</option><option>Mente</option><option>Presença</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-west" style={{ display: "block", marginBottom: 4 }}>Alcance</label>
                      <select className="input-west-box" value={armaForm.alcance} onChange={(e) => setArmaForm((f) => ({ ...f, alcance: e.target.value }))}>
                        <option>Curto</option><option>Médio</option><option>Longo</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-primary" onClick={adicionarArma} style={{ fontSize: "0.8rem", padding: "8px 18px" }}>Salvar</button>
                    <button className="btn-ghost" onClick={() => setNovaArma(false)} style={{ fontSize: "0.8rem", padding: "8px 18px" }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: HABILIDADES */}
          {tab === "habilidades" && (
            <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 14 }}>
              {ficha.habilidades.map((h) => (
                <div key={h.id} className="west-card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--gold)", fontSize: "1rem", marginTop: 2, flexShrink: 0 }}>✦</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--gold)", fontSize: "0.95rem", marginBottom: 4 }}>{h.nome}</p>
                    <p style={{ fontFamily: "var(--font-prose)", fontStyle: "italic", color: "var(--paper-dim)", fontSize: "0.85rem" }}>{h.descricao}</p>
                  </div>
                  <button onClick={() => removerHab(h.id)} style={{ background: "none", border: "none", color: "var(--paper-dim)", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 }}>✕</button>
                </div>
              ))}

              {!novaHab ? (
                <button className="btn-ghost" style={{ fontSize: "0.75rem", alignSelf: "flex-start" }} onClick={() => setNovaHab(true)}>
                  + Adicionar Habilidade
                </button>
              ) : (
                <div className="west-card" style={{ border: "1px dashed var(--leather)" }}>
                  <span className="label-west" style={{ display: "block", marginBottom: 14 }}>Nova Habilidade</span>
                  <div style={{ marginBottom: 12 }}>
                    <label className="label-west" style={{ display: "block", marginBottom: 4 }}>Nome</label>
                    <input className="input-west" placeholder="Ex: Mira Certeira" value={habForm.nome} onChange={(e) => setHabForm((f) => ({ ...f, nome: e.target.value }))} />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <label className="label-west" style={{ display: "block", marginBottom: 4 }}>Descrição</label>
                    <textarea className="input-west-box" placeholder="Descreva o efeito da habilidade..." rows={3} value={habForm.descricao} onChange={(e) => setHabForm((f) => ({ ...f, descricao: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn-primary" onClick={adicionarHab} style={{ fontSize: "0.8rem", padding: "8px 18px" }}>Salvar</button>
                    <button className="btn-ghost" onClick={() => setNovaHab(false)} style={{ fontSize: "0.8rem", padding: "8px 18px" }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: NOTAS */}
          {tab === "notas" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="west-card" style={{ background: "rgba(22,18,16,0.6)" }}>
                <span className="label-west" style={{ display: "block", marginBottom: 12 }}>Anotações do Personagem</span>
                <textarea
                  className="input-west-box"
                  placeholder="Histórico, segredos, relacionamentos, itens especiais..."
                  rows={14}
                  value={ficha.anotacoes}
                  onChange={(e) => setFicha((f) => ({ ...f, anotacoes: e.target.value }))}
                  style={{ fontFamily: "var(--font-prose)", fontSize: "0.9rem", lineHeight: 1.7 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* ─── Painel de HP ───────────────────────────────────────── */
function HpPanel({ ficha, hpPercent, hpBarClass, updateHp, setFicha }: any) {
  return (
    <div className="west-card" style={{ minWidth: 180 }}>
      <span className="label-west" style={{ display: "block", marginBottom: 8 }}>Vitalidade</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: "2rem", color: "var(--gold)", lineHeight: 1 }}>{ficha.hp.atual}</span>
        <span style={{ color: "var(--paper-dim)", fontSize: "0.85rem" }}>/ {ficha.hp.max}</span>
      </div>
      <div className="bar-track" style={{ marginBottom: 12 }}>
        <div className={`bar-fill ${hpBarClass}`} style={{ width: `${hpPercent}%` }} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <button className="btn-primary" onClick={() => updateHp(-1)} style={{ flex: 1, padding: "6px", fontSize: "1rem" }}>−</button>
        <button className="btn-primary" onClick={() => updateHp(1)}  style={{ flex: 1, padding: "6px", fontSize: "1rem" }}>+</button>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="number"
          className="input-west-box"
          style={{ width: "50%", textAlign: "center", fontSize: "0.8rem", padding: "4px 6px" }}
          placeholder="Máx"
          defaultValue={ficha.hp.max}
          onChange={(e) => setFicha((f: Ficha) => ({ ...f, hp: { ...f.hp, max: parseInt(e.target.value) || f.hp.max } }))}
        />
        <button
          className="btn-ghost"
          style={{ flex: 1, fontSize: "0.65rem", padding: "4px 6px" }}
          onClick={() => setFicha((f: Ficha) => ({ ...f, hp: { ...f.hp, atual: f.hp.max } }))}
        >
          Full
        </button>
      </div>
    </div>
  );
}

/* ─── Botão de ajuste +/- ────────────────────────────────── */
function AdjBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 26, height: 26,
        background: "var(--smoke)",
        border: "var(--border)",
        borderRadius: "var(--radius)",
        color: "var(--paper-dim)",
        cursor: "pointer",
        fontSize: "0.9rem",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "border-color 0.2s, color 0.2s",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--gold-dim)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--gold)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--leather)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--paper-dim)"; }}
    >
      {children}
    </button>
  );
}   