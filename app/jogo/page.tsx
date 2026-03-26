"use client";

import { useState, useEffect } from 'react';

interface Weapon {
  name: string;
  price: number;
  damage: number;
  accuracyBonus: number;
  icon: string;
  desc: string;
}

interface Enemy {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  icon: string;
}

const WEAPONS: Weapon[] = [
  { name: 'Soco Inglês', price: 0, damage: 8, accuracyBonus: 0, icon: '/socoingles.jpg', desc: 'Punhos endurecidos pelo sol' },
  { name: 'Revólver Enferrujado', price: 50, damage: 15, accuracyBonus: 1, icon: '/revolverenferrujado.png', desc: 'Treme na mão, mas funciona' },
  { name: 'Smith & Wesson', price: 120, damage: 25, accuracyBonus: 3, icon: '/smithwesson.png', desc: 'Confiável como a morte' },
  { name: 'Cano Duplo Serrado', price: 250, damage: 50, accuracyBonus: -2, icon: '/canoduploserrado.png', desc: 'Não precisa mirar muito' },
  { name: 'Rifle Winchester', price: 500, damage: 45, accuracyBonus: 6, icon: '/winchester.png', desc: 'A escolha dos lendários' },
];

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Rye&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .west-root {
    min-height: 100vh;
    background: #1a0f08;
    background-image: radial-gradient(ellipse 80% 50% at 50% 0%, #3d1f0a 0%, transparent 60%);
    color: #d4b896;
    font-family: 'Libre Baskerville', Georgia, serif;
    padding-bottom: 60px;
  }

  .header {
    background: #100a05;
    border-bottom: 2px solid #6b3d1e;
    padding: 20px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand { font-family: 'Rye', serif; font-size: 2rem; color: #c9942a; }

  .stat-pill {
    background: #1e120a;
    border: 1px solid #4a2e14;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 4px;
  }

  .hp-bar-wrap { width: 100px; height: 10px; background: #2a1a0e; border: 1px solid #3a2010; }
  .hp-bar { height: 100%; transition: width 0.4s ease; }

  .content { max-width: 900px; margin: 40px auto; padding: 0 20px; }

  .section-title { font-family: 'Rye', serif; color: #c9942a; margin-bottom: 20px; text-align: center; }

  .weapons-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
  }

  .weapon-card {
    background: #1e120a;
    border: 1px solid #3a2010;
    padding: 15px;
    text-align: center;
    transition: all 0.3s;
  }
  .weapon-card.owned { border-color: #c9942a; background: #2a1a0e; box-shadow: 0 0 10px rgba(201,148,42,0.2); }

  .weapon-img-container { height: 60px; margin-bottom: 10px; display: flex; justify-content: center; align-items: center; }
  .weapon-img { max-width: 100%; max-height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px black); }

  .buy-btn {
    width: 100%;
    padding: 8px;
    background: #3d2510;
    border: 1px solid #c9942a;
    color: #c9942a;
    cursor: pointer;
    font-family: 'Rye', serif;
    margin-top: 10px;
  }
  .buy-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .medicine-box {
    background: #0d160e;
    border: 1px solid #1e3a22;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .duel-btn {
    width: 100%;
    padding: 25px;
    background: #4a0a0a;
    color: #ff7070;
    font-family: 'Rye', serif;
    font-size: 1.5rem;
    border: 2px solid #8b0000;
    cursor: pointer;
    transition: 0.3s;
  }
  .duel-btn:hover:not(:disabled) { background: #6b0f0f; color: white; }

  .enemy-box {
    width: 150px;
    text-align: center;
    cursor: crosshair;
    padding: 10px;
    border: 2px solid transparent;
    transition: 0.2s;
  }
  .enemy-box:hover { border-color: #8b0000; background: rgba(139,0,0,0.1); }
  .enemy-portrait { font-size: 4rem; background: #000; margin-bottom: 10px; padding: 20px; border: 1px solid #333; }

  .combat-log {
    background: #000;
    color: #aaa;
    padding: 15px;
    height: 150px;
    overflow-y: auto;
    font-size: 0.9rem;
    border: 1px solid #333;
    margin-top: 30px;
  }
  .log-line.new { color: #d4b896; font-weight: bold; }

  .dead-screen {
    height: 100vh; background: black; color: red;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
  }
`;

export default function WestGame() {
  const [hp, setHp] = useState(100);
  const [gold, setGold] = useState(50);
  const [weapon, setWeapon] = useState<Weapon | null>(null);
  const [inStore, setInStore] = useState(true);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [logs, setLogs] = useState<string[]>(['Visite o armazém antes do duelo.']);
  const [turn, setTurn] = useState<'player' | 'enemy'>('player');
  const [isDead, setIsDead] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 8));

  const buyMedicine = () => {
    if (gold >= 30 && hp < 100) {
      setGold(g => g - 30);
      setHp(h => Math.min(100, h + 20));
      addLog("💊 Você tomou um tônico. +20 HP.");
    }
  };

  const buyWeapon = (w: Weapon) => {
    if (gold >= w.price) {
      setGold(g => g - w.price);
      setWeapon(w);
      addLog(`🔫 ${w.name} equipada!`);
    }
  };

  const startFight = () => {
    setEnemies([
      { id: 1, name: 'Bandido', hp: 50, maxHp: 50, icon: '🤠' },
      { id: 2, name: 'Pistoleiro', hp: 60, maxHp: 60, icon: '💀' },
    ]);
    setInStore(false);
    addLog("O duelo começou! Atire primeiro!");
  };

  const handleAttack = (targetId: number) => {
    if (turn !== 'player' || !weapon) return;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + weapon.accuracyBonus;

    if (total >= 10) {
      setEnemies(prev => prev.map(e => e.id === targetId ? { ...e, hp: Math.max(0, e.hp - weapon.damage) } : e));
      addLog(`🎯 Acertou! Rolou ${total}. Causou ${weapon.damage} de dano.`);
    } else {
      addLog(`💨 Errou! Rolou ${total}.`);
    }
    setTurn('enemy');
  };

  useEffect(() => {
    if (turn === 'enemy' && enemies.some(e => e.hp > 0)) {
      const timer = setTimeout(() => {
        let totalDmg = 0;
        enemies.forEach(e => {
          if (e.hp > 0) {
            const roll = Math.floor(Math.random() * 20) + 1;
            if (roll >= 11) {
              totalDmg += 12;
              addLog(`🧨 ${e.name} te acertou! (-12 HP)`);
            } else {
              addLog(`🌵 ${e.name} errou o tiro.`);
            }
          }
        });
        setHp(h => {
          const newHp = Math.max(0, h - totalDmg);
          if (newHp <= 0) setIsDead(true);
          return newHp;
        });
        setTurn('player');
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (enemies.length > 0 && enemies.every(e => e.hp <= 0)) {
      addLog("💰 Vitória! Você ganhou 100 moedas.");
      setGold(g => g + 100);
      setEnemies([]);
      setInStore(true);
    }
  }, [turn, enemies]);

  if (isDead) return (
    <><style>{STYLES}</style>
    <div className="dead-screen">
      <h1 style={{ fontFamily: 'Rye', fontSize: '5rem' }}>FIM DA LINHA</h1>
      <button className="retry-btn" style={{ padding: '15px', color: 'red', border: '1px solid red', background: 'none', cursor: 'pointer', fontFamily: 'Rye' }} onClick={() => window.location.reload()}>TENTAR NOVAMENTE</button>
    </div></>
  );

  return (
    <div className="west-root">
      <style>{STYLES}</style>
      <header className="header">
        <div className="brand">Western Survival</div>
        <div className="stats-row" style={{ display: 'flex', gap: '15px' }}>
          <div className="stat-pill">
            <div className="hp-bar-wrap"><div className="hp-bar" style={{ width: `${hp}%`, background: hp > 30 ? '#4a9a5a' : '#8b0000' }} /></div>
            <span className="stat-value">{hp}/100</span>
          </div>
          <div className="stat-pill">💰 <span className="stat-value">${gold}</span></div>
        </div>
      </header>

      <div className="content">
        {inStore ? (
          <>
            <h2 className="section-title">Loja do Vilarejo</h2>
            <div className="weapons-grid">
              {WEAPONS.map(w => (
                <div key={w.name} className={`weapon-card ${weapon?.name === w.name ? 'owned' : ''}`}>
                  <div className="weapon-img-container"><img src={w.icon} className="weapon-img" alt={w.name} /></div>
                  <div className="weapon-name" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{w.name}</div>
                  <button className="buy-btn" onClick={() => buyWeapon(w)} disabled={gold < w.price || weapon?.name === w.name}>
                    ${w.price}
                  </button>
                </div>
              ))}
            </div>

            <div className="medicine-box">
              <div>
                <h3 style={{ color: '#6ab07a' }}>Tônico de Ervas</h3>
                <p style={{ fontSize: '0.8rem' }}>Cura 20 de vida por dose.</p>
              </div>
              <button className="buy-btn" style={{ width: 'auto', padding: '10px 20px' }} onClick={buyMedicine} disabled={gold < 30 || hp >= 100}>
                Comprar ($30)
              </button>
            </div>

            <button className="duel-btn" onClick={startFight} disabled={!weapon}>
              {weapon ? 'IR PARA O DUELO' : 'COMPRE UMA ARMA'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '30px' }}>
              {enemies.map(e => (
                <div key={e.id} className={`enemy-box ${e.hp <= 0 ? 'dead' : ''}`} onClick={() => e.hp > 0 && handleAttack(e.id)}>
                  <div className="enemy-portrait">{e.hp > 0 ? e.icon : '💀'}</div>
                  <div className="enemy-hp-bar"><div style={{ width: `${(e.hp/e.maxHp)*100}%`, height: '100%', background: 'red' }} /></div>
                  <p>{e.name} ({e.hp} HP)</p>
                </div>
              ))}
            </div>
            <div className="combat-log">
              {logs.map((l, i) => <div key={i} className={`log-line ${i === 0 ? 'new' : ''}`}>{l}</div>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}