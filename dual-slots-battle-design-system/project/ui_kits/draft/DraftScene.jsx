// DraftScene — 3 variants at 1280x720
// Uses flat dark cyber-east-asian tokens (not the gold/PGSoft style)

const C = {
  bg:'#0f0f1a', bgPanel:'#1a1a2e', bgCell:'#16213e',
  borderNormal:'#334466', borderGold:'#f1c40f',
  playerA:'#3498db', playerB:'#e74c3c',
  white:'#ffffff', muted:'#7f8c9a',
  btnIdle:'#e67e22', btnHover:'#f39c12',
  coin:'#f1c40f',
  // derived
  dragon:'#3498db', tiger:'#ecf0f1', vermilion:'#e74c3c', tortoise:'#9b59b6',
};

const SPIRITS = [
  { id:'meng', tex:'mengchenzhang', zh:'孟辰璋', py:'Mengchenzhang', beast:'蒼龍', beastEn:'Azure', element:'索', rarity:'SR',  hp:1800, atk:240, coin:120, skill:'龍吟雷霆', skillDesc:'縱列連線造成額外 30% 傷害', color:C.dragon },
  { id:'cang', tex:'canlan',       zh:'蒼嵐',   py:'Canlan',       beast:'蒼龍', beastEn:'Azure', element:'索', rarity:'R',   hp:1500, atk:180, coin:90,  skill:'青鋒斬', skillDesc:'連線時機率追加一次攻擊', color:C.dragon },
  { id:'yin',  tex:'yin',          zh:'寅',     py:'Yin',          beast:'白虎', beastEn:'Tiger', element:'萬', rarity:'SR',  hp:2100, atk:220, coin:100, skill:'裂山拳', skillDesc:'首回合附加 20% 破甲', color:C.tiger },
  { id:'luo',  tex:'luoluo',       zh:'珞洛',   py:'Luoluo',       beast:'白虎', beastEn:'Tiger', element:'萬', rarity:'R',   hp:1600, atk:200, coin:85,  skill:'柔勁',   skillDesc:'受擊時 15% 反彈傷害', color:C.tiger },
  { id:'ling', tex:'lingyu',       zh:'凌羽',   py:'Lingyu',       beast:'朱雀', beastEn:'Vermil',element:'字', rarity:'SSR', hp:1700, atk:280, coin:150, skill:'九霄焚天', skillDesc:'Scatter 觸發時全體火焰加持', color:C.vermilion },
  { id:'zhu',  tex:'zhuluan',      zh:'朱鸞',   py:'Zhuluan',      beast:'朱雀', beastEn:'Vermil',element:'字', rarity:'SR',  hp:1550, atk:250, coin:110, skill:'燎原',   skillDesc:'連續連線累積傷害倍率', color:C.vermilion },
  { id:'xuan', tex:'xuanmo',       zh:'玄墨',   py:'Xuanmo',       beast:'玄武', beastEn:'Tortoise',element:'筒', rarity:'SSR', hp:2400, atk:200, coin:130, skill:'玄水盾',  skillDesc:'每 3 回合施加護盾 30% HP', color:C.tortoise },
  { id:'zhao', tex:'zhaoyu',       zh:'朝雨',   py:'Zhaoyu',       beast:'玄武', beastEn:'Tortoise',element:'筒', rarity:'R',   hp:1900, atk:170, coin:80,  skill:'蛇陣',   skillDesc:'陣亡後留下毒陣持續 2 回合', color:C.tortoise },
];

const RARITY_STYLE = {
  R:   { bg:'#2c3e50', fg:'#bdc3c7', label:'R' },
  SR:  { bg:'#d4a024', fg:'#1a1a2e', label:'SR' },
  SSR: { bg:'linear-gradient(90deg, #ff6ec7, #f1c40f, #3498db)', fg:'#0f0f1a', label:'SSR' },
};

// ─────────────────────────────────────────────────────────────────────────
// Shared shell — each variant lives in its own 1280×720 box, stacked vertically
// ─────────────────────────────────────────────────────────────────────────

