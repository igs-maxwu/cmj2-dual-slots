// Dual Slots Battle — Game UI Kit (single Babel file)
// 1280×720 stage; 1v1 spirit autobattle slot machine.
// Assumes React, ReactDOM globals (loaded in index.html).

const T = {
  seaAbyss:'#061a33', seaDeep:'#0b2f5e', seaMid:'#1b5a8a', seaLight:'#3aa8c9', seaCaustic:'#7ad7e8',
  goldPale:'#ffe9a8', goldLight:'#ffd54a', gold:'#f5b82a', goldDeep:'#e89b1a', goldShadow:'#8a5412',
  ctaGreen:'#28c76f', ctaGreenLight:'#58e090', ctaGreenDeep:'#16803d',
  ctaRed:'#e74c3c', ctaRedDeep:'#9b1b1b',
  teamA:'#2f88e8', teamAglow:'#6ab7ff', teamAdeep:'#164d8f',
  teamB:'#e84a3c', teamBglow:'#ff8a6a', teamBdeep:'#8a1e12',
  panel:'rgba(8,28,54,0.85)', panelSolid:'#0d2547', inlay:'#020a18',
  white:'#ffffff', cream:'#fff6da', muted:'#7ea3c7',
  gradGoldV:'linear-gradient(180deg,#ffe9a8 0%,#ffd54a 38%,#f5b82a 60%,#e89b1a 82%,#8a5412 100%)',
  gradGoldText:'linear-gradient(180deg,#fff2b8 0%,#ffd54a 45%,#e89b1a 70%,#8a5412 100%)',
  gradGreen:'linear-gradient(180deg,#58e090,#28c76f 45%,#16803d)',
  gradRed:'linear-gradient(180deg,#ff8a6a,#e84a3c 45%,#8a1e12)',
  gradDark:'linear-gradient(180deg,#2a4872,#12304e 45%,#061a33)',
};

const ROSTER_A = [
  { id:'MENG', name:'孟辰璋', tex:'mengchenzhang', hp:2200, maxHp:2200 },
  { id:'CANG', name:'蒼嵐',   tex:'canlan',        hp:2000, maxHp:2000 },
  { id:'YIN',  name:'寅',     tex:'yin',           hp:1800, maxHp:1800 },
];
const ROSTER_B = [
  { id:'LUO',  name:'珞洛',   tex:'luoluo',  hp:2200, maxHp:2200 },
  { id:'LING', name:'凌羽',   tex:'lingyu',  hp:2000, maxHp:2000 },
  { id:'ZHU',  name:'朱鸞',   tex:'zhuluan', hp:1800, maxHp:1800 },
];

// Reel symbols — low (vermillion/purple/gold shells), mid (turtle/phoenix/tortoise), high (spirits)
const SYM = [
  { id:'S1', label:'貝', grad:'radial-gradient(circle at 30% 25%,#e8c9a0,#c9a27a 60%,#7a5a3d)', weight:5 },
  { id:'S2', label:'螺', grad:'radial-gradient(circle at 30% 25%,#d4b0ee,#b388d6 60%,#6f4c95)', weight:5 },
  { id:'S3', label:'金', grad:'radial-gradient(circle at 30% 25%,#ffe9a8,#ffd27a 60%,#aa7f3a)', weight:5 },
  { id:'M1', label:'龜', grad:'radial-gradient(circle at 30% 25%,#9eecc9,#5fc29a 60%,#2a7053)', weight:4 },
  { id:'M2', label:'朱', grad:'radial-gradient(circle at 30% 25%,#ffb0bf,#ff6b88 60%,#8a2a3f)', weight:3 },
  { id:'M3', label:'玄', grad:'radial-gradient(circle at 30% 25%,#cfa8e8,#a06bd8 60%,#4e2e83)', weight:3 },
  { id:'H1', label:'麟', grad:'radial-gradient(circle at 30% 25%,#ffd8a8,#ffb347 60%,#9e5e10)', weight:2 },
  { id:'H2', label:'龍', grad:'radial-gradient(circle at 30% 25%,#b0eaf5,#4fd1e8 60%,#1f6a7d)', weight:2 },
  { id:'W',  label:'★', grad:'radial-gradient(circle at 30% 25%,#fff2a8,#ffe066 60%,#aa8b10)', weight:1, wild:true },
  { id:'SC', label:'S', grad:'radial-gradient(circle at 30% 25%,#ff8aa6,#ff3b6b 60%,#931b3f)', weight:1, scatter:true },
];
const SYM_BAG = SYM.flatMap(s => Array(s.weight).fill(s));
const rsym = () => SYM_BAG[Math.floor(Math.random()*SYM_BAG.length)];
const makeGrid = () => Array.from({length:4},()=>Array.from({length:5},()=>rsym()));

