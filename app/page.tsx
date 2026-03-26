"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [nome, setNome] = useState("");
  const router = useRouter();

  const entrar = () => {
    if (!nome.trim()) return;
    localStorage.setItem("playerName", nome.trim());
    router.push("/lobby");
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0a0906",
      backgroundImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #2a1a08 0%, #0a0906 65%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-body)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Grain overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
        opacity: 0.5,
      }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 24px", maxWidth: 560, width: "100%" }}>
        {/* Decorative line top */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, justifyContent: "center" }}>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #c9a96e)" }} />
          <span style={{ color: "#8a6e44", fontSize: "0.65rem", letterSpacing: "0.3em", textTransform: "uppercase" }}>The Deadrails</span>
          <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, #c9a96e, transparent)" }} />
        </div>

        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(3rem, 10vw, 6.5rem)",
          color: "#c9a96e",
          lineHeight: 1,
          marginBottom: 8,
          textShadow: "0 0 60px rgba(201,169,110,0.3), 0 4px 20px rgba(0,0,0,0.8)",
          letterSpacing: "0.05em",
        }}>
          DEADRAILS
        </h1>

        <p style={{
          fontFamily: "var(--font-prose)",
          fontStyle: "italic",
          color: "#8a7d6e",
          fontSize: "1rem",
          marginBottom: 56,
          letterSpacing: "0.08em",
        }}>
          Sobreviva ou vire pó no deserto.
        </p>

        {/* Input + button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
          <input
            className="input-west-box"
            style={{ maxWidth: 360, width: "100%", textAlign: "center", fontSize: "1rem", padding: "14px 20px", letterSpacing: "0.05em" }}
            placeholder="Seu nome, pistoleiro..."
            value={nome}
            onChange={e => setNome(e.target.value)}
            onKeyDown={e => e.key === "Enter" && entrar()}
            maxLength={20}
            autoFocus
          />
          <button
            className="btn-primary"
            style={{ maxWidth: 360, width: "100%", fontSize: "0.9rem", padding: "14px", letterSpacing: "0.25em", opacity: nome.trim() ? 1 : 0.4 }}
            onClick={entrar}
            disabled={!nome.trim()}
          >
            ENTRAR NO SALOON
          </button>
        </div>

        {/* Bottom ornament */}
        <div style={{ marginTop: 64, display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, transparent, #3d2b1f)" }} />
          <span style={{ color: "#3d2b1f", fontSize: "1.2rem" }}>✦</span>
          <div style={{ width: 40, height: 1, background: "linear-gradient(90deg, #3d2b1f, transparent)" }} />
        </div>
        <p style={{ color: "#3d2b1f", fontSize: "0.6rem", letterSpacing: "0.2em", marginTop: 12, textTransform: "uppercase" }}>
          Multijogador · Até 4 pistoleiros
        </p>
      </div>
    </main>
  );
}