function VariantShell({ label, caption, children }) {
  return (
    <div style={{marginBottom:40}}>
      <div style={{display:'flex', alignItems:'baseline', gap:14, marginBottom:10, fontFamily:'system-ui, sans-serif'}}>
        <div style={{fontSize:28, fontWeight:800, color:C.coin, letterSpacing:'0.04em'}}>{label}</div>
        <div style={{fontSize:15, color:C.muted}}>{caption}</div>
      </div>
      <div style={{
        width:1280, height:720, background:C.bg, position:'relative', overflow:'hidden',
        borderRadius:14, boxShadow:'0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px #222',
        fontFamily:'"Noto Sans TC","PingFang TC",system-ui,sans-serif', color:C.white
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── common bits ────────────────────────────────────────────────────────

function RarityPill({ rarity, size=12 }) {
  const s = RARITY_STYLE[rarity];
  const isSSR = rarity==='SSR';
  return (
    <span style={{
      display:'inline-block', padding:`${size*0.18}px ${size*0.6}px`, borderRadius:999,
      background: isSSR ? s.bg : s.bg,
      color:s.fg, fontSize:size, fontWeight:900, letterSpacing:'0.18em', lineHeight:1,
      boxShadow: isSSR ? '0 0 12px rgba(241,196,15,0.5)' : 'none'
    }}>{s.label}</span>
  );
}

function BeastGlyph({ beast, color, size=14 }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:size*1.6, height:size*1.6, borderRadius:'50%',
      background:`${color}22`, border:`1px solid ${color}`,
      color:color, fontSize:size*0.9, fontWeight:800
    }}>{beast[0]}</span>
  );
}

function ElementChip({ element, size=13 }) {
  return (
    <span style={{
      display:'inline-block', padding:'3px 8px', borderRadius:4,
      background:C.bgCell, border:`1px solid ${C.borderNormal}`,
      color:C.white, fontSize:size, fontWeight:700, letterSpacing:'0.08em'
    }}>{element}</span>
  );
}

function Portrait({ tex, color, size=68, round=true }) {
  return (
    <div style={{
      width:size, height:size,
      borderRadius: round ? '50%' : '10px',
      background:`radial-gradient(circle at 50% 40%, ${color}44, ${C.bgCell} 70%)`,
      border:`2px solid ${color}`, overflow:'hidden', position:'relative',
      boxShadow:`0 4px 14px ${color}33`
    }}>
      <img src={`../../assets/spirits/${tex}.png`}
        style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 20%'}}/>
    </div>
  );
}

// Top title bar — shared
function TitleBar({ count, max=5, side='A' }) {
  const accent = side==='A' ? C.playerA : C.playerB;
  return (
    <div style={{
      height:56, borderBottom:`1px solid ${C.borderNormal}`, background:C.bgPanel,
      display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px'
    }}>
      <div style={{display:'flex', alignItems:'center', gap:14}}>
        <div style={{
          width:10, height:28, background:accent, borderRadius:2,
          boxShadow:`0 0 12px ${accent}`
        }}/>
        <div>
          <div style={{fontSize:18, fontWeight:900, letterSpacing:'0.18em'}}>SELECT YOUR SPIRITS</div>
          <div style={{fontSize:11, color:C.muted, letterSpacing:'0.22em', marginTop:1}}>
            選擇靈獸 · PLAYER {side} · 選 3 至 5 名
          </div>
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <div style={{fontSize:11, color:C.muted, letterSpacing:'0.18em'}}>SELECTED</div>
        <div style={{
          padding:'6px 18px', borderRadius:8, background:C.bgCell,
          border:`1px solid ${count>=3 ? C.borderGold : C.borderNormal}`
        }}>
          <span style={{fontSize:22, fontWeight:900, color: count>=3 ? C.coin : C.white, fontVariantNumeric:'tabular-nums'}}>{count}</span>
          <span style={{fontSize:14, color:C.muted, margin:'0 4px'}}>/</span>
          <span style={{fontSize:14, color:C.muted}}>{max}</span>
        </div>
      </div>
    </div>
  );
}

// Bottom action bar — shared
function ActionBar({ count, side='A' }) {
  const accent = side==='A' ? C.playerA : C.playerB;
  const ready = count>=3 && count<=5;
  return (
    <div style={{
      position:'absolute', left:0, right:0, bottom:0, height:68,
      background:C.bgPanel, borderTop:`1px solid ${C.borderNormal}`,
      display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', gap:16
    }}>
      <button style={{
        height:44, padding:'0 24px', borderRadius:8, border:`1px solid ${C.borderNormal}`,
        background:C.bgCell, color:C.muted, fontSize:14, fontWeight:700, letterSpacing:'0.18em', cursor:'pointer'
      }}>◂ BACK / 返回</button>

      <div style={{display:'flex', alignItems:'center', gap:10, color:C.muted, fontSize:12, letterSpacing:'0.16em'}}>
        <div style={{width:8, height:8, borderRadius:'50%', background:accent, boxShadow:`0 0 8px ${accent}`}}/>
        PLAYER {side} · {side==='A'?'AZURE':'VERMILION'} SIDE
      </div>

      <button disabled={!ready} style={{
        height:44, padding:'0 28px', borderRadius:8, border:'none',
        background: ready ? `linear-gradient(180deg, ${C.btnHover}, ${C.btnIdle})` : '#2a2a3a',
        color: ready ? '#1a1a2e' : C.muted,
        fontSize:15, fontWeight:900, letterSpacing:'0.18em',
        cursor: ready?'pointer':'not-allowed',
        boxShadow: ready ? '0 4px 0 rgba(0,0,0,0.35), 0 0 20px rgba(230,126,34,0.4)' : 'none'
      }}>
        {ready ? '確認出戰  CONFIRM ▸' : `尚需 ${Math.max(3-count,0)} 名`}
      </button>
    </div>
  );
}

// Decorative corner tile (mahjong 花 motif)
function CornerTile({ pos='tl' }) {
  const flip = pos==='tr' ? 'scaleX(-1)' : pos==='bl' ? 'scaleY(-1)' : pos==='br' ? 'scale(-1,-1)' : 'none';
  const top = pos.includes('t') ? 0 : 'auto';
  const bottom = pos.includes('b') ? 0 : 'auto';
  const left = pos.includes('l') ? 0 : 'auto';
  const right = pos.includes('r') ? 0 : 'auto';
  return (
    <svg width="36" height="36" style={{position:'absolute', top, bottom, left, right, transform:flip, opacity:0.3}}>
      <path d="M 0 14 L 0 0 L 14 0" stroke={C.coin} strokeWidth="1.5" fill="none"/>
      <circle cx="6" cy="6" r="1.5" fill={C.coin}/>
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// V1 — GALLERY GRID (4×2 cards + right preview)
// ═════════════════════════════════════════════════════════════════════════

function V1Card({ sp, selected, dimmed }) {
  return (
    <div style={{
      position:'relative', background:C.bgPanel,
      borderRadius:12, padding:10,
      border: selected ? `2px solid ${C.borderGold}` : `1px solid ${C.borderNormal}`,
      opacity: dimmed ? 0.4 : 1,
      boxShadow: selected ? `0 0 24px ${C.borderGold}55, inset 0 0 0 1px ${C.borderGold}33` : 'none',
      transition:'all 180ms'
    }}>
      <CornerTile pos="tl"/><CornerTile pos="tr"/><CornerTile pos="bl"/><CornerTile pos="br"/>
      {selected && (
        <div style={{position:'absolute', top:-8, right:-8, width:28, height:28, borderRadius:'50%',
          background:C.coin, color:'#0f0f1a', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:15, fontWeight:900, boxShadow:`0 0 12px ${C.coin}`, zIndex:2}}>✓</div>
      )}
      <div style={{display:'flex', gap:10}}>
        <Portrait tex={sp.tex} color={sp.color} size={76} round={false}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:4}}>
            <div style={{fontSize:17, fontWeight:900, color:C.white, lineHeight:1.1}}>{sp.zh}</div>
            <RarityPill rarity={sp.rarity} size={10}/>
          </div>
          <div style={{fontSize:11, color:C.muted, marginTop:2}}>{sp.py}</div>
          <div style={{display:'flex', gap:6, marginTop:6, alignItems:'center'}}>
            <BeastGlyph beast={sp.beast} color={sp.color} size={11}/>
            <ElementChip element={sp.element} size={11}/>
            <span style={{fontSize:10, color:C.muted, letterSpacing:'0.1em'}}>{sp.beastEn.toUpperCase()}</span>
          </div>
        </div>
      </div>
      <div style={{display:'flex', gap:8, marginTop:10, padding:'6px 8px', background:C.bgCell, borderRadius:6, fontSize:11}}>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{color:C.muted, fontSize:9, letterSpacing:'0.15em'}}>HP</div>
          <div style={{fontWeight:900, color:C.white, fontSize:13, fontVariantNumeric:'tabular-nums'}}>{sp.hp}</div>
        </div>
        <div style={{width:1, background:C.borderNormal}}/>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{color:C.muted, fontSize:9, letterSpacing:'0.15em'}}>ATK</div>
          <div style={{fontWeight:900, color:'#ff7a7a', fontSize:13, fontVariantNumeric:'tabular-nums'}}>{sp.atk}</div>
        </div>
        <div style={{width:1, background:C.borderNormal}}/>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{color:C.muted, fontSize:9, letterSpacing:'0.15em'}}>COIN</div>
          <div style={{fontWeight:900, color:C.coin, fontSize:13, fontVariantNumeric:'tabular-nums'}}>{sp.coin}</div>
        </div>
      </div>
      <div style={{marginTop:8, padding:'6px 8px', borderLeft:`2px solid ${sp.color}`, background:'rgba(0,0,0,0.25)'}}>
        <div style={{fontSize:12, fontWeight:800, color:sp.color, letterSpacing:'0.06em'}}>★ {sp.skill}</div>
        <div style={{fontSize:11, color:C.muted, marginTop:1, lineHeight:1.35}}>{sp.skillDesc}</div>
      </div>
    </div>
  );
}

