"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/* ─── Interfaces ─────────────────────────────────────────── */
interface ModuleProps {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  badgeClass: string;
  disabled?: boolean;
}

/* ─── Dados para os cards de módulo ─────────────────────── */
const MODULES: ModuleProps[] = [
  {
    href: "/fichas",
    icon: "✦",
    title: "Saloon",
    subtitle: "Fichas de Personagem",
    description: "Crie, edite e gerencie os pistoleiros da sua mesa. Atributos, inventário e perícias.",
    badge: "Fichas",
    badgeClass: "badge-gold",
  },
  {
    href: "/sessao",
    icon: "⚔",
    title: "Duelo",
    subtitle: "Sessão Ativa",
    description: "Inicie uma sessão, acompanhe iniciativa, HP e notas de campanha em tempo real.",
    badge: "Ao vivo",
    badgeClass: "badge-rust",
  },
  // --- NOVO MÓDULO DO JOGO ---
  {
    href: "/sobrevivencia", // Certifique-se de que o jogo esteja em app/sobrevivencia/page.tsx
    icon: "🤠",
    title: "Sobrevivência",
    subtitle: "Minigame de Duelo",
    description: "Treine sua mira contra bandidos, compre equipamentos e sobreviva ao deserto.",
    badge: "Jogo",
    badgeClass: "badge-rust",
  },
  {
    href: "/campanhas",
    icon: "☾",
    title: "Campanhas",
    subtitle: "Regras & Tabelas",
    description: "Consulte suas campanhas ativas, ou simplesmente crie uma nova história.",
    badge: "Sessões",
    badgeClass: "badge-gold",
  },
];

const STATS = [
  { value: "D10", label: "Sistema base" },
  { value: "6", label: "Atributos" },
  { value: "Socket", label: "Multiplayer" },
];

/* ─── Estilos Globais Injetados ───────────────────────────── */
const GLOBAL_STYLES = `
  :root {
    --gold: #c9a96e;
    --paper: #d4b896;
    --leather: #3d2b1f;
    --bg-card: rgba(20, 15, 10, 0.8);
    --text-muted: #7a5c3a;
    --rust: #8b3a2b;
  }

  @keyframes dust-drift {
    0% { transform: translate(0, 0); opacity: 0; }
    50% { opacity: 0.4; }
    100% { transform: translate(100px, -100px); opacity: 0; }
  }

  .badge-gold { background: var(--gold); color: #000; }
  .badge-rust { background: var(--rust); color: #fff; }
  
  .west-card {
    transition: transform 0.3s ease, border-color 0.3s ease;
  }
  .west-card:hover {
    transform: translateY(-5px);
    border-color: var(--gold) !important;
  }
`;

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [dustParticles, setDustParticles] = useState<any[]>([]);

  useEffect(() => {
    const particles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 5,
      dur: Math.random() * 10 + 10,
    }));
    setDustParticles(particles);
    setMounted(true);
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0a0906",
        backgroundImage: 
          "radial-gradient(ellipse 100% 70% at 50% -5%, #2a1a08 0%, #0a0906 55%), " +
          "radial-gradient(ellipse 60% 40% at 80% 100%, #1a0d05 0%, transparent 60%)",
        overflowX: "hidden",
        position: "relative",
        color: "var(--paper)"
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* ── Poeira do Deserto ────────────────────────────────── */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {mounted && dustParticles.map((d) => (
          <span
            key={d.id}
            style={{
              position: "absolute",
              left: `${d.x}%`,
              top: `${d.y}%`,
              width: d.size,
              height: d.size,
              borderRadius: "50%",
              background: "rgba(201,169,110,0.15)",
              animation: `dust-drift ${d.dur}s linear ${d.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <HorzLine />
          <span style={{ color: "var(--gold)", opacity: 0.6, fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase" }}>
            The Deadrails Management System
          </span>
          <HorzLine />
        </div>

        <h1
          style={{ 
            fontFamily: "'Rye', serif", // Certifique-se de importar essa fonte no seu layout.tsx
            fontSize: "clamp(2.5rem, 8vw, 6rem)", 
            marginBottom: 16, 
            color: "var(--gold)",
            textShadow: "0 4px 20px rgba(0,0,0,0.5)"
          }}
        >
          THE DEADRAILS
        </h1>

        <p
          style={{
            fontSize: "0.8rem",
            letterSpacing: "0.5em",
            textTransform: "uppercase",
            color: "var(--paper)",
            opacity: 0.8,
            marginBottom: 40,
          }}
        >
          ✦&nbsp;&nbsp;Justiça ou Chumbo&nbsp;&nbsp;✦
        </p>

        {/* Stats Rápidos */}
        <div
          style={{
            display: "flex",
            gap: 1,
            marginBottom: 60,
            border: "1px solid var(--leather)",
            background: "var(--leather)",
            borderRadius: "4px",
            overflow: "hidden"
          }}
        >
          {STATS.map((s, i) => (
            <div key={i} style={{ padding: "12px 24px", background: "#0a0906", minWidth: 110 }}>
              <span style={{ fontSize: "1.4rem", color: "var(--gold)", display: "block", fontWeight: "bold" }}>{s.value}</span>
              <span style={{ fontSize: "0.55rem", textTransform: "uppercase", color: "var(--text-muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Grid de Módulos */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 20,
            width: "100%",
            maxWidth: 1000,
          }}
        >
          {MODULES.map((m) => (
            <ModuleCard key={m.href} {...m} />
          ))}
        </div>
      </section>

      <footer
        style={{
          textAlign: "center",
          padding: "40px",
          fontSize: "0.6rem",
          letterSpacing: "0.2em",
          color: "var(--text-muted)",
          textTransform: "uppercase"
        }}
      >
        Deadrails v1.2 | Desenvolvido para Pistoleiros | Socket.io Ready
      </footer>
    </main>
  );
}

function ModuleCard({ href, icon, title, subtitle, description, badge, badgeClass, disabled = false }: ModuleProps) {
  return (
    <Link
      href={disabled ? "#" : href}
      style={{
        display: "block",
        textDecoration: "none",
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <div className="west-card" style={{ 
        height: "100%", 
        textAlign: "left", 
        padding: '28px', 
        border: '1px solid #2a1a08', 
        background: 'rgba(15, 10, 5, 0.6)',
        backdropFilter: 'blur(10px)',
        borderRadius: '2px'
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontSize: "1.8rem", color: "var(--gold)" }}>{icon}</span>
          <span className={`badge-west ${badgeClass}`} style={{ 
            fontSize: '9px', 
            padding: '3px 10px', 
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 'bold'
          }}>{badge}</span>
        </div>

        <h3 style={{ fontSize: "1.4rem", marginBottom: 4, color: 'var(--gold)', fontFamily: "'Rye', serif" }}>{title}</h3>
        <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 16 }}>
          {subtitle}
        </p>

        <p style={{ fontSize: "0.85rem", color: "rgba(212, 184, 150, 0.7)", lineHeight: 1.6 }}>
          {description}
        </p>

        <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 8, fontSize: "0.7rem", color: "var(--gold)", fontWeight: 'bold' }}>
          <span>PARTIR</span>
          <span>→</span>
        </div>
      </div>
    </Link>
  );
}

function HorzLine() {
  return <div style={{ flex: 1, maxWidth: 60, height: 1, background: "linear-gradient(90deg, transparent, #c9a96e, transparent)", opacity: 0.3 }} />;
}