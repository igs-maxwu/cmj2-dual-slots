// Game UI kit — single Babel script. Assumes React + ReactDOM globals.
// All constants mirror ClaudeAI/DualSlot/src/config/DesignTokens.ts

const COLORS = {
  bg:'#0f0f1a', bgPanel:'#1a1a2e', bgCell:'#16213e', bgReel:'#0d0d1a',
  borderNormal:'#334466', borderGold:'#f1c40f',
  borderA:'#3498db', borderB:'#e74c3c',
  playerA:'#3498db', playerB:'#e74c3c',
  hpHigh:'#2ecc71', hpMid:'#e67e22', hpLow:'#e74c3c', hpBg:'#333333',
  btnIdle:'#e67e22', btnHover:'#f39c12', btnPressed:'#b35900', btnDisabled:'#555555', btnRematch:'#27ae60',
  coin:'#f1c40f', skill:'#b5179e', dmg:'#ff4444',
  textMuted:'#7f8c9a', white:'#ffffff',
};
const LAYOUT = {
  W: 1280, H: 720,
  panelW: 211,
  cell: 52, cellGap: 6,
  reelCellW: 96, reelCellH: 58, reelGap: 6,
  btnW: 200, btnH: 56,
};
const ROSTER_A = [
  { id:'MENG', name:'孟辰璋', tex:'mengchenzhang', border:'#52B788', hp:2200, maxHp:2200, skill:'Dragon Charge' },
  { id:'CANG', name:'蒼嵐',   tex:'canlan',        border:'#52B788', hp:2000, maxHp:2000, skill:'Verdant Dance' },
  { id:'YIN',  name:'寅',     tex:'yin',           border:'#E63946', hp:2000, maxHp:2000, skill:'Tiger Fang' },
];
const ROSTER_B = [
  { id:'LUO',  name:'珞洛',   tex:'luoluo',        border:'#E63946', hp:2200, maxHp:2200, skill:'Nirvana' },
  { id:'LING', name:'凌羽',   tex:'lingyu',        border:'#EF9B0F', hp:1800, maxHp:1800, skill:'Phoenix Wing' },
  { id:'ZHU',  name:'朱鸞',   tex:'zhuluan',       border:'#EF9B0F', hp:1900, maxHp:1900, skill:'Ember Blessing' },
];
const SYMBOLS = [
  { color:'#FF6B6B', shape:'diamond' }, { color:'#E63946', shape:'diamond' }, { color:'#9B1B30', shape:'diamond' },
  { color:'#48CAE4', shape:'circle' },  { color:'#0096C7', shape:'circle' },  { color:'#023E8A', shape:'circle' },
  { color:'#52B788', shape:'bar' },     { color:'#2D6A4F', shape:'bar' },     { color:'#1B4332', shape:'bar' },
  { color:'#FFD166', shape:'hex' },     { color:'#EF9B0F', shape:'tri' },     { color:'#F8F9FA', shape:'open' },
  { color:'#B5179E', shape:'star' },
];

function randSymbol() { return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; }
function makeGrid() { return Array.from({length:4}, () => Array.from({length:5}, () => randSymbol())); }