function V1PreviewChip({ sp, slot }) {
  if (!sp) {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
        background:'rgba(0,0,0,0.25)', borderRadius:8, border:`1px dashed ${C.borderNormal}`,
        opacity:0.5
      }}>
        <div style={{width:36, height:36, borderRadius:'50%', border:`1px dashed ${C.borderNormal}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:14}}>{slot}</div>
        <div style={{fontSize:13, color:C.muted, letterSpacing:'0.1em'}}>空位 SLOT {slot}</div>
      </div>
    );
  }
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'6px 8px',
      background:C.bgCell, borderRadius:8, border:`1px solid ${sp.color}66`,
      position:'relative', overflow:'hidden'
    }}>
      <div style={{position:'absolute', left:0, top:0, bottom:0, width:3, background:sp.color}}/>
      <div style={{marginLeft:2}}>
        <Portrait tex={sp.tex} color={sp.color} size={40} round={false}/>
      </div>
      <div style={{flex:1}}>
        <div style={{fontSize:14, fontWeight:800, color:C.white}}>{sp.zh}</div>
        <div style={{fontSize:10, color:C.muted, letterSpacing:'0.1em'}}>{sp.beast} · {sp.element}</div>
      </div>
      <RarityPill rarity={sp.rarity} size={9}/>
    </div>
  );
}

function V1({ selectedIds }) {
  const selected = SPIRITS.filter(s => selectedIds.includes(s.id));
  const teamHp = selected.reduce((a,b)=>a+b.hp,0);
  const teamAtk = selected.reduce((a,b)=>a+b.atk,0);
  const teamCoin = selected.reduce((a,b)=>a+b.coin,0);

  return (
    <>
      <TitleBar count={selectedIds.length} side="A"/>
      <div style={{position:'absolute', top:56, left:0, right:0, bottom:68, display:'flex', padding:16, gap:16}}>
        {/* Grid */}
        <div style={{flex:1, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gridTemplateRows:'repeat(2, 1fr)', gap:12}}>
          {SPIRITS.map(sp => (
            <V1Card key={sp.id} sp={sp} selected={selectedIds.includes(sp.id)} dimmed={selectedIds.length>=5 && !selectedIds.includes(sp.id)}/>
          ))}
        </div>
        {/* Preview panel */}
        <div style={{width:260, background:C.bgPanel, borderRadius:12, border:`1px solid ${C.borderNormal}`, padding:14, display:'flex', flexDirection:'column', gap:8, position:'relative'}}>
          <CornerTile pos="tl"/><CornerTile pos="tr"/>
          <div style={{fontSize:13, fontWeight:900, color:C.playerA, letterSpacing:'0.2em'}}>YOUR ROSTER</div>
          <div style={{fontSize:10, color:C.muted, letterSpacing:'0.22em', marginTop:-4}}>出戰陣容</div>
          <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:4}}>
            {[1,2,3,4,5].map(i => <V1PreviewChip key={i} sp={selected[i-1]} slot={i}/>)}
          </div>
          <div style={{marginTop:'auto', padding:10, background:C.bgCell, borderRadius:8, borderTop:`2px solid ${C.coin}`}}>
            <div style={{fontSize:10, color:C.muted, letterSpacing:'0.2em', marginBottom:6}}>陣營總計 · TEAM TOTAL</div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
              <span style={{color:C.muted}}>HP</span>
              <span style={{fontWeight:900, fontVariantNumeric:'tabular-nums'}}>{teamHp.toLocaleString()}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
              <span style={{color:C.muted}}>ATK</span>
              <span style={{fontWeight:900, color:'#ff7a7a', fontVariantNumeric:'tabular-nums'}}>{teamAtk}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', fontSize:12}}>
              <span style={{color:C.muted}}>COIN</span>
              <span style={{fontWeight:900, color:C.coin, fontVariantNumeric:'tabular-nums'}}>{teamCoin}</span>
            </div>
          </div>
        </div>
      </div>
      <ActionBar count={selectedIds.length} side="A"/>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// V2 — SPLIT VIEW (2×4 list left, hero preview right)
// ═════════════════════════════════════════════════════════════════════════

function V2ListCard({ sp, selected, dimmed }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:8,
      background:C.bgPanel, borderRadius:10,
      border: selected ? `2px solid ${C.borderGold}` : `1px solid ${C.borderNormal}`,
      opacity: dimmed ? 0.4 : 1,
      boxShadow: selected ? `inset 0 0 0 1px ${C.borderGold}55, 0 0 16px ${C.borderGold}22` : 'none',
      position:'relative', minHeight:0, overflow:'hidden'
    }}>
      <div style={{width:4, height:50, background:sp.color, borderRadius:2, marginLeft:-2, flexShrink:0}}/>
      <Portrait tex={sp.tex} color={sp.color} size={50} round={false}/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
          <div>
            <span style={{fontSize:16, fontWeight:900, color:C.white}}>{sp.zh}</span>
            <span style={{fontSize:11, color:C.muted, marginLeft:6, letterSpacing:'0.06em'}}>{sp.py}</span>
          </div>
          <RarityPill rarity={sp.rarity} size={10}/>
        </div>
        <div style={{display:'flex', gap:6, marginTop:4, alignItems:'center', fontSize:11, color:C.muted}}>
          <span style={{color:sp.color, fontWeight:800}}>{sp.beast}</span>
          <span>·</span>
          <span>{sp.element}</span>
          <span>·</span>
          <span style={{color:'#ff7a7a'}}>HP {sp.hp}</span>
          <span style={{color:C.coin}}>ATK {sp.atk}</span>
        </div>
        <div style={{fontSize:11, color:sp.color, marginTop:3, letterSpacing:'0.04em'}}>★ {sp.skill}</div>
      </div>
      {selected && (
        <div style={{width:26, height:26, borderRadius:'50%', background:C.coin, color:'#0f0f1a',
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900,
          boxShadow:`0 0 10px ${C.coin}`}}>✓</div>
      )}
    </div>
  );
}

function V2HeroSlot({ sp, slot }) {
  if (!sp) {
    return (
      <div style={{
        flex:1, borderRadius:12, background:'rgba(0,0,0,0.25)',
        border:`2px dashed ${C.borderNormal}`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6
      }}>
        <div style={{width:40, height:40, borderRadius:'50%', border:`2px dashed ${C.borderNormal}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.muted, fontSize:18, fontWeight:900}}>{slot}</div>
        <div style={{fontSize:11, color:C.muted, letterSpacing:'0.2em'}}>EMPTY</div>
      </div>
    );
  }
  return (
    <div style={{
      flex:1, position:'relative', borderRadius:12, overflow:'hidden',
      background:`linear-gradient(180deg, ${sp.color}22, ${C.bgPanel} 60%)`,
      border:`2px solid ${sp.color}`,
      display:'flex', flexDirection:'column', padding:10
    }}>
      <div style={{position:'absolute', top:6, right:6}}><RarityPill rarity={sp.rarity} size={10}/></div>
      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{
          width:130, height:130, borderRadius:12, overflow:'hidden',
          background:`radial-gradient(circle at 50% 35%, ${sp.color}55, transparent 70%)`,
          display:'flex', alignItems:'center', justifyContent:'center'
        }}>
          <img src={`../../assets/spirits/${sp.tex}.png`} style={{width:'100%', height:'100%', objectFit:'contain', filter:`drop-shadow(0 6px 14px ${sp.color}88)`}}/>
        </div>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{fontSize:17, fontWeight:900, color:C.white}}>{sp.zh}</div>
        <div style={{fontSize:10, color:sp.color, letterSpacing:'0.14em', marginTop:1}}>{sp.beast} · {sp.element}</div>
      </div>
    </div>
  );
}

