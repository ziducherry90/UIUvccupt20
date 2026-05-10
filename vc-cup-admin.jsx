import { useState, useEffect, useCallback } from "react";

// ── helpers ──────────────────────────────────────────────────────────────────
const TEAMS = ["UIU Rising Stars", "UIU Bluestockers", "UIU Thunderbirds", "UIU Masterminds"];
const TEAM_EMOJI = { "UIU Rising Stars": "🌟", "UIU Bluestockers": "🪷", "UIU Thunderbirds": "⚡", "UIU Masterminds": "🧠" };

const MATCHES_FIXTURE = [
  { id: 1, date: "12 May 2026", time: "9:00 AM",  home: "UIU Rising Stars",   away: "UIU Bluestockers"  },
  { id: 2, date: "12 May 2026", time: "1:00 PM",  home: "UIU Thunderbirds",   away: "UIU Masterminds"   },
  { id: 3, date: "13 May 2026", time: "9:00 AM",  home: "UIU Masterminds",    away: "UIU Rising Stars"  },
  { id: 4, date: "13 May 2026", time: "1:00 PM",  home: "UIU Bluestockers",   away: "UIU Thunderbirds"  },
  { id: 5, date: "14 May 2026", time: "9:00 AM",  home: "UIU Bluestockers",   away: "UIU Masterminds"   },
  { id: 6, date: "14 May 2026", time: "1:00 PM",  home: "UIU Thunderbirds",   away: "UIU Rising Stars"  },
];

const ICON_PLAYERS = [
  { name: "Mustafizur Rahman",           team: "UIU Rising Stars"   },
  { name: "Sk Abir Hossain",             team: "UIU Rising Stars"   },
  { name: "Md. Mostafizur Rahman Murad", team: "UIU Rising Stars"   },
  { name: "Mahadi Hasan (JTI)",          team: "UIU Rising Stars"   },
  { name: "Rasel Ahmed",                 team: "UIU Thunderbirds"   },
  { name: "Md. Rezuwan Iqbal",           team: "UIU Thunderbirds"   },
  { name: "Md. Hasan-In-Zaman Chowdhury",team: "UIU Thunderbirds"   },
  { name: "Abdullah Al Ansary (SCB)",    team: "UIU Thunderbirds"   },
  { name: "Shehab Hossain Hemal",        team: "UIU Masterminds"    },
  { name: "Md. Nazmul Hossain Sakib",    team: "UIU Masterminds"    },
  { name: "Sabbir Ahmed Shezan",         team: "UIU Masterminds"    },
  { name: "Ashfaque Hossain (GP)",       team: "UIU Masterminds"    },
  { name: "Md Mehedy Hasan",             team: "UIU Bluestockers"   },
  { name: "Md. Ehasanul Haque Chowdhary",team: "UIU Bluestockers"   },
  { name: "Arif Hossain",                team: "UIU Bluestockers"   },
  { name: "Sayeed M. Abid Arman (JTI)", team: "UIU Bluestockers"   },
];

const STORAGE_KEY = "vccup_admin_data_v1";
const API_BASE = "http://localhost:8787/api";
const ADMIN_PASSCODE = "matchreferee";
const AUTH_KEY = "vccup_admin_auth_v1";

const defaultState = () => ({
  matches: MATCHES_FIXTURE.map(m => ({
    ...m,
    status: "upcoming",   // upcoming | live | completed
    homeScore: "", homeWickets: "", homeOvers: "",
    awayScore: "", awayWickets: "", awayOvers: "",
    winner: "", resultSummary: "",
  })),
  points: TEAMS.map(t => ({ team: t, M:0, W:0, L:0, NR:0, pts:0, nrr:"0.000", form:[] })),
  stats: {
    runs: ICON_PLAYERS.map(p => ({ ...p, runs:0, balls:0, fours:0, sixes:0, hs:0 })),
    wickets: ICON_PLAYERS.map(p => ({ ...p, wickets:0, overs:"0", economy:"0.00", bestFigure:"" })),
  },
  mom: MATCHES_FIXTURE.map(m => ({ matchId: m.id, playerName:"", playerTeam:"", performance:"" })),
});