// ──────────────────────────────────────────────────────────────────────────────
function Shape({ s, size }) {
  const half = size * 0.45;
  switch (s.shape) {
    case 'diamond': return <svg width={size} height={size}><polygon points={`${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}`} fill={s.color}/></svg>;
    case 'circle':  return <svg width={size} height={size}><circle cx={size/2} cy={size/2} r={half} fill={s.color}/></svg>;
    case 'bar':     return <svg width={size} height={size}><rect x={size/2 - size*0.18} y={size*0.12} width={size*0.36} height={size*0.76} fill={s.color}/></svg>;
    case 'hex':     return <svg width={size} height={size}><polygon points={`${size/2},3 ${size-6},${size*0.3} ${size-6},${size*0.7} ${size/2},${size-3} 6,${size*0.7} 6,${size*0.3}`} fill={s.color}/></svg>;
    case 'tri':     return <svg width={size} height={size}><polygon points={`${size/2},4 ${size-6},${size-6} 6,${size-6}`} fill={s.color}/></svg>;
    case 'open':    return <svg width={size} height={size}><rect x={8} y={8} width={size-16} height={size-16} fill="none" stroke={s.color} strokeWidth={3}/></svg>;
    case 'star': {
      const pts = [];
      for (let i=0;i<10;i++){
        const r = i%2===0 ? half : half*0.45;
        const a = (i * Math.PI) / 5 - Math.PI/2;
        pts.push(`${size/2 + Math.cos(a)*r},${size/2 + Math.sin(a)*r}`);
      }
      return <svg width={size} height={size}><polygon points={pts.join(' ')} fill={s.color}/></svg>;
    }
    default: return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
function HpBar({ hp, maxHp, w }) {
  const pct = Math.max(0, hp / maxHp);
  const color = pct > 0.5 ? COLORS.hpHigh : pct > 0.25 ? COLORS.hpMid : COLORS.hpLow;
  return (
    <div style={{width:w, height:5, background:COLORS.hpBg}}>
      <div style={{width:`${pct*100}%`, height:'100%', background:color, transition:'width 300ms cubic-bezier(0.22,1,0.36,1), background 150ms'}}/>
    </div>
  );
}

function FormationCell({ unit, teamBorder }) {
  const { cell } = LAYOUT;
  if (!unit) return <div style={{width:cell, height:cell, background:COLORS.bgCell, border:`1px solid ${COLORS.borderNormal}`}}/>;
  const dead = unit.hp <= 0;
  return (
    <div style={{width:cell, height:cell, background:dead?'#220000':COLORS.bgCell, border:`2px solid ${teamBorder}`, position:'relative', display:'flex', alignItems:'center', justifyContent:'center'}}>
      {dead
        ? <div style={{color:'#cc2222', fontSize:20, fontWeight:700}}>✕</div>
        : <img src={`../../assets/spirits/${unit.tex}.png`} style={{width:cell-10, height:cell-14, objectFit:'contain', marginTop:-4}}/>}
      <div style={{position:'absolute', bottom:2, left:0, right:0, display:'flex', justifyContent:'center'}}>
        <HpBar hp={unit.hp} maxHp={unit.maxHp} w={cell-8}/>
      </div>
      {!dead && <div style={{position:'absolute', top:2, left:0, right:0, textAlign:'center', fontSize:9, color:'#fff', fontWeight:700, textShadow:'0 1px 2px #000'}}>{unit.name}</div>}
    </div>
  );
}

function FormationGrid({ units, team }) {
  const { cell, cellGap } = LAYOUT;
  const cells = Array.from({length:9}, (_, i) => units[i]);
  const border = team === 'A' ? COLORS.borderA : COLORS.borderB;
  return (
    <div style={{display:'grid', gridTemplateColumns:`repeat(3, ${cell}px)`, gap:cellGap}}>
      {cells.map((u, i) => <FormationCell key={i} unit={u} teamBorder={border}/>)}
    </div>
  );
}

function PlayerPanel({ side, units, coin, bet, dmg, skill }) {
  const isA = side === 'A';
  const color = isA ? COLORS.playerA : COLORS.playerB;
  const border = isA ? COLORS.borderA : COLORS.borderB;
  return (
    <div style={{width:LAYOUT.panelW, height:LAYOUT.H, background:COLORS.bgPanel, border:`1px solid ${border}`, boxSizing:'border-box', padding:'14px 0 0', display:'flex', flexDirection:'column', alignItems:'center'}}>
      <div style={{color, fontWeight:700, letterSpacing:'0.25em', fontSize:14}}>PLAYER {side}</div>
      <div style={{height:1, width:'calc(100% - 20px)', background:border, opacity:0.4, margin:'8px 0'}}/>
      <FormationGrid units={units} team={side}/>
      <div style={{marginTop:22, fontSize:10, color:COLORS.textMuted, letterSpacing:'0.18em'}}>COIN</div>
      <div style={{marginTop:2, fontSize:16, color:COLORS.coin, fontWeight:700, fontVariantNumeric:'tabular-nums'}}>${coin.toLocaleString()}</div>
      <div style={{marginTop:4, fontSize:12, color:COLORS.textMuted}}>BET: ${bet}</div>
      {dmg > 0 && <div style={{marginTop:6, fontSize:12, color:COLORS.btnIdle, fontWeight:700}}>DMG: {dmg}</div>}
      {skill && <div style={{marginTop:6, fontSize:10, color:COLORS.skill, fontWeight:700}}>★ {skill}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function ReelCell({ sym, spinning, onClick }) {
  const { reelCellW, reelCellH } = LAYOUT;
  return (
    <div onClick={onClick} style={{width:reelCellW, height:reelCellH, background:COLORS.bgReel, border:`1px solid ${COLORS.borderNormal}`, display:'flex', alignItems:'center', justifyContent:'center', boxSizing:'border-box', cursor:onClick?'pointer':'default', transform: spinning ? 'translateY(-4px)' : 'none', transition:'transform 80ms'}}>
      <Shape s={sym} size={Math.min(reelCellW, reelCellH) * 0.65}/>
    </div>
  );
}

function ReelGrid({ grid, spinning, winLines }) {
  const { reelCellW, reelCellH, reelGap } = LAYOUT;
  const totalW = reelCellW * 5 + reelGap * 4;
  const totalH = reelCellH * 4 + reelGap * 3;
  const pad = 14;
  return (
    <div style={{position:'relative', width:totalW + pad*2, height:totalH + pad*2, background:COLORS.bgPanel, border:`2px solid ${COLORS.borderGold}`, boxSizing:'border-box', padding:pad}}>
      <div style={{display:'grid', gridTemplateColumns:`repeat(5, ${reelCellW}px)`, gridTemplateRows:`repeat(4, ${reelCellH}px)`, gap:reelGap}}>
        {grid.map((row, r) => row.map((sym, c) => <ReelCell key={`${r}-${c}`} sym={sym} spinning={spinning}/>))}
      </div>
      {/* corner accent dots */}
      {[['-4px','-4px'],['-4px','auto','-4px','auto'],['auto','-4px','-4px','auto'],['auto','auto','-4px','-4px']].map((p, i) => (
        <div key={i} style={{position:'absolute', top:p[0]==='auto'?undefined:p[0], left:p[1]==='auto'?undefined:p[1], bottom:p[2]==='auto'?undefined:p[2], right:p[3]==='auto'?undefined:p[3], width:8, height:8, background:COLORS.borderGold}}/>
      ))}
      {winLines.map((ln, i) => (
        <svg key={i} style={{position:'absolute', top:pad, left:pad, pointerEvents:'none'}} width={totalW} height={totalH}>
          <polyline points={ln.points.map(([c,r])=>`${c*(reelCellW+reelGap)+reelCellW/2},${r*(reelCellH+reelGap)+reelCellH/2}`).join(' ')} fill="none" stroke={ln.color} strokeWidth={4} opacity={0.85}>
            <animate attributeName="opacity" values="0.85;0;0.85" dur="1.6s" repeatCount="indefinite"/>
          </polyline>
        </svg>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function SpinButton({ mode, onClick }) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const { btnW, btnH } = LAYOUT;

  const cfg = {
    idle:     { bg: pressed ? COLORS.btnPressed : hover ? COLORS.btnHover : COLORS.btnIdle, label:'START BATTLE' },
    spinning: { bg: COLORS.btnDisabled, label:'SPINNING…' },
    gameover: { bg: COLORS.btnRematch, label:'REMATCH' },
  }[mode];
  const enabled = mode !== 'spinning';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={() => enabled && onClick()}
      style={{width:btnW, height:btnH, background:cfg.bg, border:`2px solid ${COLORS.white}`, display:'flex', alignItems:'center', justifyContent:'center', color:COLORS.white, fontWeight:700, letterSpacing:'0.14em', fontSize:18, cursor:enabled?'pointer':'default', userSelect:'none', transition:'background 150ms'}}>
      {cfg.label}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function BattleLog({ entries }) {
  return (
    <div style={{flex:1, background:'rgba(0,0,0,0.45)', padding:'8px 14px', boxSizing:'border-box', fontSize:13, lineHeight:'18px', fontFamily:'Arial, sans-serif'}}>
      {entries.slice(-4).map((e, i, arr) => (
        <div key={i} style={{color:e.color, opacity: 0.5 + (i/arr.length)*0.5}}>{e.text}</div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function Hud({ round }) {
  return (
    <>
      <div style={{position:'absolute', top:14, left:0, right:0, textAlign:'center', fontSize:14, fontWeight:700, color:COLORS.textMuted, letterSpacing:'0.28em'}}>ROUND {round}</div>
      <div style={{position:'absolute', top:LAYOUT.H*0.22, left:0, right:0, textAlign:'center', fontSize:44, fontWeight:900, color:'rgba(255,255,255,0.85)', fontFamily:'Cinzel, serif', letterSpacing:'0.24em'}}>VS</div>
      <div style={{position:'absolute', top:Math.round(LAYOUT.H*0.44), left:0, right:0, height:2, background:COLORS.borderNormal, opacity:0.4}}/>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function DamageFloat({ x, value, onDone }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 900);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{position:'absolute', left:x, top:LAYOUT.H*0.22, transform:'translate(-50%, 0)', color:'#ff4444', fontWeight:700, fontSize:26, textShadow:'0 0 3px #000, 2px 2px 0 #000', pointerEvents:'none', animation:'dmgfloat 900ms cubic-bezier(0.22,1,0.36,1) forwards', zIndex:10}}>
      -{value}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
function GameScene() {
  const [grid, setGrid] = React.useState(makeGrid);
  const [mode, setMode] = React.useState('idle');
  const [round, setRound] = React.useState(0);
  const [hpA, setHpA] = React.useState(ROSTER_A);
  const [hpB, setHpB] = React.useState(ROSTER_B);
  const [coinA, setCoinA] = React.useState(1000);
  const [coinB, setCoinB] = React.useState(1000);
  const [lastDmg, setLastDmg] = React.useState({ A:0, B:0 });
  const [skillA, setSkillA] = React.useState(null);
  const [skillB, setSkillB] = React.useState(null);
  const [log, setLog] = React.useState([
    { text:'Match start — Azure vs Vermilion', color:'#7f8c9a' },
  ]);
  const [floats, setFloats] = React.useState([]);
  const [winLines, setWinLines] = React.useState([]);
  const [shake, setShake] = React.useState(false);

  function addLog(text, color) { setLog(l => [...l.slice(-20), { text, color }]); }

  function doSpin() {
    if (mode !== 'idle' && mode !== 'gameover') return;
    if (mode === 'gameover') {
      setHpA(ROSTER_A.map(u => ({...u}))); setHpB(ROSTER_B.map(u => ({...u})));
      setRound(0); setCoinA(1000); setCoinB(1000); setLog([{ text:'Rematch — new blood', color:'#f1c40f' }]);
      setLastDmg({A:0,B:0}); setMode('idle'); return;
    }
    setMode('spinning'); setWinLines([]);
    const shuffleT = setInterval(() => setGrid(makeGrid()), 90);
    setTimeout(() => {
      clearInterval(shuffleT);
      const final = makeGrid();
      setGrid(final);
      resolveRound(final);
    }, 1800);
  }

  function resolveRound(g) {
    const nextRound = round + 1;
    setRound(nextRound);
    // Fake resolution
    const dmgA = [0, 0, 220, 340, 180, 450, 0, 260][Math.floor(Math.random()*8)];
    const dmgB = [0, 120, 0, 200, 340, 0, 180, 280][Math.floor(Math.random()*8)];
    setLastDmg({ A:dmgA, B:dmgB });

    if (dmgA > 0) {
      setHpB(h => applyDmg(h, dmgA));
      addLog(`A hits ${dmgA} DMG (${1 + Math.floor(Math.random()*4)} lines)`, COLORS.playerA);
      setFloats(f => [...f, { id:Math.random(), x: LAYOUT.W - LAYOUT.panelW/2, value:dmgA }]);
      setWinLines(w => [...w, { color:COLORS.playerA, points: pickLine() }]);
      setShake(dmgA > 300);
      setTimeout(() => setShake(false), 260);
    }
    if (dmgB > 0) {
      setHpA(h => applyDmg(h, dmgB));
      addLog(`B hits ${dmgB} DMG (${1 + Math.floor(Math.random()*4)} lines)`, COLORS.playerB);
      setFloats(f => [...f, { id:Math.random(), x: LAYOUT.panelW/2, value:dmgB }]);
      setWinLines(w => [...w, { color:COLORS.playerB, points: pickLine() }]);
    }
    if (dmgA === 0 && dmgB === 0) addLog(`Round ${nextRound}: No match`, COLORS.textMuted);

    // Random skill trigger flair
    if (Math.random() < 0.35) {
      const sk = ROSTER_A[Math.floor(Math.random()*3)].skill;
      setSkillA(sk); addLog(`★ ${sk}`, COLORS.skill);
      setTimeout(() => setSkillA(null), 2000);
    }
    if (Math.random() < 0.35) {
      const sk = ROSTER_B[Math.floor(Math.random()*3)].skill;
      setSkillB(sk);
      setTimeout(() => setSkillB(null), 2000);
    }

    setCoinA(c => Math.max(0, c - 100 + Math.floor(dmgA*0.4)));
    setCoinB(c => Math.max(0, c - 100 + Math.floor(dmgB*0.4)));

    setTimeout(() => {
      // game over?
      const aAlive = (dmgB > 0 ? applyDmg(hpA, dmgB) : hpA).some(u => u.hp > 0);
      const bAlive = (dmgA > 0 ? applyDmg(hpB, dmgA) : hpB).some(u => u.hp > 0);
      if (!aAlive || !bAlive) {
        setMode('gameover');
        const text = (!aAlive && !bAlive) ? '★ DRAW — mutual destruction!' : (!aAlive ? '★ PLAYER B WINS!' : '★ PLAYER A WINS!');
        addLog(text, COLORS.borderGold);
      } else {
        setMode('idle');
      }
      setTimeout(() => setWinLines([]), 1200);
    }, 600);
  }

  function applyDmg(roster, dmg) {
    const next = roster.map(u => ({...u}));
    let rem = dmg;
    for (const u of next) { if (u.hp <= 0) continue; const t = Math.min(u.hp, rem); u.hp -= t; rem -= t; if (rem <= 0) break; }
    return next;
  }
  function pickLine() {
    const c0 = Math.floor(Math.random()*4);
    return Array.from({length:5}, (_, c) => [c, Math.max(0, Math.min(3, c0 + (Math.random()<0.5?0:(Math.random()<0.5?-1:1))))]);
  }

  function removeFloat(id) { setFloats(f => f.filter(x => x.id !== id)); }

  return (
    <div style={{width:LAYOUT.W, height:LAYOUT.H, background:COLORS.bg, position:'relative', overflow:'hidden', fontFamily:'Arial, sans-serif', color:'#fff', transform: shake ? `translate(${(Math.random()*2-1)*10}px, ${(Math.random()*2-1)*5}px)` : 'none', transition:'transform 50ms'}}>
      <style>{`
        @keyframes dmgfloat { 0% { transform: translate(-50%, 0); opacity:1 } 100% { transform: translate(-50%, -60px); opacity:0 } }
      `}</style>
      <Hud round={round}/>
      <div style={{position:'absolute', top:0, left:0}}>
        <PlayerPanel side="A" units={hpA} coin={coinA} bet={100} dmg={lastDmg.A} skill={skillA}/>
      </div>
      <div style={{position:'absolute', top:0, right:0}}>
        <PlayerPanel side="B" units={hpB} coin={coinB} bet={100} dmg={lastDmg.B} skill={skillB}/>
      </div>
      <div style={{position:'absolute', top:Math.round(LAYOUT.H*0.44) + 14, left:'50%', transform:'translateX(-50%)'}}>
        <ReelGrid grid={grid} spinning={mode==='spinning'} winLines={winLines}/>
      </div>
      {/* Control row */}
      <div style={{position:'absolute', bottom:14, left:LAYOUT.panelW + 10, right:LAYOUT.panelW + 10, height:LAYOUT.btnH, display:'flex', gap:10, alignItems:'stretch'}}>
        <BattleLog entries={log}/>
        <SpinButton mode={mode} onClick={doSpin}/>
      </div>
      {floats.map(f => <DamageFloat key={f.id} x={f.x} value={f.value} onDone={() => removeFloat(f.id)}/>)}
    </div>
  );
}

window.GameScene = GameScene;