function V2({ selectedIds }) {
  const selected = SPIRITS.filter(s => selectedIds.includes(s.id));
  return (
    <>
      <TitleBar count={selectedIds.length} side="A"/>
      <div style={{position:'absolute', top:56, left:0, right:0, bottom:68, display:'flex', padding:16, gap:16}}>
        {/* List */}
        <div style={{width:'58%', display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'repeat(4, 1fr)', gap:6}}>
          {SPIRITS.map(sp => (
            <V2ListCard key={sp.id} sp={sp} selected={selectedIds.includes(sp.id)} dimmed={selectedIds.length>=5 && !selectedIds.includes(sp.id)}/>
          ))}
        </div>
        {/* Hero preview */}
        <div style={{flex:1, background:C.bgPanel, borderRadius:12, border:`1px solid ${C.borderNormal}`, padding:12, display:'flex', flexDirection:'column', gap:8, position:'relative'}}>
          <CornerTile pos="tl"/><CornerTile pos="tr"/><CornerTile pos="bl"/><CornerTile pos="br"/>
          <div style={{textAlign:'center', paddingBottom:4, borderBottom:`1px solid ${C.borderNormal}`}}>
            <div style={{fontSize:14, fontWeight:900, color:C.playerA, letterSpacing:'0.2em'}}>YOUR ROSTER</div>
            <div style={{fontSize:10, color:C.muted, letterSpacing:'0.22em'}}>出戰陣容 · 3 - 5 名</div>
          </div>
          <div style={{flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'1fr 1fr 1fr', gap:6}}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{gridColumn: i===5 ? '1 / -1' : 'auto'}}>
                <V2HeroSlot sp={selected[i-1]} slot={i}/>
              </div>
            ))}
          </div>
        </div>
      </div>
      <ActionBar count={selectedIds.length} side="A"/>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// V3 — CAROUSEL HAND (3×3 formation top, fanned cards bottom)