// ─── low-level bits ─────────────────────────────────────────────────────────

function GoldFrame({ children, style, radius=12, pad=0, inner=true }) {
  return (
    <div style={{
      position:'relative', borderRadius:radius, padding:pad,
      background: T.panel, boxShadow: inner
        ? '0 6px 14px rgba(0,0,0,0.55), 0 2px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,230,160,0.35), inset 0 -2px 4px rgba(0,0,0,0.5)'
        : '0 4px 10px rgba(0,0,0,0.45)',
      ...style
    }}>
      <div style={{
        position:'absolute', inset:-3, borderRadius:'inherit', padding:3,
        background: T.gradGoldV,
        WebkitMask:'linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)',
        WebkitMaskComposite:'xor', maskComposite:'exclude',
        pointerEvents:'none'
      }}/>
      {children}
    </div>
  );
}

function GoldText({ children, size=24, family='var(--font-display)', stroke=1.5, glow=true, style }) {
  return (
    <span style={{
      fontFamily:family, fontSize:size, fontWeight:900, letterSpacing:'0.04em', lineHeight:1,
      background: T.gradGoldText, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
      WebkitTextStroke:`${stroke}px ${T.goldShadow}`,
      filter: glow
        ? `drop-shadow(0 ${Math.max(2,size*0.05)}px 0 ${T.goldShadow}) drop-shadow(0 0 ${Math.max(8,size*0.18)}px rgba(255,201,77,0.5))`
        : `drop-shadow(0 1px 0 ${T.goldShadow})`,
      ...style
    }}>{children}</span>
  );
}

function Btn({ variant='green', onClick, disabled, children, style, sub }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const grads = { green:T.gradGreen, red:T.gradRed, dark:T.gradDark, gold:T.gradGoldV };
  const textColor = variant==='gold' ? '#3a2a05' : '#fff';
  const textShadow = variant==='gold' ? '0 1px 0 rgba(255,255,255,0.4)' : '0 1px 2px rgba(0,0,0,0.55)';
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>{setHover(false);setPress(false);}}
      onMouseDown={()=>setPress(true)} onMouseUp={()=>setPress(false)}
      style={{
        position:'relative', border:`2px solid ${T.goldShadow}`, borderRadius:999, padding:'0 18px',
        background:grads[variant], color:textColor, fontFamily:'var(--font-title)', fontWeight:900,
        letterSpacing:'0.12em', cursor:disabled?'not-allowed':'pointer', userSelect:'none',
        textShadow, opacity:disabled?0.5:1, filter: hover&&!disabled?'brightness(1.1)':'none',
        transform: press?'translateY(2px)':'none',
        boxShadow: press
          ? '0 1px 0 rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.25)'
          : '0 4px 0 rgba(0,0,0,0.35), 0 6px 14px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 0 rgba(0,0,0,0.25)',
        transition:'filter 120ms, transform 80ms, box-shadow 80ms',
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        ...style
      }}
    >
      <span>{children}</span>
      {sub && <span style={{fontSize:9, fontWeight:600, letterSpacing:'0.2em', opacity:0.85, marginTop:2}}>{sub}</span>}
    </button>
  );
}

function IconBtn({ glyph, onClick, size=44 }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{
        position:'relative', width:size, height:size, border:`2px solid ${T.goldShadow}`, borderRadius:'50%',
        background: T.gradDark, cursor:'pointer', color:'transparent', padding:0,
        boxShadow:'0 3px 0 rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,230,160,0.35)',
        filter: hover?'brightness(1.15)':'none'
      }}
    >
      <span style={{
        position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'var(--font-num)', fontWeight:800, fontSize:size*0.45, lineHeight:1,
        background:T.gradGoldText, WebkitBackgroundClip:'text', backgroundClip:'text', color:'transparent',
        WebkitTextStroke:`0.5px ${T.goldShadow}`
      }}>{glyph}</span>
    </button>
  );
}

