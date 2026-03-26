"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

/* ─── TYPES ─────────────────────────────────────────────── */
interface Weapon {
  id: string;
  name: string;
  damage: [number, number]; // min, max
  cost: number;
  icon: string;
  desc: string;
  accuracy: number; // 0-100
}

interface Heal {
  id: string;
  name: string;
  hp: number;
  cost: number;
  icon: string;
}

interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  damage: [number, number];
  icon: string;
  isBoss: boolean;
  reward: number;
}

interface PlayerState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  gold: number;
  weapon: Weapon | null;
  ready: boolean;
  alive: boolean;
}

type Phase = "shop" | "combat" | "result";

/* ─── DATA ───────────────────────────────────────────────── */
const WEAPONS: Weapon[] = [
  { id: "fist", name: "Soco Inglês", damage: [3, 7], cost: 0, icon: "✊", desc: "De graça. Dói pouco.", accuracy: 90 },
  { id: "derringer", name: "Derringer", damage: [8, 14], cost: 30, icon: "🔫", desc: "Pequena. Esconde bem.", accuracy: 75 },
  { id: "colt", name: "Colt .45", damage: [15, 25], cost: 70, icon: "🔫", desc: "O clássico do Oeste.", accuracy: 80 },
  { id: "shotgun", name: "Espingarda", damage: [25, 45], cost: 150, icon: "💥", desc: "Curto alcance, alto dano.", accuracy: 65 },
  { id: "winchester", name: "Winchester", damage: [30, 50], cost: 220, icon: "🎯", desc: "Precisão de longo alcance.", accuracy: 88 },
  { id: "revolver", name: "Remington", damage: [20, 38], cost: 130, icon: "⚡", desc: "Seis tiros, rápido.", accuracy: 82 },
];

const HEALS: Heal[] = [
  { id: "herb", name: "Erva do Deserto", hp: 20, cost: 25, icon: "🌿" },
  { id: "tonic", name: "Tônico do Doutor", hp: 40, cost: 50, icon: "🧪" },
  { id: "whiskey", name: "Whiskey Puro", hp: 65, cost: 80, icon: "🥃" },
];

const ROUND_ENEMIES: { minions: Omit<Enemy, "id">[]; boss: Omit<Enemy, "id"> }[] = [
  {
    minions: [
      { name: "Bêbado Armado", hp: 30, maxHp: 30, damage: [5, 12], icon: "🍺", isBoss: false, reward: 20 },
      { name: "Ladrão de Galinha", hp: 25, maxHp: 25, damage: [4, 10], icon: "🐔", isBoss: false, reward: 15 },
    ],
    boss: { name: "Black Pete", hp: 80, maxHp: 80, damage: [12, 22], icon: "🤠", isBoss: true, reward: 80 },
  },
  {
    minions: [
      { name: "Pistoleiro Recluta", hp: 50, maxHp: 50, damage: [10, 18], icon: "👤", isBoss: false, reward: 30 },
      { name: "Pistoleiro Recluta", hp: 50, maxHp: 50, damage: [10, 18], icon: "👤", isBoss: false, reward: 30 },
    ],
    boss: { name: "Mad Dog McGee", hp: 130, maxHp: 130, damage: [18, 30], icon: "🐕", isBoss: true, reward: 120 },
  },
  {
    minions: [
      { name: "Bandoleiro", hp: 70, maxHp: 70, damage: [14, 24], icon: "💀", isBoss: false, reward: 40 },
      { name: "Bandoleiro", hp: 70, maxHp: 70, damage: [14, 24], icon: "💀", isBoss: false, reward: 40 },
      { name: "Franco-Atirador", hp: 45, maxHp: 45, damage: [20, 35], icon: "🎯", isBoss: false, reward: 50 },
    ],
    boss: { name: "Diamondback Dillo", hp: 200, maxHp: 200, damage: [25, 42], icon: "🐊", isBoss: true, reward: 180 },
  },
  {
    minions: [
      { name: "Guarda da Gangue", hp: 100, maxHp: 100, damage: [18, 30], icon: "🔫", isBoss: false, reward: 60 },
      { name: "Guarda da Gangue", hp: 100, maxHp: 100, damage: [18, 30], icon: "🔫", isBoss: false, reward: 60 },
    ],
    boss: { name: "El Cuervo Rojo", hp: 300, maxHp: 300, damage: [32, 55], icon: "🦅", isBoss: true, reward: 250 },
  },
  {
    minions: [
      { name: "Assassino de Elite", hp: 140, maxHp: 140, damage: [25, 42], icon: "⚔️", isBoss: false, reward: 80 },
      { name: "Assassino de Elite", hp: 140, maxHp: 140, damage: [25, 42], icon: "⚔️", isBoss: false, reward: 80 },
    ],
    boss: { name: "General Calamity", hp: 500, maxHp: 500, damage: [45, 75], icon: "💀", isBoss: true, reward: 400 },
  },
];