// ═════════════════════════════════════════════════════════════════════════

function V3FanCard({ sp, selected, angle, offsetX, dimmed }) {
  return (
    <div style={{
      position:'absolute', left:`calc(50% + ${offsetX}px)`, bottom:84,
      transform:`translateX(-50%) rotate(${angle}deg)`, transformOrigin:'center bottom',
      width:120, height:200,
      borderRadius:10, padding:8,
      background:C.bgPanel,
      border: selected ? `2px solid ${C.borderGold}` : `1px solid ${C.borderNormal}`,
      opacity: dimmed ? 0.5 : 1,
      boxShadow: selected ? `0 0 20px ${C.borderGold}88, 0 10px 24px rgba(0,0,0,0.5)` : '0 6px 14px rgba(0,0,0,0.5)',
      transition:'transform 220ms, bottom 220ms, box-shadow 220ms',
      display:'flex', flexDirection:'column', gap:4
    }}>
      {selected && (
        <div style={{position:'absolute', top:-10, right:-10, width:26, height:26, borderRadius:'50%',
          background:C.coin, color:'#0f0f1a', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:900, boxShadow:`0 0 12px ${C.coin}`, zIndex:3}}>✓</div>
      )}
      <div style={{position:'absolute', top:4, left:4}}><RarityPill rarity={sp.rarity} size={9}/></div>
      <div style={{
        height:90, marginTop:14, borderRadius:8,
        background:`radial-gradient(circle at 50% 35%, ${sp.color}55, ${C.bgCell} 70%)`,
        border:`1px solid ${sp.color}`,
        display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden'
      }}>
        <img src={`../../assets/spirits/${sp.tex}.png`} style={{width:'100%', height:'100%', objectFit:'cover', objectPosition:'center 15%'}}/>
      </div>
      <div style={{textAlign:'center', marginTop:2}}>
        <div style={{fontSize:14, fontWeight:900, color:C.white}}>{sp.zh}</div>
        <div style={{fontSize:9, color:sp.color, letterSpacing:'0.1em', marginTop:1}}>{sp.beast} · {sp.element}</div>
      </div>
      <div style={{display:'flex', gap:4, fontSize:9, marginTop:'auto', padding:'4px 2px', borderTop:`1px solid ${C.borderNormal}`}}>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{color:C.muted, fontSize:7, letterSpacing:'0.1em'}}>HP</div>
          <div style={{fontWeight:900, fontVariantNumeric:'tabular-nums'}}>{sp.hp}</div>
        </div>
        <div style={{flex:1, textAlign:'center'}}>
          <div style={{color:C.muted, fontSize:7, letterSpacing:'0.1em'}}>ATK</div>
          <div style={{fontWeight:900, color:'#ff7a7a', fontVariantNumeric:'tabular-nums'}}>{sp.atk}</div>
        </div>
      </div>
    </div>
  );
}