function HpBar({ hp, maxHp, team }) {
  const pct = Math.max(0, hp/maxHp);
  const grad = pct>0.5
    ? 'linear-gradient(180deg,#7fe9a3,#39d274 55%,#1a8040)'
    : pct>0.25
    ? 'linear-gradient(180deg,#ffd27a,#ffb020 55%,#a56800)'
    : 'linear-gradient(180deg,#ff8a7a,#e84a3c 55%,#8a1e12)';
  return (
    <div style={{
      height:10, borderRadius:999, background:'#1a0f0f', overflow:'hidden', position:'relative',
      boxShadow:`inset 0 1px 2px rgba(0,0,0,0.6), inset 0 0 0 1px ${T.goldShadow}`
    }}>
      <div style={{
        width:`${pct*100}%`, height:'100%', background:grad, borderRadius:999,
        boxShadow:'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.25)',
        transition:'width 380ms cubic-bezier(0.22,1,0.36,1)'
      }}/>
    </div>
  );
}

function PortraitOrb({ tex, teamColor, size=56, alive=true }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:'50%', position:'relative', overflow:'hidden',
      background:'#061a33',
      boxShadow:`0 0 0 2px ${T.goldShadow}, 0 0 0 4px ${T.gold}, 0 0 0 6px ${T.goldShadow}, 0 3px 8px rgba(0,0,0,0.5), 0 0 12px ${teamColor}55`
    }}>
      {tex && <img src={`../../assets/spirits/${tex}.png`} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 20%', filter:alive?'none':'grayscale(1) brightness(0.4)'}}/>}
      {!alive && <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#ff6060',fontSize:size*0.5,fontWeight:800,textShadow:'0 2px 4px #000'}}>✕</div>}
    </div>
  );
}

// ─── spirit panel (left or right) ───────────────────────────────────────────