// ── storage ───────────────────────────────────────────────────────────────────
async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/tournament`, { method: "GET" });
    if (res.ok) {
      const payload = await res.json();
      if (payload?.data) return payload.data;
    }
  } catch (e) {
    console.warn("API unavailable, falling back to local storage", e);
  }

  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : defaultState();
  } catch {
    return defaultState();
  }
}

async function saveData(data) {
  try {
    const res = await fetch(`${API_BASE}/tournament`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data })
    });
    if (res.ok) return;
  } catch (e) {
    console.warn("API unavailable, saving to local storage", e);
  }

  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error(e);
  }
}

// ── tiny components ───────────────────────────────────────────────────────────
const Input = ({ label, ...p }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, color:"#8a8070", letterSpacing:"1px", textTransform:"uppercase" }}>{label}</label>}
    <input
      {...p}
      style={{
        background:"#0d1117", border:"1px solid rgba(201,168,76,.25)", borderRadius:8,
        color:"#e8e4d8", padding:"8px 12px", fontSize:13, fontFamily:"'Rajdhani',sans-serif",
        outline:"none", width:"100%",
        ...(p.style||{})
      }}
    />
  </div>
);

const Select = ({ label, children, ...p }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    {label && <label style={{ fontSize:11, color:"#8a8070", letterSpacing:"1px", textTransform:"uppercase" }}>{label}</label>}
    <select
      {...p}
      style={{
        background:"#0d1117", border:"1px solid rgba(201,168,76,.25)", borderRadius:8,
        color:"#e8e4d8", padding:"8px 12px", fontSize:13, fontFamily:"'Rajdhani',sans-serif",
        outline:"none", width:"100%",
        ...(p.style||{})
      }}
    >{children}</select>
  </div>
);

const Btn = ({ children, variant="primary", ...p }) => {
  const bg = variant === "primary"
    ? "linear-gradient(135deg,#1a6b2f,#14532d)"
    : variant === "danger"
    ? "linear-gradient(135deg,#7f1d1d,#991b1b)"
    : "rgba(201,168,76,.12)";
  return (
    <button
      {...p}
      style={{
        background:bg, border:"1px solid rgba(201,168,76,.25)", borderRadius:8,
        color: variant==="ghost" ? "#c9a84c" : "#fff",
        padding:"8px 18px", fontSize:13, fontWeight:700, letterSpacing:"1px",
        textTransform:"uppercase", cursor:"pointer", fontFamily:"'Rajdhani',sans-serif",
        transition:"opacity .2s", ...(p.style||{})
      }}
      onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
      onMouseLeave={e=>e.currentTarget.style.opacity="1"}
    >{children}</button>
  );
};

const Card = ({ children, style }) => (
  <div style={{
    background:"#111620", border:"1px solid rgba(201,168,76,.18)",
    borderRadius:14, padding:"20px 22px", ...style
  }}>{children}</div>
);

const SectionHead = ({ icon, title, sub }) => (
  <div style={{ marginBottom:20 }}>
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"1.8rem", letterSpacing:3, color:"#c9a84c" }}>{title}</span>
    </div>
    {sub && <p style={{ fontSize:12, color:"#8a8070", marginLeft:32 }}>{sub}</p>}
  </div>
);

const Toast = ({ msg, onClose }) => (
  <div style={{
    position:"fixed", bottom:24, right:24, zIndex:999,
    background:"linear-gradient(135deg,#1a6b2f,#14532d)",
    border:"1px solid rgba(201,168,76,.4)", borderRadius:10,
    padding:"12px 20px", color:"#fff", fontFamily:"'Rajdhani',sans-serif",
    fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:12,
    boxShadow:"0 8px 32px rgba(0,0,0,.4)", animation:"slideUp .3s ease"
  }}>
    ✅ {msg}
    <span style={{ cursor:"pointer", opacity:.6 }} onClick={onClose}>✕</span>
  </div>
);

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [data, setData]     = useState(null);
  const [tab, setTab]       = useState("matches");
  const [toast, setToast]   = useState(null);
  const [saving, setSaving] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const token = window.localStorage.getItem(AUTH_KEY);
    setIsAuthed(token === "ok");
    loadData().then(setData);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const save = useCallback(async (newData) => {
    setSaving(true);
    await saveData(newData);
    setSaving(false);
    showToast("Changes saved successfully!");
  }, []);

  const update = (newData) => { setData(newData); };
  const saveAndToast = (newData) => { setData(newData); save(newData); };

  if (!data) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0a0e14", color:"#c9a84c", fontFamily:"'Bebas Neue',cursive", fontSize:"2rem", letterSpacing:4 }}>
      LOADING...
    </div>
  );


  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSCODE) {
      window.localStorage.setItem(AUTH_KEY, "ok");
      setIsAuthed(true);
      setPassword("");
      setAuthError("");
      return;
    }
    setAuthError("Invalid password. Please use Match Referee password.");
  };

  const handleLogout = () => {
    window.localStorage.removeItem(AUTH_KEY);
    setIsAuthed(false);
  };

  if (!isAuthed) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0e14", color:"#e8e4d8", fontFamily:"'Rajdhani',sans-serif", padding:"20px" }}>
      <form onSubmit={handleLogin} style={{ width:"100%", maxWidth:420, background:"#111620", border:"1px solid rgba(201,168,76,.2)", borderRadius:14, padding:"24px" }}>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive", letterSpacing:3, color:"#c9a84c", marginBottom:6 }}>Match Referee Login</h1>
        <p style={{ fontSize:12, color:"#8a8070", marginBottom:16 }}>Enter the referee password to manage match results, points and stats.</p>
        <Input label="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Enter password" />
        {authError && <div style={{ color:"#f87171", fontSize:12, marginTop:10 }}>{authError}</div>}
        <Btn type="submit" style={{ marginTop:14, width:"100%" }}>Login as Match Referee</Btn>
      </form>
    </div>
  );

  const tabs = [
    { id:"matches",  label:"Match Results", icon:"🏏" },
    { id:"points",   label:"Points Table",  icon:"📊" },
    { id:"stats",    label:"Statistics",    icon:"📈" },
    { id:"mom",      label:"Man of Match",  icon:"⭐" },
    { id:"export",   label:"Export Data",   icon:"💾" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0a0e14", color:"#e8e4d8", fontFamily:"'Rajdhani',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: #4a4a3a; }
        select option { background: #0d1117; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:#0a0e14; }
        ::-webkit-scrollbar-thumb { background:#1a6b2f; border-radius:3px; }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      {/* HEADER */}
      <div style={{
        background:"rgba(10,14,20,.95)", backdropFilter:"blur(16px)",
        borderBottom:"1px solid rgba(201,168,76,.2)", padding:"0 24px",
        display:"flex", alignItems:"center", gap:16, position:"sticky", top:0, zIndex:50
      }}>
        <div style={{ padding:"14px 0", marginRight:"auto" }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, letterSpacing:3, color:"#c9a84c" }}>
            🏆 VC CUP T20 — ADMIN PANEL
          </div>
          <div style={{ fontSize:10, color:"#8a8070", letterSpacing:2 }}>SEASON 2 · 2026 · DATA MANAGEMENT</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{
            width:8, height:8, borderRadius:"50%",
            background: saving ? "#f59e0b" : "#4ade80",
            boxShadow: saving ? "0 0 8px #f59e0b" : "0 0 8px #4ade80",
            animation: saving ? "none" : "pulse 2s infinite"
          }} />
          <span style={{ fontSize:11, color:"#8a8070", letterSpacing:1 }}>
            {saving ? "SAVING..." : "AUTO-SAVE READY"}
          </span>
          <Btn variant="ghost" onClick={handleLogout} style={{ padding:"6px 10px", fontSize:11 }}>Logout</Btn>
        </div>
      </div>

      {/* TAB BAR */}
      <div style={{
        display:"flex", gap:4, padding:"12px 24px",
        background:"rgba(17,22,32,.8)", borderBottom:"1px solid rgba(201,168,76,.1)",
        overflowX:"auto"
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab===t.id ? "linear-gradient(135deg,#1a6b2f,#14532d)" : "rgba(255,255,255,.03)",
            border: `1px solid ${tab===t.id ? "rgba(201,168,76,.4)" : "rgba(201,168,76,.12)"}`,
            borderRadius:8, padding:"8px 16px", cursor:"pointer",
            color: tab===t.id ? "#fff" : "#8a8070",
            fontFamily:"'Rajdhani',sans-serif", fontSize:12, fontWeight:700,
            letterSpacing:"1.5px", textTransform:"uppercase", whiteSpace:"nowrap",
            transition:"all .2s",
            boxShadow: tab===t.id ? "0 2px 12px rgba(26,107,47,.4)" : "none"
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ padding:"28px 24px", maxWidth:1000, margin:"0 auto" }}>

        {/* ── MATCHES ── */}
        {tab === "matches" && (
          <MatchesPanel data={data} setData={update} saveAndToast={saveAndToast} />
        )}

        {/* ── POINTS ── */}
        {tab === "points" && (
          <PointsPanel data={data} setData={update} saveAndToast={saveAndToast} />
        )}

        {/* ── STATS ── */}
        {tab === "stats" && (
          <StatsPanel data={data} setData={update} saveAndToast={saveAndToast} />
        )}

        {/* ── MOM ── */}
        {tab === "mom" && (
          <MomPanel data={data} setData={update} saveAndToast={saveAndToast} />
        )}

        {/* ── EXPORT ── */}
        {tab === "export" && (
          <ExportPanel data={data} saveAndToast={saveAndToast} />
        )}

      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ── MATCHES PANEL ─────────────────────────────────────────────────────────────
function MatchesPanel({ data, setData, saveAndToast }) {
  const [editId, setEditId] = useState(null);
  const [draft, setDraft]   = useState({});

  const openEdit = (m) => { setEditId(m.id); setDraft({ ...m }); };
  const closeEdit = () => { setEditId(null); setDraft({}); };

  const applyEdit = () => {
    const newMatches = data.matches.map(m => m.id === editId ? { ...draft } : m);
    saveAndToast({ ...data, matches: newMatches });
    closeEdit();
  };

  const statusColor = { upcoming:"#c9a84c", live:"#e85d04", completed:"#4ade80" };

  return (
    <div>
      <SectionHead icon="🏏" title="Match Results" sub="Update scores, status, and result summaries for each fixture" />
      {data.matches.map(m => (
        <Card key={m.id} style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            {/* Match badge */}
            <div style={{
              background:"rgba(232,93,4,.12)", border:"1px solid rgba(232,93,4,.3)",
              borderRadius:8, padding:"6px 14px", textAlign:"center", flexShrink:0
            }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:10, color:"#e85d04" }}>MATCH</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"1.6rem", color:"#e85d04", lineHeight:1 }}>{m.id}</div>
            </div>
            {/* Team vs */}
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"1.15rem", letterSpacing:1, marginBottom:2 }}>
                {TEAM_EMOJI[m.home]} {m.home} <span style={{ color:"#4a4a3a", margin:"0 6px" }}>VS</span> {TEAM_EMOJI[m.away]} {m.away}
              </div>
              <div style={{ fontSize:11, color:"#8a8070" }}>{m.date} · {m.time}</div>
              {m.status !== "upcoming" && (
                <div style={{ marginTop:4, fontSize:13 }}>
                  <span style={{ fontFamily:"'Orbitron',sans-serif", color:"#c9a84c" }}>
                    {m.homeScore}/{m.homeWickets} ({m.homeOvers}) &nbsp;vs&nbsp; {m.awayScore}/{m.awayWickets} ({m.awayOvers})
                  </span>
                </div>
              )}
              {m.resultSummary && (
                <div style={{ fontSize:12, color:"#4ade80", marginTop:4 }}>🏆 {m.resultSummary}</div>
              )}
            </div>
            {/* Status chip */}
            <div style={{
              background: `${statusColor[m.status]}20`,
              border: `1px solid ${statusColor[m.status]}50`,
              borderRadius:6, padding:"4px 10px",
              fontSize:10, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase",
              color: statusColor[m.status]
            }}>{m.status}</div>
            {/* Edit btn */}
            <Btn onClick={() => openEdit(m)} variant="ghost" style={{ padding:"6px 14px" }}>✏️ Edit</Btn>
          </div>

          {/* INLINE EDITOR */}
          {editId === m.id && (
            <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid rgba(201,168,76,.15)" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:14 }}>
                <Select label="Status" value={draft.status} onChange={e => setDraft({...draft, status:e.target.value})}>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </Select>
                <Input label={`${m.home} Runs`}    value={draft.homeScore}   onChange={e=>setDraft({...draft,homeScore:e.target.value})}   placeholder="e.g. 167" />
                <Input label="Wickets"             value={draft.homeWickets} onChange={e=>setDraft({...draft,homeWickets:e.target.value})} placeholder="e.g. 6" />
                <Input label="Overs"               value={draft.homeOvers}   onChange={e=>setDraft({...draft,homeOvers:e.target.value})}   placeholder="e.g. 20.0" />
                <Input label={`${m.away} Runs`}    value={draft.awayScore}   onChange={e=>setDraft({...draft,awayScore:e.target.value})}   placeholder="e.g. 145" />
                <Input label="Wickets"             value={draft.awayWickets} onChange={e=>setDraft({...draft,awayWickets:e.target.value})} placeholder="e.g. 9" />
                <Input label="Overs"               value={draft.awayOvers}   onChange={e=>setDraft({...draft,awayOvers:e.target.value})}   placeholder="e.g. 20.0" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <Select label="Winner" value={draft.winner} onChange={e=>setDraft({...draft,winner:e.target.value})}>
                  <option value="">— No result yet —</option>
                  <option value={m.home}>{m.home}</option>
                  <option value={m.away}>{m.away}</option>
                  <option value="Tie">Tie / No Result</option>
                </Select>
                <Input label="Result Summary" value={draft.resultSummary} onChange={e=>setDraft({...draft,resultSummary:e.target.value})} placeholder="e.g. Rising Stars won by 22 runs" />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <Btn onClick={applyEdit}>💾 Save Match</Btn>
                <Btn variant="ghost" onClick={closeEdit}>Cancel</Btn>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── POINTS PANEL ──────────────────────────────────────────────────────────────
function PointsPanel({ data, setData, saveAndToast }) {
  const [rows, setRows] = useState(data.points);

  useEffect(() => { setRows(data.points); }, [data.points]);

  const upd = (i, key, val) => {
    const r = rows.map((row, idx) => idx===i ? {...row, [key]:val} : row);
    setRows(r);
  };

  const toggleForm = (i, val) => {
    const row = rows[i];
    const form = [...(row.form||[])];
    form.push(val);
    if (form.length > 6) form.shift();
    upd(i, "form", form);
  };

  const removeLastForm = (i) => {
    const form = [...(rows[i].form||[])];
    form.pop();
    upd(i, "form", form);
  };

  const handleSave = () => {
    saveAndToast({ ...data, points: rows });
  };

  const autoCalc = () => {
    const updated = rows.map(r => ({
      ...r,
      pts: r.W * 2 + r.NR,
    }));
    setRows(updated);
  };

  return (
    <div>
      <SectionHead icon="📊" title="Points Table" sub="Edit standings manually or auto-calculate from W/L/NR" />
      <Card style={{ marginBottom:16 }}>
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          <Btn onClick={autoCalc} variant="ghost">⚡ Auto-Calc Points (W×2 + NR)</Btn>
          <Btn onClick={handleSave}>💾 Save Points Table</Btn>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"linear-gradient(135deg,#1a6b2f,#14532d)" }}>
                {["Team","M","W","L","NR","NRR","PTS","Form (last 6)"].map(h => (
                  <th key={h} style={{ padding:"10px 12px", fontSize:11, letterSpacing:2, color:"rgba(255,255,255,.7)", textTransform:"uppercase", textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.team} style={{ background: i%2===0 ? "#111620" : "#0e1318", borderBottom:"1px solid rgba(201,168,76,.08)" }}>
                  <td style={{ padding:"10px 12px", fontWeight:600, fontSize:14, whiteSpace:"nowrap" }}>
                    {TEAM_EMOJI[row.team]} {row.team}
                  </td>
                  {["M","W","L","NR"].map(k => (
                    <td key={k} style={{ padding:"6px 8px" }}>
                      <input
                        type="number" min="0" value={row[k.toLowerCase()]}
                        onChange={e => upd(i, k.toLowerCase(), parseInt(e.target.value)||0)}
                        style={{
                          width:52, background:"#0d1117", border:"1px solid rgba(201,168,76,.2)",
                          borderRadius:6, color:"#e8e4d8", padding:"5px 8px", fontSize:13,
                          fontFamily:"'Orbitron',sans-serif", textAlign:"center", outline:"none"
                        }}
                      />
                    </td>
                  ))}
                  <td style={{ padding:"6px 8px" }}>
                    <input
                      value={row.nrr}
                      onChange={e => upd(i, "nrr", e.target.value)}
                      style={{
                        width:72, background:"#0d1117", border:"1px solid rgba(201,168,76,.2)",
                        borderRadius:6, color:"#c9a84c", padding:"5px 8px", fontSize:12,
                        fontFamily:"'Orbitron',sans-serif", textAlign:"center", outline:"none"
                      }}
                    />
                  </td>
                  <td style={{ padding:"6px 8px" }}>
                    <input
                      type="number" min="0" value={row.pts}
                      onChange={e => upd(i, "pts", parseInt(e.target.value)||0)}
                      style={{
                        width:52, background:"#0d1117", border:"1px solid rgba(201,168,76,.3)",
                        borderRadius:6, color:"#c9a84c", padding:"5px 8px", fontSize:15,
                        fontFamily:"'Orbitron',sans-serif", fontWeight:700, textAlign:"center", outline:"none"
                      }}
                    />
                  </td>
                  <td style={{ padding:"6px 12px" }}>
                    <div style={{ display:"flex", gap:3, alignItems:"center", flexWrap:"wrap" }}>
                      {(row.form||[]).map((f,fi) => (
                        <span key={fi} style={{
                          width:22, height:22, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:10, fontWeight:700,
                          background: f==="W" ? "rgba(74,222,128,.2)" : f==="L" ? "rgba(248,113,113,.2)" : "rgba(138,128,112,.2)",
                          color: f==="W" ? "#4ade80" : f==="L" ? "#f87171" : "#8a8070",
                          border: `1px solid ${f==="W" ? "rgba(74,222,128,.3)" : f==="L" ? "rgba(248,113,113,.3)" : "rgba(138,128,112,.2)"}`
                        }}>{f}</span>
                      ))}
                      <button onClick={() => toggleForm(i,"W")} style={{ background:"rgba(74,222,128,.15)", border:"1px solid rgba(74,222,128,.3)", color:"#4ade80", borderRadius:5, padding:"2px 6px", cursor:"pointer", fontSize:10, fontWeight:700 }}>+W</button>
                      <button onClick={() => toggleForm(i,"L")} style={{ background:"rgba(248,113,113,.15)", border:"1px solid rgba(248,113,113,.3)", color:"#f87171", borderRadius:5, padding:"2px 6px", cursor:"pointer", fontSize:10, fontWeight:700 }}>+L</button>
                      <button onClick={() => removeLastForm(i)} style={{ background:"rgba(138,128,112,.1)", border:"1px solid rgba(138,128,112,.2)", color:"#8a8070", borderRadius:5, padding:"2px 6px", cursor:"pointer", fontSize:10 }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── STATS PANEL ───────────────────────────────────────────────────────────────
function StatsPanel({ data, setData, saveAndToast }) {
  const [subtab, setSubtab] = useState("runs");
  const [runs, setRuns]     = useState(data.stats.runs);
  const [wkts, setWkts]     = useState(data.stats.wickets);

  useEffect(() => { setRuns(data.stats.runs); setWkts(data.stats.wickets); }, [data.stats]);

  const updRun = (i, key, val) => setRuns(runs.map((r,idx) => idx===i ? {...r,[key]:val} : r));
  const updWkt = (i, key, val) => setWkts(wkts.map((r,idx) => idx===i ? {...r,[key]:val} : r));

  const handleSave = () => {
    saveAndToast({ ...data, stats: { runs, wickets: wkts } });
  };

  const numStyle = {
    width:60, background:"#0d1117", border:"1px solid rgba(201,168,76,.2)",
    borderRadius:6, color:"#e8e4d8", padding:"5px 8px", fontSize:12,
    fontFamily:"'Orbitron',sans-serif", textAlign:"center", outline:"none"
  };
  const strStyle = {
    width:90, background:"#0d1117", border:"1px solid rgba(201,168,76,.2)",
    borderRadius:6, color:"#e8e4d8", padding:"5px 8px", fontSize:12,
    textAlign:"center", outline:"none", fontFamily:"'Rajdhani',sans-serif"
  };

  return (
    <div>
      <SectionHead icon="📈" title="Tournament Statistics" sub="Update runs, wickets, economy, and strike rates per player" />
      <div style={{ display:"flex", gap:6, marginBottom:16 }}>
        {[["runs","🏏 Batting"],["wickets","🎯 Bowling"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setSubtab(id)} style={{
            background: subtab===id ? "linear-gradient(135deg,#1a6b2f,#14532d)" : "rgba(255,255,255,.03)",
            border:"1px solid rgba(201,168,76,.2)", borderRadius:8,
            color: subtab===id ? "#fff" : "#8a8070",
            padding:"7px 18px", cursor:"pointer",
            fontFamily:"'Rajdhani',sans-serif", fontSize:12, fontWeight:700, letterSpacing:1
          }}>{lbl}</button>
        ))}
        <Btn onClick={handleSave} style={{ marginLeft:"auto" }}>💾 Save Stats</Btn>
      </div>

      <Card>
        {subtab === "runs" && (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"linear-gradient(135deg,#1a6b2f,#14532d)" }}>
                  {["Player","Team","Runs","Balls","4s","6s","HS"].map(h => (
                    <th key={h} style={{ padding:"9px 10px", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.7)", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i} style={{ background: i%2===0 ? "#111620" : "#0e1318", borderBottom:"1px solid rgba(201,168,76,.06)" }}>
                    <td style={{ padding:"8px 10px", fontSize:13, fontWeight:600 }}>{r.name}</td>
                    <td style={{ padding:"8px 10px", fontSize:11, color:"#8a8070", whiteSpace:"nowrap" }}>{TEAM_EMOJI[r.team]}</td>
                    {["runs","balls","fours","sixes","hs"].map(k => (
                      <td key={k} style={{ padding:"5px 6px" }}>
                        <input type="number" min="0" value={r[k]} onChange={e=>updRun(i,k,parseInt(e.target.value)||0)} style={numStyle} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {subtab === "wickets" && (
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"linear-gradient(135deg,#1a6b2f,#14532d)" }}>
                  {["Player","Team","Wkts","Overs","Economy","Best"].map(h => (
                    <th key={h} style={{ padding:"9px 10px", fontSize:10, letterSpacing:2, color:"rgba(255,255,255,.7)", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {wkts.map((r, i) => (
                  <tr key={i} style={{ background: i%2===0 ? "#111620" : "#0e1318", borderBottom:"1px solid rgba(201,168,76,.06)" }}>
                    <td style={{ padding:"8px 10px", fontSize:13, fontWeight:600 }}>{r.name}</td>
                    <td style={{ padding:"8px 10px", fontSize:11, color:"#8a8070" }}>{TEAM_EMOJI[r.team]}</td>
                    <td style={{ padding:"5px 6px" }}>
                      <input type="number" min="0" value={r.wickets} onChange={e=>updWkt(i,"wickets",parseInt(e.target.value)||0)} style={numStyle} />
                    </td>
                    <td style={{ padding:"5px 6px" }}>
                      <input value={r.overs} onChange={e=>updWkt(i,"overs",e.target.value)} style={strStyle} placeholder="0.0" />
                    </td>
                    <td style={{ padding:"5px 6px" }}>
                      <input value={r.economy} onChange={e=>updWkt(i,"economy",e.target.value)} style={strStyle} placeholder="0.00" />
                    </td>
                    <td style={{ padding:"5px 6px" }}>
                      <input value={r.bestFigure} onChange={e=>updWkt(i,"bestFigure",e.target.value)} style={strStyle} placeholder="3/24" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── MOM PANEL ─────────────────────────────────────────────────────────────────
function MomPanel({ data, setData, saveAndToast }) {
  const [moms, setMoms] = useState(data.mom);

  useEffect(() => { setMoms(data.mom); }, [data.mom]);

  const upd = (i, key, val) => setMoms(moms.map((m, idx) => idx===i ? {...m, [key]:val} : m));

  const handleSave = () => saveAndToast({ ...data, mom: moms });

  return (
    <div>
      <SectionHead icon="⭐" title="Man of the Match" sub="Award the player of the match after each fixture is played" />
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:14 }}>
        <Btn onClick={handleSave}>💾 Save All MoM Awards</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
        {moms.map((mom, i) => {
          const fix = MATCHES_FIXTURE[i];
          const hasAward = mom.playerName;
          return (
            <Card key={mom.matchId} style={{ borderColor: hasAward ? "rgba(201,168,76,.5)" : "rgba(201,168,76,.15)" }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                <div style={{
                  background:"rgba(232,93,4,.12)", border:"1px solid rgba(232,93,4,.3)",
                  borderRadius:6, padding:"4px 10px",
                  fontFamily:"'Orbitron',sans-serif", fontSize:10, color:"#e85d04"
                }}>MATCH {fix.id}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:11, color:"#8a8070" }}>{fix.date} · {fix.time}</div>
                  <div style={{ fontSize:12, fontWeight:600, marginTop:2 }}>
                    {TEAM_EMOJI[fix.home]} {fix.home.replace("UIU ","")} vs {TEAM_EMOJI[fix.away]} {fix.away.replace("UIU ","")}
                  </div>
                </div>
                {hasAward && <span style={{ fontSize:20 }}>⭐</span>}
              </div>

              {/* Award display */}
              {hasAward && (
                <div style={{
                  background:"linear-gradient(135deg,rgba(201,168,76,.12),rgba(201,168,76,.05))",
                  border:"1px solid rgba(201,168,76,.3)", borderRadius:10, padding:"12px 14px",
                  marginBottom:14, textAlign:"center"
                }}>
                  <div style={{ fontSize:24, marginBottom:4 }}>🏆</div>
                  <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"1.3rem", letterSpacing:2, color:"#c9a84c" }}>{mom.playerName}</div>
                  <div style={{ fontSize:11, color:"#8a8070", marginBottom:6 }}>{mom.playerTeam}</div>
                  {mom.performance && <div style={{ fontSize:12, color:"#4ade80", fontWeight:600 }}>{mom.performance}</div>}
                </div>
              )}

              {/* Form */}
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <Select label="Player" value={mom.playerName} onChange={e => {
                  const found = ICON_PLAYERS.find(p => p.name === e.target.value);
                  upd(i, "playerName", e.target.value);
                  if (found) upd(i, "playerTeam", found.team);
                }}>
                  <option value="">— Select Player —</option>
                  {ICON_PLAYERS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.team.replace("UIU ","")})</option>
                  ))}
                </Select>
                <Input
                  label="Performance / Award Note"
                  value={mom.performance}
                  onChange={e => upd(i, "performance", e.target.value)}
                  placeholder="e.g. 67(42) & 2/18 — All-round brilliance"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── EXPORT PANEL ──────────────────────────────────────────────────────────────
function ExportPanel({ data, saveAndToast }) {
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "vccup_data.json"; a.click();
  };

  const resetAll = async () => {
    if (confirm("Reset ALL data to defaults? This cannot be undone.")) {
      try { await window.storage.delete(STORAGE_KEY); } catch {}
      window.location.reload();
    }
  };

  const live = data.matches.filter(m => m.status === "live").length;
  const done = data.matches.filter(m => m.status === "completed").length;
  const momDone = data.mom.filter(m => m.playerName).length;

  return (
    <div>
      <SectionHead icon="💾" title="Export & Data" sub="Download data, view storage status, or reset the tournament" />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:24 }}>
        {[
          ["Matches Played", done, "#4ade80"],
          ["Live Matches",   live, "#e85d04"],
          ["MoM Awarded",    momDone, "#c9a84c"],
          ["Teams",          4, "#a78bfa"],
        ].map(([label, val, color]) => (
          <Card key={label} style={{ textAlign:"center", borderColor: `${color}30` }}>
            <div style={{ fontFamily:"'Orbitron',sans-serif", fontSize:"2rem", color, fontWeight:700 }}>{val}</div>
            <div style={{ fontSize:11, color:"#8a8070", letterSpacing:1, textTransform:"uppercase", marginTop:4 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginBottom:16 }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"1.1rem", color:"#c9a84c", letterSpacing:2, marginBottom:12 }}>DATA ACTIONS</div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <Btn onClick={exportJSON}>⬇️ Export JSON</Btn>
          <Btn variant="danger" onClick={resetAll}>🔄 Reset All Data</Btn>
        </div>
        <p style={{ fontSize:12, color:"#8a8070", marginTop:12 }}>
          Data is persisted in Claude artifact storage and survives page refreshes. Export JSON to back up your data before resetting.
        </p>
      </Card>

      <Card>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:"1.1rem", color:"#c9a84c", letterSpacing:2, marginBottom:12 }}>DATA PREVIEW</div>
        <pre style={{
          background:"#0d1117", border:"1px solid rgba(201,168,76,.15)", borderRadius:8,
          padding:"14px", fontSize:11, color:"#8a8070", overflowX:"auto",
          maxHeight:300, lineHeight:1.6
        }}>{JSON.stringify(data, null, 2).slice(0, 2000)}...</pre>
      </Card>
    </div>
  );
}