function V3FormationCell({ sp, row, col }) {
  const isFront = row===2;
  return (
    <div style={{
      aspectRatio:'1', borderRadius:10, position:'relative',
      background: sp ? `radial-gradient(circle at 50% 40%, ${sp.color}33, ${C.bgCell} 75%)` : 'rgba(0,0,0,0.2)',
      border: sp ? `2px solid ${sp.color}` : `1px dashed ${C.borderNormal}`,
      display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden',
      boxShadow: sp ? `0 0 14px ${sp.color}55, inset 0 -20px 30px rgba(0,0,0,0.3)` : 'none'
    }}>
      {/* Front-line marker */}
      {isFront && (
        <div style={{position:'absolute', top:4, left:4, fontSize:8, color:C.playerA, letterSpacing:'0.2em', fontWeight:900}}>FRONT</div>
      )}
      {sp ? (
        <>
          <img src={`../../assets/spirits/${sp.tex}.png`} style={{width:'85%', height:'85%', objectFit:'contain', filter:`drop-shadow(0 4px 10px ${sp.color}99)`}}/>
          <div style={{position:'absolute', bottom:4, left:4, right:4, textAlign:'center', fontSize:11, fontWeight:900, color:C.white, textShadow:'0 1px 3px #000'}}>{sp.zh}</div>
        </>
      ) : (
        <div style={{color:C.muted, fontSize:11, letterSpacing:'0.2em'}}>—</div>
      )}
    </div>
  );
}