function SpiritPanel({ side, roster, coin, bet, dmg, skill }) {
  const teamColor = side==='A' ? T.teamA : T.teamB;
  const teamGlow = side==='A' ? T.teamAglow : T.teamBglow;
  const label = side==='A' ? '青龍陣' : '朱雀陣';
  const engLabel = side==='A' ? 'AZURE' : 'VERMILION';

  return (
    <div style={{
      width:210, height:580, position:'absolute', top:64, [side==='A'?'left':'right']:14,
      display:'flex', flexDirection:'column', gap:10
    }}>
      {/* Team banner */}
      <GoldFrame radius={12} style={{padding:'6px 0 5px'}}>
        <div style={{textAlign:'center', fontFamily:'var(--font-display)', fontSize:18,
          color:'transparent', WebkitBackgroundClip:'text', backgroundClip:'text',
          background:T.gradGoldText, WebkitTextStroke:`1px ${T.goldShadow}`,
          filter:`drop-shadow(0 2px 0 ${T.goldShadow})`, letterSpacing:'0.1em'}}>{label}</div>
        <div style={{textAlign:'center', fontSize:9, letterSpacing:'0.3em', color:teamGlow, fontWeight:700, marginTop:2}}>{engLabel}</div>
      </GoldFrame>

      {/* Spirit stack */}
      {roster.map((u,i) => (
        <GoldFrame key={u.id} radius={10} style={{padding:8, background: u.hp<=0?'rgba(30,6,6,0.85)':T.panel}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <PortraitOrb tex={u.tex} teamColor={teamColor} size={44} alive={u.hp>0}/>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                <div style={{fontFamily:'var(--font-title)', fontWeight:900, fontSize:14, color:T.cream, textShadow:`0 1px 2px ${T.seaAbyss}`}}>{u.name}</div>
                <div style={{fontFamily:'var(--font-num)', fontSize:11, fontWeight:800, color:T.cream, fontVariantNumeric:'tabular-nums', opacity:0.85}}>{u.hp}/{u.maxHp}</div>
              </div>
              <div style={{marginTop:4}}><HpBar hp={u.hp} maxHp={u.maxHp} team={side}/></div>
            </div>
          </div>
        </GoldFrame>
      ))}

      {/* Coin + Bet + Recent DMG */}
      <GoldFrame radius={12} style={{padding:'8px 12px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontSize:9, letterSpacing:'0.22em', color:T.muted, textTransform:'uppercase', fontWeight:700}}>金幣</div>
            <GoldText size={18} family="var(--font-num)" stroke={0.5} glow={false}>${coin.toLocaleString()}</GoldText>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:9, letterSpacing:'0.22em', color:T.muted, textTransform:'uppercase', fontWeight:700}}>押注</div>
            <div style={{fontFamily:'var(--font-num)', fontSize:14, fontWeight:800, color:T.cream}}>${bet}</div>
          </div>
        </div>
        {dmg>0 && (
          <div style={{marginTop:6, padding:'4px 8px', borderRadius:6, background:`${teamColor}33`, border:`1px solid ${teamColor}`, textAlign:'center'}}>
            <span style={{color:teamGlow, fontSize:12, fontWeight:800, letterSpacing:'0.1em'}}>暴擊 -{dmg}</span>
          </div>
        )}
        {skill && (
          <div style={{marginTop:6, padding:'4px 8px', borderRadius:6, background:'rgba(181,23,158,0.25)', border:`1px solid #b5179e`, textAlign:'center', animation:'skillpulse 600ms ease-out'}}>
            <span style={{color:'#ffbef0', fontSize:11, fontWeight:800, letterSpacing:'0.1em'}}>★ {skill}</span>
          </div>
        )}
      </GoldFrame>
    </div>
  );
}

// ─── reel ───────────────────────────────────────────────────────────────────

function ReelCell({ sym, spinning, winning }) {
  return (
    <div style={{
      width:58, height:54, borderRadius:8, background:sym.grad,
      display:'flex', alignItems:'center', justifyContent:'center',
      color:'#fff', fontSize:24, fontWeight:900, fontFamily:'var(--font-title)',
      textShadow:'0 2px 3px rgba(0,0,0,0.6)',
      boxShadow: winning
        ? `inset 0 -3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 2px ${T.goldLight}, 0 0 14px ${T.goldLight}`
        : 'inset 0 -3px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
      transform: spinning ? 'translateY(-2px)' : 'none',
      transition:'transform 80ms, box-shadow 180ms'
    }}>
      {sym.label}
    </div>
  );
}

function Reel({ grid, spinning, winMask }) {
  return (
    <div style={{position:'relative', padding:12, borderRadius:14, background:T.inlay,
      boxShadow:'inset 0 2px 8px rgba(0,0,0,0.9)', background_clip:'padding-box'}}>
      <div style={{
        position:'absolute', inset:-3, borderRadius:14, padding:3,
        background: T.gradGoldV,
        WebkitMask:'linear-gradient(#000,#000) content-box, linear-gradient(#000,#000)',
        WebkitMaskComposite:'xor', maskComposite:'exclude', pointerEvents:'none'
      }}/>
      <div style={{display:'grid', gridTemplateColumns:'repeat(5,58px)', gridTemplateRows:'repeat(4,54px)', gap:5}}>
        {grid.map((row,r) => row.map((sym,c) => {
          const isWin = winMask && winMask[r] && winMask[r][c];
          return <ReelCell key={`${r}-${c}`} sym={sym} spinning={spinning} winning={isWin}/>;
        }))}
      </div>
    </div>
  );
}

// ─── paytable strip (the small 5-icon row above the reel in ref image) ─────

function PaytableStrip() {
  const items = [
    { grad:SYM[3].grad, label:'龜', mult:'×8' },
    { grad:SYM[4].grad, label:'朱', mult:'×12' },
    { grad:SYM[7].grad, label:'龍', mult:'×25' },
    { grad:SYM[6].grad, label:'麟', mult:'×125' },
    { grad:SYM[8].grad, label:'★', mult:'×500' },
  ];
  return (
    <GoldFrame radius={14} style={{padding:'8px 14px'}}>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        {items.map((it,i) => (
          <div key={i} style={{display:'flex', alignItems:'center', gap:6}}>
            <div style={{width:40, height:40, borderRadius:10, background:it.grad,
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:18, fontWeight:900,
              fontFamily:'var(--font-title)', textShadow:'0 1px 2px rgba(0,0,0,0.6)',
              boxShadow:'inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'}}>{it.label}</div>
            <GoldText size={18} family="var(--font-num)" stroke={0.5}>{it.mult}</GoldText>
          </div>
        ))}
      </div>
    </GoldFrame>
  );
}

// ─── header ─────────────────────────────────────────────────────────────────

function Header({ level, coin, round }) {
  return (
    <div style={{position:'absolute', top:10, left:16, right:16, display:'flex', justifyContent:'space-between', alignItems:'center', zIndex:5}}>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <IconBtn glyph="≡"/>
        <GoldFrame radius={999} style={{padding:'6px 14px'}}>
          <div style={{display:'flex', alignItems:'center', gap:6}}>
            <span style={{fontSize:16}}>⭐</span>
            <GoldText size={15} family="var(--font-num)" stroke={0.5} glow={false}>LV.{level}</GoldText>
          </div>
        </GoldFrame>
        <GoldFrame radius={999} style={{padding:'6px 16px'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{color:T.goldLight, fontSize:14}}>◆</span>
            <GoldText size={16} family="var(--font-num)" stroke={0.5} glow={false}>{coin.toLocaleString()}</GoldText>
          </div>
        </GoldFrame>
      </div>
      <div style={{fontFamily:'var(--font-title)', fontWeight:900, color:T.muted, letterSpacing:'0.28em', fontSize:13}}>
        ROUND {String(round).padStart(2,'0')}
      </div>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <IconBtn glyph="♪"/>
        <Btn variant="red" style={{height:40, padding:'0 16px'}}>🎁 商城</Btn>
      </div>
    </div>
  );
}

// ─── center hero (VS badge + title) ─────────────────────────────────────────

function CenterTitle({ round }) {
  return (
    <div style={{position:'absolute', top:62, left:0, right:0, textAlign:'center', pointerEvents:'none', zIndex:3}}>
      <GoldText size={54} family="var(--font-display)" stroke={1.5}>
        雀靈戰記
      </GoldText>
      <div style={{marginTop:2, fontSize:10, letterSpacing:'0.4em', color:T.seaCaustic, fontWeight:700}}>BATTLE OF SPIRITS</div>
    </div>
  );
}

// ─── win line overlay ──────────────────────────────────────────────────────

function WinLine({ points, color }) {
  const cellW = 58, cellH = 54, gap = 5, pad = 12;
  const cx = c => pad + c*(cellW+gap) + cellW/2;
  const cy = r => pad + r*(cellH+gap) + cellH/2;
  const d = points.map((p,i) => `${i===0?'M':'L'} ${cx(p[0])} ${cy(p[1])}`).join(' ');
  return (
    <svg style={{position:'absolute', inset:0, pointerEvents:'none'}} width="336" height="252">
      <path d={d} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.95}
        style={{filter:`drop-shadow(0 0 6px ${color})`}}>
        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite"/>
      </path>
    </svg>
  );
}

// ─── big win overlay ───────────────────────────────────────────────────────

function BigWinOverlay({ kind, amount, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [onClose]);

  const label = kind==='mega' ? 'MEGA WIN' : kind==='big' ? 'BIG WIN' : '大獲全勝';
  const ch = kind==='mega' ? '天降橫財' : kind==='big' ? '雷霆萬鈞' : '滿載而歸';

  return (
    <div style={{position:'absolute', inset:0, zIndex:100, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', animation:'fadein 220ms ease-out'}}>
      {/* Ray burst bg */}
      <div style={{position:'absolute', inset:0, background:'radial-gradient(circle at center, rgba(255,201,77,0.35), transparent 55%)', animation:'rayspin 12s linear infinite'}}/>
      {Array.from({length:16}).map((_,i) => (
        <div key={i} style={{position:'absolute', top:'50%', left:'50%', width:4, height:600,
          background:`linear-gradient(180deg, transparent, ${T.goldLight}88, transparent)`,
          transformOrigin:'center center', transform:`translate(-50%,-50%) rotate(${i*22.5}deg)`,
          animation:'rayspin 18s linear infinite'}}/>
      ))}

      <div style={{fontFamily:'var(--font-display)', fontSize:32, color:'transparent',
        background:T.gradGoldText, WebkitBackgroundClip:'text', backgroundClip:'text',
        WebkitTextStroke:`1px ${T.goldShadow}`, letterSpacing:'0.4em',
        filter:`drop-shadow(0 2px 0 ${T.goldShadow})`, animation:'pop 800ms ease-out', zIndex:2}}>
        {ch}
      </div>
      <div style={{fontFamily:'var(--font-display)', fontSize:120, color:'transparent', marginTop:-10,
        background:T.gradGoldText, WebkitBackgroundClip:'text', backgroundClip:'text',
        WebkitTextStroke:`3px ${T.goldShadow}`,
        filter:`drop-shadow(0 8px 0 ${T.goldShadow}) drop-shadow(0 0 30px rgba(255,201,77,0.7))`,
        animation:'popBig 1200ms cubic-bezier(0.34,1.56,0.64,1)', zIndex:2}}>
        {label}
      </div>
      <TickerNum amount={amount}/>
      <div onClick={onClose} style={{marginTop:24, color:T.muted, fontSize:12, letterSpacing:'0.28em', cursor:'pointer', zIndex:2}}>TAP TO CONTINUE ›</div>
    </div>
  );
}

function TickerNum({ amount }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    const steps = 40; const dur = 1400;
    let i = 0;
    const id = setInterval(() => {
      i++; setV(Math.round(amount * (i/steps)));
      if (i>=steps) clearInterval(id);
    }, dur/steps);
    return () => clearInterval(id);
  }, [amount]);
  return (
    <div style={{marginTop:4, fontFamily:'var(--font-num)', fontSize:64, fontWeight:900, color:'transparent',
      background:T.gradGoldText, WebkitBackgroundClip:'text', backgroundClip:'text',
      WebkitTextStroke:`1.5px ${T.goldShadow}`, fontVariantNumeric:'tabular-nums',
      filter:`drop-shadow(0 4px 0 ${T.goldShadow}) drop-shadow(0 0 20px rgba(255,201,77,0.5))`, zIndex:2}}>
      ${v.toLocaleString()}
    </div>
  );
}

// ─── bottom bar ────────────────────────────────────────────────────────────

function BottomBar({ bet, onBetChange, onSpin, mode, onMax }) {
  const spinLabel = mode==='spinning' ? '旋轉中' : mode==='gameover' ? '再戰一場' : '押注';
  const spinSub = mode==='idle' ? '長按自動旋轉' : '';
  return (
    <div style={{position:'absolute', bottom:14, left:240, right:240, display:'flex', alignItems:'center', justifyContent:'center', gap:12, zIndex:4}}>
      {/* bet controller */}
      <GoldFrame radius={12} style={{padding:'6px 10px', minWidth:140}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:9, letterSpacing:'0.22em', color:T.muted, textTransform:'uppercase', fontWeight:700}}>總押注</div>
          <GoldText size={20} family="var(--font-num)" stroke={0.5} glow={false}>${bet.toLocaleString()}</GoldText>
        </div>
        <div style={{display:'flex', gap:6, marginTop:6, justifyContent:'center'}}>
          <button onClick={()=>onBetChange(-1)} style={{width:30,height:30,borderRadius:999,border:`2px solid ${T.goldShadow}`,background:T.gradDark,color:T.goldLight,fontSize:18,fontWeight:900,cursor:'pointer'}}>−</button>
          <button onClick={()=>onBetChange(1)}  style={{width:30,height:30,borderRadius:999,border:`2px solid ${T.goldShadow}`,background:T.gradDark,color:T.goldLight,fontSize:18,fontWeight:900,cursor:'pointer'}}>+</button>
        </div>
      </GoldFrame>

      <Btn variant="green" onClick={onSpin} disabled={mode==='spinning'} sub={spinSub}
        style={{minWidth:180, height:58, fontSize:20}}>
        {spinLabel}
      </Btn>

      <Btn variant="gold" onClick={onMax} style={{minWidth:80, height:50, fontSize:13}}>
        最大<br/>押注
      </Btn>

      {/* Bonus wheel */}
      <div style={{position:'relative', width:60, height:60}}>
        <div style={{
          position:'absolute', inset:0, borderRadius:'50%', background:T.gradGoldV,
          boxShadow:`0 0 20px rgba(255,201,77,0.6), 0 4px 10px rgba(0,0,0,0.5)`,
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'spinBonus 8s linear infinite'
        }}>
          <div style={{width:44,height:44,borderRadius:'50%',background:T.seaAbyss,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{color:T.goldLight, fontSize:18, fontWeight:900}}>寶</span>
          </div>
        </div>
        <div style={{position:'absolute', bottom:-12, left:0, right:0, textAlign:'center', fontSize:8, color:T.goldLight, fontWeight:700, letterSpacing:'0.15em'}}>發財樹</div>
      </div>
    </div>
  );
}

// ─── battle log (kept compact at top-right below header) ───────────────────

function BattleLog({ entries }) {
  return (
    <div style={{position:'absolute', bottom:96, left:240, right:240, height:24, padding:'3px 10px',
      background:'rgba(2,10,24,0.7)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', gap:20,
      fontSize:12, color:T.muted, fontFamily:'var(--font-body)', zIndex:4,
      boxShadow:'inset 0 1px 3px rgba(0,0,0,0.6)'}}>
      {entries.slice(-3).map((e,i,arr) => (
        <span key={i} style={{color:e.color, opacity: 0.45 + (i/arr.length)*0.55}}>{e.text}</span>
      ))}
    </div>
  );
}

// ─── the scene ─────────────────────────────────────────────────────────────

function GameScene() {
  const [grid, setGrid] = React.useState(makeGrid);
  const [mode, setMode] = React.useState('idle');
  const [round, setRound] = React.useState(1);
  const [coinA, setCoinA] = React.useState(15866280);
  const [rosterA, setRosterA] = React.useState(ROSTER_A);
  const [rosterB, setRosterB] = React.useState(ROSTER_B);
  const [bet, setBet] = React.useState(15000);
  const [winMask, setWinMask] = React.useState(null);
  const [skillA, setSkillA] = React.useState(null);
  const [skillB, setSkillB] = React.useState(null);
  const [dmgA, setDmgA] = React.useState(0);
  const [dmgB, setDmgB] = React.useState(0);
  const [log, setLog] = React.useState([{text:'戰局開啟 · 青龍 vs 朱雀', color:T.goldLight}]);
  const [bigWin, setBigWin] = React.useState(null);
  const [shake, setShake] = React.useState(false);

  function addLog(text, color) { setLog(l => [...l.slice(-10), {text, color}]); }

  function spin() {
    if (mode==='spinning') return;
    if (mode==='gameover') {
      setRosterA(ROSTER_A.map(u=>({...u}))); setRosterB(ROSTER_B.map(u=>({...u})));
      setRound(1); setMode('idle'); setLog([{text:'再戰一場', color:T.goldLight}]); return;
    }
    setMode('spinning'); setWinMask(null);
    const shuffle = setInterval(()=>setGrid(makeGrid()), 80);
    setTimeout(() => {
      clearInterval(shuffle);
      const g = makeGrid();
      setGrid(g);
      resolve(g);
    }, 1500);
  }

  function resolve(g) {
    const nextR = round + 1;
    setRound(nextR);
    const dA = [0,220,340,180,0,0,450,260][Math.floor(Math.random()*8)];
    const dB = [0,120,0,200,340,0,180,280][Math.floor(Math.random()*8)];
    setDmgA(dA); setDmgB(dB);

    // Win mask: pick a diagonal-ish path when there's a win
    const mask = Array.from({length:4},()=>Array(5).fill(false));
    if (dA>0 || dB>0) {
      const row0 = Math.floor(Math.random()*4);
      for (let c=0;c<5;c++) {
        const r = Math.max(0, Math.min(3, row0 + (c%2===0?0:(Math.random()<0.5?-1:1))));
        mask[r][c] = true;
      }
      setWinMask(mask);
    }

    // Apply damage
    if (dA>0) { setRosterB(r => applyDmg(r, dA)); addLog(`青龍陣出擊 -${dA}`, T.teamAglow); setShake(dA>300); setTimeout(()=>setShake(false),260); }
    if (dB>0) { setRosterA(r => applyDmg(r, dB)); addLog(`朱雀陣反擊 -${dB}`, T.teamBglow); }
    if (dA===0 && dB===0) addLog(`第 ${nextR} 回合 · 無連線`, T.muted);

    if (Math.random()<0.3) { const sk='龍吟雷霆'; setSkillA(sk); addLog(`★ ${sk}`, '#ffbef0'); setTimeout(()=>setSkillA(null),1800); }
    if (Math.random()<0.3) { const sk='涅槃重生'; setSkillB(sk); setTimeout(()=>setSkillB(null),1800); }

    setCoinA(c => c - bet + Math.floor((dA+dB)*8));

    // Big win trigger
    const total = dA + dB;
    if (total > 600) {
      const amt = total * bet * 0.08;
      setTimeout(() => setBigWin({ kind: total>900?'mega':'big', amount: Math.floor(amt) }), 900);
    }

    setTimeout(() => {
      setMode('idle');
      setTimeout(()=>setWinMask(null), 1500);
    }, 700);
  }

  function applyDmg(roster, dmg) {
    const next = roster.map(u=>({...u}));
    let rem = dmg;
    for (const u of next) { if (u.hp<=0) continue; const t = Math.min(u.hp, rem); u.hp -= t; rem -= t; if (rem<=0) break; }
    return next;
  }

  return (
    <div style={{
      width:1280, height:720, position:'relative', overflow:'hidden',
      background: `
        radial-gradient(ellipse at 50% 0%, ${T.seaCaustic}22, transparent 40%),
        radial-gradient(ellipse at 50% 30%, ${T.seaLight}33, transparent 55%),
        linear-gradient(180deg, ${T.seaMid} 0%, ${T.seaDeep} 45%, ${T.seaAbyss} 100%)
      `,
      color:'#fff', fontFamily:'var(--font-body)',
      transform: shake ? `translate(${(Math.random()*2-1)*8}px, ${(Math.random()*2-1)*4}px)` : 'none',
      transition: 'transform 50ms'
    }}>
      <style>{`
        @keyframes rayspin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes pop { from { transform: scale(0.3); opacity:0 } to { transform: scale(1); opacity:1 } }
        @keyframes popBig { 0% { transform: scale(0.2); opacity:0 } 60% { transform: scale(1.15); opacity:1 } 100% { transform: scale(1); opacity:1 } }
        @keyframes fadein { from { opacity:0 } to { opacity:1 } }
        @keyframes spinBonus { from { transform: rotate(0) } to { transform: rotate(360deg) } }
        @keyframes skillpulse { from { transform: scale(0.9); opacity:0.5 } to { transform: scale(1); opacity:1 } }
      `}</style>

      {/* Caustic light rays */}
      <div style={{position:'absolute', top:-40, left:0, right:0, height:240, pointerEvents:'none',
        background:`conic-gradient(from 200deg at 50% 0%, transparent 0deg, ${T.seaCaustic}22 20deg, transparent 40deg, ${T.seaCaustic}18 80deg, transparent 120deg, ${T.seaCaustic}15 160deg, transparent 200deg, ${T.seaCaustic}22 240deg, transparent 280deg, ${T.seaCaustic}18 320deg, transparent 360deg)`,
        opacity:0.7, mixBlendMode:'screen'}}/>

      {/* Underwater floor silhouette */}
      <div style={{position:'absolute', bottom:0, left:0, right:0, height:180, pointerEvents:'none',
        background:`linear-gradient(180deg, transparent, ${T.seaAbyss})`}}/>

      {/* Spirit panels */}
      <SpiritPanel side="A" roster={rosterA} coin={coinA} bet={bet} dmg={dmgA} skill={skillA}/>
      <SpiritPanel side="B" roster={rosterB} coin={15866280} bet={bet} dmg={dmgB} skill={skillB}/>

      {/* Header */}
      <Header level={4392} coin={coinA} round={round}/>

      {/* Center hero */}
      <CenterTitle round={round}/>

      {/* Central stage area — character placeholder */}
      <div style={{position:'absolute', top:130, left:240, right:240, height:120, display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{
          width:300, height:110, borderRadius:12,
          background:`repeating-linear-gradient(45deg, rgba(255,255,255,0.04), rgba(255,255,255,0.04) 12px, rgba(255,255,255,0.08) 12px, rgba(255,255,255,0.08) 24px), ${T.panel}`,
          border:`2px dashed ${T.goldShadow}`,
          display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:4
        }}>
          <div style={{fontSize:10, letterSpacing:'0.3em', color:T.muted, fontWeight:700, textTransform:'uppercase'}}>Hero Art Placeholder</div>
          <div style={{fontFamily:'var(--font-title)', fontSize:13, color:T.cream, fontWeight:700}}>主視覺角色立繪</div>
          <div style={{fontSize:9, color:T.muted}}>320 × 140 · painted character</div>
        </div>
      </div>

      {/* Paytable strip */}
      <div style={{position:'absolute', top:276, left:'50%', transform:'translateX(-50%)', zIndex:3}}>
        <PaytableStrip/>
      </div>

      {/* Reel */}
      <div style={{position:'absolute', top:336, left:'50%', transform:'translateX(-50%)', zIndex:3}}>
        <div style={{position:'relative'}}>
          <Reel grid={grid} spinning={mode==='spinning'} winMask={winMask}/>
          {winMask && (() => {
            const pts = [];
            for (let c=0;c<5;c++) {
              const row = winMask.findIndex((row,r)=>row[c]);
              if (row>=0) pts.push([c,row]);
            }
            return <WinLine points={pts} color={T.goldLight}/>;
          })()}
        </div>
      </div>

      {/* Battle log */}
      <BattleLog entries={log}/>

      {/* Bottom bar */}
      <BottomBar bet={bet} onBetChange={(d)=>setBet(b=>Math.max(1000, b + d*1000))} onSpin={spin} mode={mode} onMax={()=>setBet(100000)}/>

      {/* Big win overlay */}
      {bigWin && <BigWinOverlay kind={bigWin.kind} amount={bigWin.amount} onClose={()=>setBigWin(null)}/>}
    </div>
  );
}

window.GameScene = GameScene;
