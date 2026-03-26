// app/campanhas/page.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── TYPES ──────────────────────────────────────────────── */
type Campaign = {
  id: string;
  name: string;
  description: string;
  players: number;
  session: number;
  lastPlayed: string;
  location: string;
};

/* ─── SAMPLE DATA ────────────────────────────────────────── */
const SAVED_CAMPAIGNS: Campaign[] = [
  { id: "c1", name: "Blood on the Prairie", description: "Uma diligência foi roubada e os rastros levam a Deadwood Canyon.", players: 3, session: 4, lastPlayed: "há 2 dias", location: "Deadwood Canyon" },
  { id: "c2", name: "O Xerife de Silvertown", description: "A cidade precisa de uma nova lei. Alguém vai responder ao chamado?", players: 2, session: 1, lastPlayed: "há 1 semana", location: "Silvertown" },
];

function uid() { 
  return Math.random().toString(36).slice(2, 8); 
}

export default function Campanhas() {
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignDesc, setNewCampaignDesc] = useState("");

  // Salvar nova campanha e redirecionar
  const handleNewCampaign = () => {
    if (!newCampaignName.trim()) return;
    
    const nc: Campaign = { 
      id: uid(), 
      name: newCampaignName, 
      description: newCampaignDesc || "Uma nova aventura começa.", 
      players: 1, 
      session: 1, 
      lastPlayed: "agora", 
      location: "Dust Creek" 
    };
    
    // Salva no localStorage
    const campaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
    campaigns.push(nc);
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
    
    // Redireciona para página do jogo
    window.location.href = `/jogo?id=${nc.id}`;
    setShowNewCampaign(false);
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse 100% 70% at 50% -5%, #2a1a08 0%, #0a0906 55%)",
      overflowX: "hidden",
      fontFamily: "var(--font-body)",
    }}>
      {/* NAV */}
      <nav className="nav-west">
        <a href="/" className="nav-brand">~ The Deadrails ~</a>
        <a href="/" className="nav-link">← Voltar</a>
      </nav>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="divider-west"><span>✦</span></div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.5rem)", color: "var(--gold)", textShadow: "0 0 40px rgba(201,169,110,0.4)" }}>
            Campanhas
          </h1>
          <p style={{ color: "var(--paper-dim)", fontFamily: "var(--font-prose)", fontStyle: "italic", marginTop: 8 }}>
            Cada trilha de pólvora começa com uma faísca.
          </p>
          <div className="divider-west" style={{ marginTop: 24 }}><span>✦</span></div>
        </div>

        {/* Saved campaigns */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "var(--paper-dim)", marginBottom: 20, fontFamily: "var(--font-body)", fontWeight: "normal" }}>
            ✦ Campanhas Salvas
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SAVED_CAMPAIGNS.map(c => (
              <div key={c.id} className="west-card" style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ fontSize: "2rem", opacity: 0.6 }}>🌵</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: "1.1rem" }}>{c.name}</h3>
                    <span className="badge-west badge-gold" style={{ fontSize: "0.6rem" }}>Sessão {c.session}</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--paper-dim)", fontFamily: "var(--font-prose)", fontStyle: "italic", marginBottom: 6 }}>{c.description}</p>
                  <div style={{ display: "flex", gap: 16, fontSize: "0.65rem", color: "var(--paper-dim)", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                    <span>📍 {c.location}</span>
                    <span>👥 {c.players} jogadores</span>
                    <span>⏱ {c.lastPlayed}</span>
                  </div>
                </div>
                <button 
                  className="btn-primary" 
                  onClick={() => {
                    window.location.href = `/jogo?id=${c.id}`;
                  }}
                >
                  Continuar →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* New campaign button */}
        <button 
          className="btn-ghost" 
          style={{ width: "100%", padding: 20, fontSize: "0.85rem", letterSpacing: "0.2em" }}
          onClick={() => setShowNewCampaign(true)}
        >
          ✦ Nova Campanha ✦
        </button>
      </div>

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div className="overlay-west" onClick={() => setShowNewCampaign(false)}>
          <div className="modal-west" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>Nova Campanha</h2>
            <p style={{ color: "var(--paper-dim)", fontSize: "0.8rem", fontStyle: "italic", marginBottom: 24 }}>
              Uma nova história começa aqui.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="label-west" style={{ display: "block", marginBottom: 6 }}>Nome da Campanha</label>
                <input 
                  className="input-west-box" 
                  placeholder="Ex: O Sangue de Red Gulch..." 
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)} 
                />
              </div>
              <div>
                <label className="label-west" style={{ display: "block", marginBottom: 6 }}>Descrição</label>
                <textarea 
                  className="input-west-box" 
                  placeholder="Descreva o cenário inicial..." 
                  value={newCampaignDesc}
                  onChange={e => setNewCampaignDesc(e.target.value)} 
                  style={{ height: 80, resize: "none" }} 
                />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowNewCampaign(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleNewCampaign}>
                  Iniciar →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