function roll(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeEnemy(template: Omit<Enemy, "id">): Enemy {
  return { ...template, id: Math.random().toString(36).slice(2) };
}

/* ─── COMPONENT ──────────────────────────────────────────── */
export default function Game() {
  const router = useRouter();

  // Game state
  const [round, setRound] = useState(0); // 0-4
  const [phase, setPhase] = useState<Phase>("shop");
  const [combatPhase, setCombatPhase] = useState<"minions" | "boss">("minions");

  // Player
  const [myPlayer, setMyPlayer] = useState<PlayerState>({
    id: "local",
    name: "",
    hp: 100,
    maxHp: 100,
    gold: 60,
    weapon: null,
    ready: false,
    alive: true,
  });

  // Enemies
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [boss, setBoss] = useState<Enemy | null>(null);

  // Combat log
  const [logs, setLogs] = useState<string[]>([]);
  const [combatActive, setCombatActive] = useState(false);
  const [gameOver, setGameOver] = useState<"win" | "lose" | null>(null);
  const [showWeapons, setShowWeapons] = useState(true);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = localStorage.getItem("playerName") || "Pistoleiro";
    setMyPlayer(prev => ({ ...prev, name }));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-30), msg]);

  // Start combat for current round
  const startCombat = () => {
    const roundData = ROUND_ENEMIES[round];
    const newEnemies = roundData.minions.map(makeEnemy);
    const newBoss = makeEnemy(roundData.boss);
    setEnemies(newEnemies);
    setBoss(newBoss);
    setCombatPhase("minions");
    setPhase("combat");
    setCombatActive(true);
    setLogs([]);
    addLog(`⚔️ Rodada ${round + 1} começou! Derrote os capangas!`);
    if (!myPlayer.weapon) {
      setMyPlayer(prev => ({ ...prev, weapon: WEAPONS[0] }));
    }
  };

  // Player attacks a specific enemy
  const attackEnemy = useCallback((targetId: string) => {
    if (!combatActive || !myPlayer.alive) return;
    const w = myPlayer.weapon || WEAPONS[0];
    const hit = Math.random() * 100 < w.accuracy;

    if (!hit) {
      addLog(`💨 ${myPlayer.name} errou o tiro!`);
    } else {
      const dmg = roll(w.damage[0], w.damage[1]);
      if (combatPhase === "minions") {
        setEnemies(prev => {
          const updated = prev.map(e => e.id === targetId ? { ...e, hp: Math.max(0, e.hp - dmg) } : e);
          const alive = updated.filter(e => e.hp > 0);
          const killed = updated.filter(e => e.hp <= 0 && prev.find(p => p.id === e.id)!.hp > 0);
          killed.forEach(e => {
            addLog(`💀 ${e.name} foi derrotado! +$${e.reward}`);
            setMyPlayer(p => ({ ...p, gold: p.gold + e.reward }));
          });
          if (alive.length === 0) {
            setTimeout(() => {
              addLog(`🔥 Capangas eliminados! O boss aparece: ${ROUND_ENEMIES[round].boss.name}!`);
              setCombatPhase("boss");
            }, 600);
          }
          return updated;
        });
        addLog(`🎯 ${myPlayer.name} acertou ${enemies.find(e => e.id === targetId)?.name} por ${dmg} de dano!`);
      } else if (boss) {
        const newHp = Math.max(0, boss.hp - dmg);
        addLog(`🎯 ${myPlayer.name} acertou ${boss.name} por ${dmg} de dano! (${newHp}/${boss.maxHp} HP)`);
        setBoss(prev => prev ? { ...prev, hp: newHp } : null);
        if (newHp <= 0) {
          setTimeout(() => {
            addLog(`🏆 ${boss.name} foi derrotado! +$${boss.reward}`);
            setMyPlayer(p => ({ ...p, gold: p.gold + boss.reward }));
            setCombatActive(false);
            if (round >= 4) {
              setGameOver("win");
            } else {
              setTimeout(() => {
                setRound(r => r + 1);
                setPhase("shop");
              }, 1500);
            }
          }, 500);
        }
      }
    }

    // Enemy counter-attack
    setTimeout(() => {
      if (!myPlayer.alive) return;
      let totalDmg = 0;
      const attackers: Enemy[] = combatPhase === "minions"
        ? enemies.filter(e => e.hp > 0)
        : (boss && boss.hp > 0 ? [boss] : []);

      attackers.forEach(e => {
        if (Math.random() > 0.3) {
          const d = roll(e.damage[0], e.damage[1]);
          totalDmg += d;
          addLog(`💢 ${e.name} atacou ${myPlayer.name} por ${d} de dano!`);
        } else {
          addLog(`🌵 ${e.name} errou o ataque.`);
        }
      });

      setMyPlayer(prev => {
        const newHp = Math.max(0, prev.hp - totalDmg);
        if (newHp <= 0) {
          setCombatActive(false);
          setGameOver("lose");
          addLog(`💀 ${prev.name} caiu no pó do deserto...`);
        }
        return { ...prev, hp: newHp };
      });
    }, 700);
  }, [combatActive, myPlayer, combatPhase, enemies, boss, round]);

  const buyWeapon = (w: Weapon) => {
    if (myPlayer.gold < w.cost) return;
    setMyPlayer(prev => ({ ...prev, gold: prev.gold - w.cost, weapon: w }));
  };

  const buyHeal = (h: Heal) => {
    if (myPlayer.gold < h.cost || myPlayer.hp >= myPlayer.maxHp) return;
    setMyPlayer(prev => ({ ...prev, gold: prev.gold - h.cost, hp: Math.min(prev.maxHp, prev.hp + h.hp) }));
    addLog(`💊 ${myPlayer.name} usou ${h.name} e recuperou ${h.hp} HP.`);
  };

  const hpPct = Math.round((myPlayer.hp / myPlayer.maxHp) * 100);
  const hpColor = hpPct > 60 ? "#3a8a3a" : hpPct > 30 ? "#c9942a" : "#8b0000";

  if (gameOver) {
    return (
      <main style={{
        minHeight: "100vh",
        background: gameOver === "win" ? "radial-gradient(ellipse at 50% 50%, #0a1a08 0%, #0a0906 70%)" : "#0a0906",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-body)", padding: 24,
      }}>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: "5rem", marginBottom: 24 }}>{gameOver === "win" ? "🏆" : "💀"}</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 6vw, 4rem)", color: gameOver === "win" ? "#c9a96e" : "#7a3010", marginBottom: 16 }}>
            {gameOver === "win" ? "O DESERTO É SEU!" : "FIM DA LINHA"}
          </h1>
          <p style={{ color: "#8a7d6e", fontFamily: "var(--font-prose)", fontStyle: "italic", marginBottom: 40, lineHeight: 1.6 }}>
            {gameOver === "win"
              ? `${myPlayer.name} sobreviveu a todas as 5 rodadas e derrotou o General Calamity. Uma lenda do Oeste.`
              : `${myPlayer.name} virou mais um nome esquecido gravado numa lápide de madeira no deserto.`}
          </p>
          <button className="btn-primary" style={{ fontSize: "0.85rem", letterSpacing: "0.2em", padding: "14px 40px" }}
            onClick={() => { router.push("/"); }}>
            Jogar Denovo
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0a0906",
      backgroundImage: "radial-gradient(ellipse 80% 50% at 50% 0%, #1a1005 0%, #0a0906 60%)",
      fontFamily: "var(--font-body)",
      padding: "0 0 60px",
    }}>
      {/* HUD */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(10,9,6,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #1e1a17",
        display: "flex", alignItems: "center", gap: 16,
        padding: "10px 20px", flexWrap: "wrap",
      }}>
        <span style={{ fontFamily: "var(--font-display)", color: "#c9a96e", fontSize: "1rem", marginRight: "auto" }}>
          ✦ {myPlayer.name}
        </span>

        {/* HP */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.65rem", color: "#8a7d6e", textTransform: "uppercase", letterSpacing: "0.15em" }}>HP</span>
          <div style={{ width: 100, height: 8, background: "#1c1814", border: "1px solid #3d2b1f", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{ width: `${hpPct}%`, height: "100%", background: hpColor, transition: "width 0.4s, background 0.4s" }} />
          </div>
          <span style={{ fontFamily: "var(--font-display)", color: hpColor, fontSize: "0.85rem" }}>{myPlayer.hp}/{myPlayer.maxHp}</span>
        </div>

        {/* Gold */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#1c1814", border: "1px solid #3d2b1f", padding: "5px 12px", borderRadius: "2px" }}>
          <span style={{ fontSize: "0.85rem" }}>💰</span>
          <span style={{ fontFamily: "var(--font-display)", color: "#c9a96e", fontSize: "0.9rem" }}>${myPlayer.gold}</span>
        </div>

        {/* Round */}
        <div style={{ padding: "5px 12px", background: "#1c1814", border: "1px solid #3d2b1f", borderRadius: "2px" }}>
          <span style={{ fontSize: "0.6rem", color: "#8a6e44", textTransform: "uppercase", letterSpacing: "0.2em" }}>Rodada {round + 1}/5</span>
        </div>

        {/* Weapon */}
        {myPlayer.weapon && (
          <div style={{ fontSize: "0.65rem", color: "#8a7d6e", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {myPlayer.weapon.icon} {myPlayer.weapon.name}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── SHOP PHASE ── */}
        {phase === "shop" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div className="divider-west" style={{ marginBottom: 16 }}><span>✦</span></div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.4rem, 4vw, 2.2rem)", color: "#c9a96e", marginBottom: 8 }}>
                {round === 0 ? "Armazém do Dusty" : "Reabastecimento"}
              </h2>
              <p style={{ color: "#8a7d6e", fontFamily: "var(--font-prose)", fontStyle: "italic", fontSize: "0.85rem" }}>
                {round === 0 ? "Compre um armamento antes de encarar os bandidos." : `Rodada ${round + 1} se aproxima. Gaste com sabedoria.`}
              </p>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid #1e1a17" }}>
              {(["Armas", "Cura"] as const).map((t, i) => (
                <button key={t} onClick={() => setShowWeapons(i === 0)} style={{
                  fontFamily: "var(--font-body)", fontSize: "0.7rem", textTransform: "uppercase",
                  letterSpacing: "0.18em", padding: "10px 20px", background: "transparent", border: "none",
                  borderBottom: (showWeapons ? i === 0 : i === 1) ? "2px solid #c9a96e" : "2px solid transparent",
                  color: (showWeapons ? i === 0 : i === 1) ? "#c9a96e" : "#8a7d6e",
                  cursor: "pointer", marginBottom: -1,
                }}>{t}</button>
              ))}
            </div>

            {showWeapons ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12, marginBottom: 32 }}>
                {WEAPONS.map(w => (
                  <div key={w.id} className="west-card" style={{
                    borderColor: myPlayer.weapon?.id === w.id ? "#8a6e44" : "#3d2b1f",
                    background: myPlayer.weapon?.id === w.id ? "rgba(201,169,110,0.05)" : "var(--panel)",
                    padding: "18px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ fontSize: "1.6rem" }}>{w.icon}</span>
                      {myPlayer.weapon?.id === w.id && (
                        <span style={{ fontSize: "0.55rem", color: "#c9a96e", textTransform: "uppercase", letterSpacing: "0.15em" }}>Equipada</span>
                      )}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", color: "#d4c9b8", fontSize: "0.9rem", marginBottom: 4 }}>{w.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#8a7d6e", fontFamily: "var(--font-prose)", fontStyle: "italic", marginBottom: 12, lineHeight: 1.4 }}>{w.desc}</div>
                    <div style={{ display: "flex", gap: 8, fontSize: "0.65rem", color: "#8a6e44", marginBottom: 14, flexWrap: "wrap" }}>
                      <span>⚔️ {w.damage[0]}-{w.damage[1]}</span>
                      <span>🎯 {w.accuracy}%</span>
                    </div>
                    <button
                      className={w.cost === 0 ? "btn-ghost" : "btn-primary"}
                      style={{ width: "100%", fontSize: "0.75rem", padding: "8px", letterSpacing: "0.12em" }}
                      onClick={() => buyWeapon(w)}
                      disabled={myPlayer.gold < w.cost || myPlayer.weapon?.id === w.id}
                    >
                      {w.cost === 0 ? "Grátis" : myPlayer.weapon?.id === w.id ? "Equipada" : `$${w.cost}`}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 32 }}>
                {HEALS.map(h => (
                  <div key={h.id} className="west-card" style={{ padding: "18px" }}>
                    <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>{h.icon}</div>
                    <div style={{ fontFamily: "var(--font-body)", color: "#d4c9b8", fontSize: "0.9rem", marginBottom: 4 }}>{h.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#3a8a3a", marginBottom: 14 }}>+{h.hp} HP</div>
                    <button
                      className="btn-primary"
                      style={{ width: "100%", fontSize: "0.75rem", padding: "8px" }}
                      onClick={() => buyHeal(h)}
                      disabled={myPlayer.gold < h.cost || myPlayer.hp >= myPlayer.maxHp}
                    >
                      ${h.cost}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Start button */}
            <div style={{ textAlign: "center" }}>
              <button
                className="btn-primary"
                style={{ fontSize: "0.9rem", padding: "16px 48px", letterSpacing: "0.2em" }}
                onClick={startCombat}
                disabled={!myPlayer.weapon && myPlayer.gold > 0}
              >
                {myPlayer.weapon ? `⚔️ ENTRAR EM COMBATE — RODADA ${round + 1}` : "PEGUE UMA ARMA PRIMEIRO"}
              </button>
              {!myPlayer.weapon && (
                <p style={{ marginTop: 12, fontSize: "0.7rem", color: "#8a6e44", fontStyle: "italic" }}>
                  Selecione ao menos uma arma (o soco inglês é gratuito).
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── COMBAT PHASE ── */}
        {phase === "combat" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <span style={{ fontSize: "0.65rem", color: "#8a6e44", textTransform: "uppercase", letterSpacing: "0.25em" }}>
                {combatPhase === "minions" ? "⚔️ Capangas" : "💀 Boss"}
              </span>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.2rem, 4vw, 1.8rem)", color: combatPhase === "boss" ? "#d07050" : "#c9a96e" }}>
                {combatPhase === "boss" ? (boss?.name || "") : "Eliminate os Capangas!"}
              </h2>
            </div>

            {/* Enemy cards */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 28 }}>
              {combatPhase === "minions" ? enemies.map(e => (
                <div key={e.id}
                  onClick={() => e.hp > 0 && attackEnemy(e.id)}
                  style={{
                    width: 140, padding: "16px 12px",
                    background: e.hp <= 0 ? "rgba(10,9,6,0.3)" : "var(--panel)",
                    border: e.hp <= 0 ? "1px solid #1e1a17" : "1px solid #5c3518",
                    borderRadius: "2px",
                    textAlign: "center",
                    cursor: e.hp > 0 && combatActive ? "crosshair" : "default",
                    opacity: e.hp <= 0 ? 0.4 : 1,
                    transition: "all 0.2s",
                    transform: e.hp > 0 ? "none" : "scale(0.95)",
                  }}
                  onMouseEnter={e2 => { if ((e as Enemy).hp > 0) (e2.currentTarget as HTMLDivElement).style.borderColor = "#c9942a"; }}
                  onMouseLeave={e2 => { (e2.currentTarget as HTMLDivElement).style.borderColor = (e as Enemy).hp <= 0 ? "#1e1a17" : "#5c3518"; }}
                >
                  <div style={{ fontSize: "2.4rem", marginBottom: 8, filter: e.hp <= 0 ? "grayscale(1)" : "none" }}>
                    {e.hp <= 0 ? "💀" : e.icon}
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "#d4c9b8", marginBottom: 8 }}>{e.name}</div>
                  <div style={{ height: 6, background: "#1c1814", border: "1px solid #3d2b1f", borderRadius: "1px", marginBottom: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(e.hp / e.maxHp) * 100}%`, height: "100%", background: "#8b0000", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "0.65rem", color: "#8a7d6e" }}>{e.hp}/{e.maxHp}</div>
                  {e.hp > 0 && combatActive && (
                    <div style={{ marginTop: 10, fontSize: "0.6rem", color: "#c9942a", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                      clique p/ atacar
                    </div>
                  )}
                </div>
              )) : boss ? (
                <div
                  onClick={() => boss.hp > 0 && attackEnemy(boss.id)}
                  style={{
                    width: "100%", maxWidth: 380, padding: "24px",
                    background: "rgba(122,48,16,0.1)",
                    border: `2px solid ${boss.hp <= 0 ? "#1e1a17" : "#7a3010"}`,
                    borderRadius: "2px", textAlign: "center",
                    cursor: boss.hp > 0 && combatActive ? "crosshair" : "default",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { if (boss.hp > 0) (e.currentTarget as HTMLDivElement).style.borderColor = "#c9942a"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = boss.hp <= 0 ? "#1e1a17" : "#7a3010"; }}
                >
                  <div style={{ fontSize: "4rem", marginBottom: 12, filter: boss.hp <= 0 ? "grayscale(1)" : "none" }}>
                    {boss.hp <= 0 ? "💀" : boss.icon}
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: "#d07050", marginBottom: 12 }}>{boss.name}</div>
                  <div style={{ height: 10, background: "#1c1814", border: "1px solid #7a3010", borderRadius: "1px", marginBottom: 6, overflow: "hidden" }}>
                    <div style={{ width: `${(boss.hp / boss.maxHp) * 100}%`, height: "100%", background: "linear-gradient(90deg, #5a1a00, #a84020)", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#d07050", fontFamily: "var(--font-display)" }}>{boss.hp}/{boss.maxHp} HP</div>
                  {boss.hp > 0 && combatActive && (
                    <div style={{ marginTop: 14, fontSize: "0.7rem", color: "#c9942a", textTransform: "uppercase", letterSpacing: "0.15em" }}>
                      clique para atacar o boss
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Combat log */}
            <div ref={logRef} style={{
              background: "#000",
              border: "1px solid #1e1a17",
              borderRadius: "2px",
              padding: "14px 16px",
              height: 180,
              overflowY: "auto",
              fontFamily: "var(--font-prose)",
              fontSize: "0.8rem",
              lineHeight: 1.7,
            }}>
              {logs.map((l, i) => (
                <div key={i} style={{ color: i === logs.length - 1 ? "#d4c9b8" : "#5c5048", transition: "color 0.5s" }}>
                  {l}
                </div>
              ))}
            </div>

            {!combatActive && !gameOver && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <p style={{ color: "#8a7d6e", fontFamily: "var(--font-prose)", fontStyle: "italic", marginBottom: 16 }}>
                  Preparando próxima rodada...
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}