function V3({ selectedIds }) {
  const selected = SPIRITS.filter(s => selectedIds.includes(s.id));
  // 3×3 formation: back row 0, mid row 1, front row 2
  // Place up to 5: [back-mid, mid-mid, front-left, front-mid, front-right]
  const slots = [null,null,null,null,null,null,null,null,null];
  const placements = [4,1,6,7,8]; // grid indices (0-8)
  selected.forEach((sp, i) => { if (placements[i] !== undefined) slots[placements[i]] = sp; });

  // Fan math
  const n = SPIRITS.length;
  const spread = 44; // total degrees
  const step = spread / (n-1);
  return (
    <>
      <TitleBar count={selectedIds.length} side="A"/>
      <div style={{position:'absolute', top:56, left:0, right:0, bottom:68, padding:'12px 16px 0'}}>
        {/* Formation + stats */}
        <div style={{display:'flex', gap:14, height:330}}>
          <div style={{width:330, background:C.bgPanel, borderRadius:12, border:`1px solid ${C.borderNormal}`, padding:12, position:'relative'}}>
            <CornerTile pos="tl"/><CornerTile pos="tr"/><CornerTile pos="bl"/><CornerTile pos="br"/>
            <div style={{fontSize:12, fontWeight:900, color:C.playerA, letterSpacing:'0.2em', marginBottom:2}}>BATTLE FORMATION</div>
            <div style={{fontSize:10, color:C.muted, letterSpacing:'0.22em', marginBottom:8}}>戰場佈陣 · 3 × 3</div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'1fr 1fr 1fr', gap:6, height:250}}>
              {slots.map((sp,i) => <V3FormationCell key={i} sp={sp} row={Math.floor(i/3)} col={i%3}/>)}
            </div>
          </div>

          {/* Team summary + skill chain */}
          <div style={{flex:1, display:'flex', flexDirection:'column', gap:12}}>
            <div style={{flex:1, background:C.bgPanel, borderRadius:12, border:`1px solid ${C.borderNormal}`, padding:14, position:'relative'}}>
              <CornerTile pos="tl"/><CornerTile pos="tr"/>
              <div style={{fontSize:12, fontWeight:900, color:C.coin, letterSpacing:'0.2em', marginBottom:2}}>LINEUP SYNERGY</div>
              <div style={{fontSize:10, color:C.muted, letterSpacing:'0.22em', marginBottom:10}}>陣容羈絆</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                {(() => {
                  const beastCounts = {};
                  selected.forEach(s => beastCounts[s.beast] = (beastCounts[s.beast]||0)+1);
                  const entries = Object.entries(beastCounts);
                  if (!entries.length) return <div style={{fontSize:12, color:C.muted, fontStyle:'italic'}}>選擇靈獸以啟動羈絆效果</div>;
                  return entries.map(([beast, count]) => {
                    const spirit = selected.find(s => s.beast===beast);
                    const active = count >= 2;
                    return (
                      <div key={beast} style={{
                        padding:'6px 10px', borderRadius:8,
                        background: active ? `${spirit.color}22` : C.bgCell,
                        border: `1px solid ${active ? spirit.color : C.borderNormal}`,
                        display:'flex', alignItems:'center', gap:8
                      }}>
                        <BeastGlyph beast={beast} color={spirit.color} size={13}/>
                        <div>
                          <div style={{fontSize:12, fontWeight:900, color: active ? spirit.color : C.muted}}>
                            {beast} ×{count} {active && '✓'}
                          </div>
                          <div style={{fontSize:9, color:C.muted, letterSpacing:'0.08em'}}>
                            {active ? '+15% 同族傷害' : '需 2 名啟動'}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            <div style={{height:100, background:C.bgPanel, borderRadius:12, border:`1px solid ${C.borderNormal}`, padding:12, display:'flex', alignItems:'center', justifyContent:'space-around'}}>
              {['HP','ATK','COIN'].map((k,i) => {
                const vals = [
                  selected.reduce((a,b)=>a+b.hp,0),
                  selected.reduce((a,b)=>a+b.atk,0),
                  selected.reduce((a,b)=>a+b.coin,0),
                ];
                const colors = [C.white, '#ff7a7a', C.coin];
                return (
                  <div key={k} style={{textAlign:'center'}}>
                    <div style={{fontSize:10, color:C.muted, letterSpacing:'0.22em'}}>{k}</div>
                    <div style={{fontSize:26, fontWeight:900, color:colors[i], fontVariantNumeric:'tabular-nums', marginTop:2}}>{vals[i].toLocaleString()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fan of cards */}
        <div style={{position:'relative', height:240, marginTop:8}}>
          <div style={{position:'absolute', top:0, left:16, right:16, fontSize:10, color:C.muted, letterSpacing:'0.24em'}}>靈獸手牌 · TAP TO ADD TO FORMATION</div>
          {SPIRITS.map((sp,i) => {
            const idx = i - (n-1)/2;
            const angle = idx * step;
            const offsetX = idx * 110;
            return <V3FanCard key={sp.id} sp={sp} angle={angle} offsetX={offsetX}
              selected={selectedIds.includes(sp.id)}
              dimmed={selectedIds.length>=5 && !selectedIds.includes(sp.id)}/>;
          })}
        </div>
      </div>
      <ActionBar count={selectedIds.length} side="A"/>
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Page shell — shows all 3 variants stacked
// ═════════════════════════════════════════════════════════════════════════

function DraftPage() {
  const sel = ['meng','ling','xuan']; // sample 3-picked state to show "ready" UI
  const sel4 = ['meng','ling','xuan','yin'];
  return (
    <div style={{padding:'30px 20px', background:'#05060a', minHeight:'100vh'}}>
      <div style={{maxWidth:1280, margin:'0 auto'}}>
        <div style={{marginBottom:30, color:C.white, fontFamily:'system-ui, sans-serif'}}>
          <div style={{fontSize:36, fontWeight:900, letterSpacing:'0.02em'}}>DraftScene · 選靈</div>
          <div style={{fontSize:14, color:C.muted, marginTop:6, maxWidth:780, lineHeight:1.5}}>
            三種佈局變體 · 8 靈獸 × 選 3–5 · 1280 × 720 · Player A (blue accent). V3 預覽已選 4 名以展示編隊。
          </div>
        </div>
        <VariantShell label="V1  ·  GALLERY GRID" caption="4×2 cards with side preview panel — classic, dense, scannable">
          <V1 selectedIds={sel}/>
        </VariantShell>
        <VariantShell label="V2  ·  SPLIT VIEW" caption="2×4 list on left, large hero preview on right — hero-centric, shows the team you're building">
          <V2 selectedIds={sel4}/>
        </VariantShell>
        <VariantShell label="V3  ·  CAROUSEL + FORMATION" caption="Fanned card hand below, live 3×3 formation preview above — see exactly where each spirit stands">
          <V3 selectedIds={sel4}/>
        </VariantShell>
      </div>
    </div>
  );
}

window.DraftPage = DraftPage;
