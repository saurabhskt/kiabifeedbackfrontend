import { useState, useEffect, useRef, useCallback } from 'react';

/* ─── credentials ─────────────────────────────────────── */
const ADMIN_USER = 'kiabi';
const ADMIN_PASS = 'kiabi2026';
const API = '/api/survey';

/* ─── types ────────────────────────────────────────────── */
interface CardStat {
    cardId: string; section: string; statement: string;
    total: string; yesCount: string; yesRate: string; avgDwellMs: string;
}
interface SectionStat { section: string; total: string; yesRate: string; }
interface IncomeDist  { bracket: string; count: string; }
interface DemoStat    { gender: string; ageGroup: string; yesRate: string; total: string; }
interface Stats {
    totalSessions: number;
    cardStats: CardStat[];
    sectionStats: SectionStat[];
    incomeDist: IncomeDist[];
    demographicStats: DemoStat[];
}
interface Session {
    id: number; sessionId: string; userName: string; userGender: string;
    userAgeGroup: string; userEmployment: string; contact: string;
    incomeBracket: string; totalAnswered: number; totalSkipped: number;
    yesCount: number; nopeCount: number; skippedCardIds: string[];
    commentText: string; audioFilePath: string; completedAt: string; createdAt: string;
}
interface Answer {
    id: number; sessionId: string; cardId: string; section: string;
    statement: string; answer: string; dwellTimeMs: number;
    userGender: string; userAgeGroup: string; userEmployment: string; answeredAt: string;
}

/* ─── constants ────────────────────────────────────────── */
const SEC_COLORS: Record<string,string> = {
    'Discovery':'#3C3489','Sections Shopped':'#993556',
    'Brand Awareness':'#8B5E15','Style Perception':'#0E5F75',
    'Price Perception':'#2B6B26','Shopping Habits':'#7A3010',
    'Myntra Intent':'#5F5E5A','Recommendation':'#185FA5',
    'Income Range':'#854F0B','Overall':'#534AB7',
};
const INCOME_LABEL: Record<string,string> = {
    below_50k:'< ₹50k','50k_1L':'₹50k–1L','1L_2L':'₹1L–2L',
    '2L_3.5L':'₹2L–3.5L','above_3.5L':'> ₹3.5L',prefer_not:'Prefer not',not_answered:'N/A',
};

type Tab = 'overview'|'questions'|'sessions'|'answers'|'demographics';

/* ─── CSV helper ───────────────────────────────────────── */
function downloadCSV(rows: Record<string,unknown>[], filename: string) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
}

/* ─── mini components ──────────────────────────────────── */
function Bar({ pct, color }: { pct: number; color: string }) {
    return (
        <div style={{ background:'#f0ece8', borderRadius:4, height:8, width:'100%', overflow:'hidden' }}>
            <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background:color, borderRadius:4, transition:'width .5s ease' }} />
        </div>
    );
}

function RateBadge({ rate }: { rate: number }) {
    const bg  = rate >= 60 ? '#e8f5e9' : rate >= 40 ? '#fff8e1' : '#fce4ec';
    const col = rate >= 60 ? '#1b5e20' : rate >= 40 ? '#6d4c00' : '#880e4f';
    return <span style={{ background:bg, color:col, padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700 }}>{rate.toFixed(1)}%</span>;
}

function Pill({ label, color }: { label: string; color: string }) {
    return (
        <span style={{ background:color+'1a', color, border:`1px solid ${color}33`,
            padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>
      {label}
    </span>
    );
}

/* ─── canvas bar chart ─────────────────────────────────── */
function BarChart({ labels, values, color, h=200 }: { labels:string[]; values:number[]; color:string; h?:number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        const dpr = window.devicePixelRatio||1;
        const W = c.offsetWidth, H = h;
        c.width = W*dpr; c.height = H*dpr; ctx.scale(dpr,dpr);
        const pL=40,pR=12,pT=20,pB=50, cW=W-pL-pR, cH=H-pT-pB;
        const max = Math.max(...values,1);
        ctx.clearRect(0,0,W,H);
        for (let i=0;i<=4;i++) {
            const y = pT+cH-(i/4)*cH;
            ctx.strokeStyle='#ede8e2'; ctx.lineWidth=0.5;
            ctx.beginPath(); ctx.moveTo(pL,y); ctx.lineTo(pL+cW,y); ctx.stroke();
            ctx.fillStyle='#bbb'; ctx.font=`10px system-ui`; ctx.textAlign='right';
            ctx.fillText(String(Math.round((i/4)*max)), pL-4, y+3);
        }
        const gap = cW/labels.length, bW = Math.max(6, gap*0.6);
        labels.forEach((lbl,i) => {
            const x = pL+i*gap+gap/2-bW/2, bH2 = (values[i]/max)*cH, y = pT+cH-bH2;
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.roundRect(x,y,bW,bH2,[3,3,0,0]); ctx.fill();
            ctx.fillStyle='#555'; ctx.font='10px system-ui'; ctx.textAlign='center';
            ctx.fillText(String(values[i]), pL+i*gap+gap/2, y-4);
            const short = lbl.length>10?lbl.slice(0,10)+'…':lbl;
            ctx.fillStyle='#999'; ctx.fillText(short, pL+i*gap+gap/2, pT+cH+16);
        });
    },[labels,values,color,h]);
    return <canvas ref={ref} style={{ width:'100%', height:h }} />;
}

/* ─── table header/cell styles ─────────────────────────── */
const TH: React.CSSProperties = {
    padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700,
    color:'#aaa', textTransform:'uppercase', letterSpacing:'.5px',
    borderBottom:'2px solid #ede8e2', whiteSpace:'nowrap', background:'#fafaf8',
    position:'sticky', top:0,
};
const TD: React.CSSProperties = {
    padding:'9px 12px', borderBottom:'1px solid #f5f2ee', fontSize:13,
    color:'#333', verticalAlign:'middle',
};

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const [authed, setAuthed]     = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginErr, setLoginErr] = useState('');
    const [stats, setStats]       = useState<Stats|null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [answers, setAnswers]   = useState<Answer[]>([]);
    const [loading, setLoading]   = useState(false);
    const [tab, setTab]           = useState<Tab>('overview');
    const [secFilter, setSecFilter] = useState('All');
    const [search, setSearch]     = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === ADMIN_USER && password === ADMIN_PASS) { setAuthed(true); setLoginErr(''); }
        else setLoginErr('Invalid username or password');
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [st, se, an] = await Promise.all([
                fetch(`${API}/stats`).then(r => r.json()),
                fetch(`${API}/admin/sessions`).then(r => r.json()),
                fetch(`${API}/admin/answers`).then(r => r.json()),
            ]);
            setStats(st); setSessions(Array.isArray(se)?se:[]); setAnswers(Array.isArray(an)?an:[]);
        } catch(e) {
            console.error('Failed to load data', e);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { if (authed) load(); }, [authed, load]);

    /* ── LOGIN PAGE ── */
    if (!authed) return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg,#f5f4f0 0%,#eceae4 100%)', fontFamily:'system-ui,sans-serif' }}>
            <div style={{ background:'#fff', borderRadius:20, border:'1px solid #e0ddd5',
                padding:'52px 44px', width:380, boxShadow:'0 8px 48px rgba(60,52,137,.10)' }}>
                <div style={{ textAlign:'center', marginBottom:36 }}>
                    <div style={{ display:'inline-flex', alignItems:'center', justifyContent:'center',
                        background:'#3C3489', color:'#fff', borderRadius:14, padding:'10px 24px', marginBottom:16 }}>
                        <span style={{ fontSize:26, fontWeight:900, letterSpacing:4 }}>KIABI</span>
                    </div>
                    <p style={{ margin:0, fontSize:12, color:'#bbb', textTransform:'uppercase',
                        letterSpacing:2, fontWeight:700 }}>Admin Dashboard</p>
                </div>
                <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:18 }}>
                    {([['Username','text',username,setUsername],['Password','password',password,setPassword]] as const).map(([lbl,type,val,set])=>(
                        <div key={lbl}>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#999',
                                textTransform:'uppercase', letterSpacing:'.8px', marginBottom:7 }}>{lbl}</label>
                            <input type={type} value={val} placeholder={`Enter ${lbl.toLowerCase()}`}
                                   onChange={e => (set as (v:string)=>void)(e.target.value)}
                                   style={{ width:'100%', padding:'11px 14px', border:'1.5px solid #e8e4df',
                                       borderRadius:9, fontSize:14, outline:'none', boxSizing:'border-box',
                                       background:'#fafaf8', fontFamily:'inherit', color:'#222' }} />
                        </div>
                    ))}
                    {loginErr && (
                        <p style={{ margin:0, fontSize:13, color:'#993556', background:'#fce4ec',
                            borderRadius:8, padding:'9px 14px', fontWeight:500 }}>{loginErr}</p>
                    )}
                    <button type="submit" style={{ marginTop:4, padding:'13px', background:'#3C3489',
                        color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700,
                        cursor:'pointer', letterSpacing:'.5px' }}>
                        Sign in →
                    </button>
                </form>
            </div>
        </div>
    );

    /* ── LOADING ── */
    if (loading || !stats) return (
        <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', gap:16, background:'#f5f4f0', fontFamily:'system-ui,sans-serif',
            color:'#aaa', fontSize:14 }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ width:38, height:38, border:'3px solid #e8e4df', borderTopColor:'#3C3489',
                borderRadius:'50%', animation:'spin .7s linear infinite' }} />
            <p style={{ margin:0 }}>Loading analytics…</p>
        </div>
    );

    /* ── derived ── */
    const totalAnswers = stats.cardStats.reduce((s,c) => s+Number(c.total), 0);
    const avgYesRate   = stats.cardStats.length
        ? stats.cardStats.reduce((s,c) => s+Number(c.yesRate||0), 0) / stats.cardStats.length : 0;
    const sections = ['All', ...Array.from(new Set(stats.sectionStats.map(s=>s.section)))];
    const filteredCards = secFilter==='All'
        ? stats.cardStats : stats.cardStats.filter(c=>c.section===secFilter);

    const lc = search.toLowerCase();
    const filteredSessions = sessions.filter(s => !lc ||
        [s.userName,s.contact,s.sessionId,s.userGender,s.userAgeGroup,s.userEmployment]
            .some(v=>v?.toLowerCase().includes(lc)));
    const filteredAnswers = answers.filter(a => !lc ||
        [a.sessionId,a.section,a.statement,a.answer,a.userGender,a.userAgeGroup]
            .some(v=>v?.toLowerCase().includes(lc)));

    const genders   = Array.from(new Set(stats.demographicStats.map(d=>d.gender))).filter(Boolean);
    const ageGroups = Array.from(new Set(stats.demographicStats.map(d=>d.ageGroup))).filter(Boolean);

    /* ── CSV exports ── */
    const exportSessions = () => downloadCSV(sessions.map(s=>({
        ID:s.id, Session_ID:s.sessionId, Name:s.userName, Gender:s.userGender,
        Age_Group:s.userAgeGroup, Employment:s.userEmployment, Contact:s.contact,
        Income_Bracket:INCOME_LABEL[s.incomeBracket]||s.incomeBracket,
        Total_Answered:s.totalAnswered, Total_Skipped:s.totalSkipped,
        Yes_Count:s.yesCount, No_Count:s.nopeCount,
        Skipped_Cards:(s.skippedCardIds||[]).join('|'),
        Comment:s.commentText||'',
        Completed_At:s.completedAt, Created_At:s.createdAt,
    })), 'kiabi_sessions.csv');

    const exportAnswers = () => downloadCSV(answers.map(a=>({
        ID:a.id, Session_ID:a.sessionId, Card_ID:a.cardId, Section:a.section,
        Question:a.statement, Answer:a.answer,
        Dwell_ms:a.dwellTimeMs, Dwell_sec:(a.dwellTimeMs/1000).toFixed(2),
        Gender:a.userGender, Age_Group:a.userAgeGroup, Employment:a.userEmployment,
        Answered_At:a.answeredAt,
    })), 'kiabi_answers.csv');

    const exportQuestions = () => downloadCSV(stats.cardStats.map((c,i)=>({
        Num:i+1, Card_ID:c.cardId, Section:c.section, Question:c.statement,
        Total_Responses:c.total, Yes_Count:c.yesCount,
        No_Count:Number(c.total)-Number(c.yesCount),
        Yes_Rate_pct:Number(c.yesRate||0).toFixed(1),
        Avg_Dwell_sec:c.avgDwellMs?(Number(c.avgDwellMs)/1000).toFixed(1):'',
    })), 'kiabi_questions.csv');

    /* ── layout atoms ── */
    const card: React.CSSProperties = {
        background:'#fff', border:'1px solid #ede8e2', borderRadius:14, padding:'22px 24px',
    };
    const sectionTitle: React.CSSProperties = {
        fontSize:12, fontWeight:800, color:'#aaa', textTransform:'uppercase',
        letterSpacing:'.8px', margin:'0 0 18px',
    };
    const greenBtn: React.CSSProperties = {
        display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px',
        background:'#2B6B26', color:'#fff', border:'none', borderRadius:8,
        fontSize:12, fontWeight:700, cursor:'pointer', letterSpacing:'.2px',
    };
    const outBtn: React.CSSProperties = {
        display:'inline-flex', alignItems:'center', gap:5, padding:'7px 14px',
        background:'#fff', color:'#666', border:'1px solid #e0ddd5', borderRadius:8,
        fontSize:12, fontWeight:600, cursor:'pointer',
    };

    const NAV: [Tab,string,string][] = [
        ['overview','▦','Overview'],
        ['questions','◧','Questions'],
        ['sessions','☰','Sessions'],
        ['answers','≡','Answers'],
        ['demographics','◉','Demographics'],
    ];

    return (
        <div style={{ display:'flex', minHeight:'100vh', background:'#f5f4f0',
            fontFamily:'system-ui,-apple-system,sans-serif' }}>

            {/* ──── SIDEBAR ──── */}
            <aside style={{ width:214, background:'#fff', borderRight:'1px solid #ede8e2',
                display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh',
                flexShrink:0 }}>
                <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid #f5f2ee' }}>
                    <div style={{ display:'inline-flex', background:'#3C3489', color:'#fff',
                        borderRadius:10, padding:'7px 16px', marginBottom:6 }}>
                        <span style={{ fontSize:16, fontWeight:900, letterSpacing:3 }}>KIABI</span>
                    </div>
                    <p style={{ margin:0, fontSize:10, color:'#ccc', textTransform:'uppercase',
                        letterSpacing:1.5, fontWeight:700 }}>Admin Portal</p>
                </div>
                <nav style={{ padding:'10px 8px', flex:1, display:'flex', flexDirection:'column', gap:2 }}>
                    {NAV.map(([id,icon,label]) => (
                        <button key={id} onClick={()=>{ setTab(id); setSearch(''); setSecFilter('All'); }}
                                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 13px',
                                    borderRadius:9, border:'none',
                                    background: tab===id ? '#3C3489' : 'transparent',
                                    color: tab===id ? '#fff' : '#888',
                                    fontSize:13, fontWeight: tab===id ? 700 : 400,
                                    cursor:'pointer', textAlign:'left', width:'100%' }}>
                            <span style={{ fontSize:15, lineHeight:1 }}>{icon}</span>{label}
                        </button>
                    ))}
                </nav>
                <div style={{ padding:'0 8px 20px' }}>
                    <div style={{ padding:'12px 14px', background:'#f5f4f0', borderRadius:10, marginBottom:8 }}>
                        <p style={{ margin:'0 0 2px', fontSize:10, color:'#bbb', fontWeight:700, textTransform:'uppercase', letterSpacing:'.8px' }}>Total Responses</p>
                        <p style={{ margin:0, fontSize:26, fontWeight:900, color:'#3C3489', lineHeight:1 }}>{stats.totalSessions}</p>
                    </div>
                    <button onClick={()=>setAuthed(false)}
                            style={{ width:'100%', padding:'9px', background:'transparent',
                                border:'1px solid #e8e4e0', borderRadius:8, fontSize:12, color:'#aaa',
                                cursor:'pointer', textAlign:'center' }}>
                        ⎋ &nbsp;Sign out
                    </button>
                </div>
            </aside>

            {/* ──── MAIN ──── */}
            <main style={{ flex:1, minWidth:0, overflowY:'auto' }}>
                {/* Page header */}
                <div style={{ padding:'26px 28px 0', display:'flex', alignItems:'flex-start',
                    justifyContent:'space-between', marginBottom:24, gap:12 }}>
                    <div>
                        <h1 style={{ margin:'0 0 4px', fontSize:22, fontWeight:800, color:'#1a1a2e' }}>
                            {tab==='overview'&&'Survey Overview'}
                            {tab==='questions'&&'Question Analysis'}
                            {tab==='sessions'&&'All Sessions'}
                            {tab==='answers'&&'All Answers'}
                            {tab==='demographics'&&'Demographics'}
                        </h1>
                        <p style={{ margin:0, fontSize:13, color:'#ccc' }}>KIABI Sample Sale · Feedback Analytics</p>
                    </div>
                    <div style={{ display:'flex', gap:8, flexShrink:0, paddingTop:2 }}>
                        {tab==='questions'   && <button style={greenBtn} onClick={exportQuestions}>⬇ Export CSV</button>}
                        {tab==='sessions'    && <button style={greenBtn} onClick={exportSessions}>⬇ Export Sessions CSV</button>}
                        {tab==='answers'     && <button style={greenBtn} onClick={exportAnswers}>⬇ Export Answers CSV</button>}
                        <button onClick={load} style={outBtn}>↻ Refresh</button>
                    </div>
                </div>

                <div style={{ padding:'0 28px 52px', display:'flex', flexDirection:'column', gap:22 }}>

                    {/* ════ OVERVIEW ════ */}
                    {tab==='overview' && <>
                        {/* KPIs */}
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
                            {([
                                ['Total Sessions', stats.totalSessions, '#3C3489'],
                                ['Total Answers', totalAnswers.toLocaleString(), '#0E5F75'],
                                ['Avg Yes Rate', `${avgYesRate.toFixed(1)}%`, '#2B6B26'],
                                ['Questions', stats.cardStats.length, '#854F0B'],
                            ] as [string,string|number,string][]).map(([lbl,val,col])=>(
                                <div key={lbl} style={{ background:'#fff', border:'1px solid #ede8e2',
                                    borderRadius:12, padding:'18px 20px', borderTop:`3px solid ${col}` }}>
                                    <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#bbb',
                                        textTransform:'uppercase', letterSpacing:'.6px' }}>{lbl}</p>
                                    <p style={{ margin:0, fontSize:28, fontWeight:900, color:col, lineHeight:1 }}>{val}</p>
                                </div>
                            ))}
                        </div>
                        {/* Charts */}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                            <div style={card}>
                                <p style={sectionTitle}>Yes Rate by Section (%)</p>
                                <BarChart labels={stats.sectionStats.map(s=>s.section.split(' ')[0])}
                                          values={stats.sectionStats.map(s=>Math.round(Number(s.yesRate||0)))}
                                          color="#3C3489" h={220} />
                            </div>
                            <div style={card}>
                                <p style={sectionTitle}>Income Distribution</p>
                                <BarChart labels={stats.incomeDist.map(d=>INCOME_LABEL[d.bracket]||d.bracket)}
                                          values={stats.incomeDist.map(d=>Number(d.count))}
                                          color="#854F0B" h={220} />
                            </div>
                        </div>
                        {/* Section summary table */}
                        <div style={card}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                                <p style={{ ...sectionTitle, margin:0 }}>Section Summary</p>
                                <button style={greenBtn} onClick={()=>downloadCSV(
                                    stats.sectionStats.map(s=>({ Section:s.section, Total_Answers:s.total, Yes_Rate_pct:Number(s.yesRate||0).toFixed(1) })),
                                    'kiabi_sections.csv')}>⬇ CSV</button>
                            </div>
                            <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                <thead><tr>{['Section','Total Answers','Yes Rate','Sentiment Bar'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                                <tbody>
                                {stats.sectionStats.map(s=>{
                                    const r=Number(s.yesRate||0), col=SEC_COLORS[s.section]||'#3C3489';
                                    return <tr key={s.section}>
                                        <td style={TD}><Pill label={s.section} color={col} /></td>
                                        <td style={{ ...TD, fontWeight:600 }}>{Number(s.total).toLocaleString()}</td>
                                        <td style={TD}><RateBadge rate={r} /></td>
                                        <td style={{ ...TD, minWidth:150 }}><Bar pct={r} color={col} /></td>
                                    </tr>;
                                })}
                                </tbody>
                            </table>
                        </div>
                    </>}

                    {/* ════ QUESTIONS ════ */}
                    {tab==='questions' && <>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                            {sections.map(sec=>(
                                <button key={sec} onClick={()=>setSecFilter(sec)}
                                        style={{ padding:'6px 14px',
                                            border:`1.5px solid ${secFilter===sec?(sec==='All'?'#3C3489':SEC_COLORS[sec]||'#3C3489'):'#e0ddd5'}`,
                                            borderRadius:20, cursor:'pointer', fontSize:12, fontWeight:secFilter===sec?700:400,
                                            background:secFilter===sec?(sec==='All'?'#3C3489':SEC_COLORS[sec]||'#3C3489'):'#fff',
                                            color:secFilter===sec?'#fff':'#777' }}>
                                    {sec}
                                </button>
                            ))}
                        </div>
                        <div style={card}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                                <p style={{ ...sectionTitle, margin:0 }}>
                                    {filteredCards.length} question{filteredCards.length!==1?'s':''} · {secFilter}
                                </p>
                                <button style={greenBtn} onClick={exportQuestions}>⬇ Export All Questions CSV</button>
                            </div>
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                    <thead><tr>
                                        {['#','Card','Section','Question','Responses','Yes','No','Yes %','Avg Dwell','Bar'].map(h=><th key={h} style={TH}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                    {filteredCards.map((c,i)=>{
                                        const total=Number(c.total), yes=Number(c.yesCount), no=total-yes, rate=Number(c.yesRate||0);
                                        const col=SEC_COLORS[c.section]||'#3C3489';
                                        return <tr key={c.cardId}>
                                            <td style={{ ...TD, color:'#ddd', fontSize:11 }}>{i+1}</td>
                                            <td style={TD}><code style={{ background:'#f0ece8', color:'#3C3489', padding:'2px 7px', borderRadius:4, fontSize:11, fontFamily:'monospace' }}>{c.cardId}</code></td>
                                            <td style={TD}><Pill label={c.section} color={col} /></td>
                                            <td style={{ ...TD, maxWidth:240, fontSize:12, lineHeight:1.4 }}>{c.statement||'—'}</td>
                                            <td style={{ ...TD, fontWeight:700 }}>{total.toLocaleString()}</td>
                                            <td style={{ ...TD, color:'#1b5e20', fontWeight:700 }}>{yes}</td>
                                            <td style={{ ...TD, color:'#880e4f', fontWeight:700 }}>{no}</td>
                                            <td style={TD}><RateBadge rate={rate} /></td>
                                            <td style={{ ...TD, color:'#bbb', fontSize:12 }}>{c.avgDwellMs?(Number(c.avgDwellMs)/1000).toFixed(1)+'s':'—'}</td>
                                            <td style={{ ...TD, minWidth:100 }}><Bar pct={rate} color={col} /></td>
                                        </tr>;
                                    })}
                                    </tbody>
                                    <tfoot>
                                    <tr style={{ background:'#fafaf8' }}>
                                        <td colSpan={4} style={{ ...TD, color:'#bbb', fontSize:11, fontWeight:700 }}>TOTALS / AVERAGES</td>
                                        <td style={{ ...TD, fontWeight:700 }}>{totalAnswers.toLocaleString()}</td>
                                        <td style={{ ...TD, color:'#1b5e20', fontWeight:700 }}>{stats.cardStats.reduce((s,c)=>s+Number(c.yesCount),0)}</td>
                                        <td style={{ ...TD, color:'#880e4f', fontWeight:700 }}>{stats.cardStats.reduce((s,c)=>s+Number(c.total)-Number(c.yesCount),0)}</td>
                                        <td style={TD}><RateBadge rate={avgYesRate} /></td>
                                        <td colSpan={2} />
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </>}

                    {/* ════ SESSIONS ════ */}
                    {tab==='sessions' && <>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                            <input value={search} onChange={e=>setSearch(e.target.value)}
                                   placeholder="Search by name, contact, gender, age group…"
                                   style={{ flex:1, padding:'10px 14px', border:'1.5px solid #e0ddd5',
                                       borderRadius:9, fontSize:13, outline:'none', fontFamily:'inherit',
                                       background:'#fff', color:'#222' }} />
                            <button style={greenBtn} onClick={exportSessions}>⬇ Export All Sessions CSV</button>
                        </div>
                        <div style={card}>
                            <p style={{ ...sectionTitle, marginBottom:14 }}>
                                {filteredSessions.length.toLocaleString()} of {sessions.length.toLocaleString()} sessions
                            </p>
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                    <thead><tr>
                                        {['ID','Name','Gender','Age','Employment','Contact','Income','Answered','Skipped','Yes','No','Comment','Completed At','Created At'].map(h=><th key={h} style={TH}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                    {filteredSessions.map(s=>(
                                        <tr key={s.id}>
                                            <td style={{ ...TD, color:'#ddd', fontSize:11 }}>{s.id}</td>
                                            <td style={{ ...TD, fontWeight:700 }}>{s.userName||'—'}</td>
                                            <td style={TD}>{s.userGender||'—'}</td>
                                            <td style={TD}>{s.userAgeGroup||'—'}</td>
                                            <td style={TD}>{s.userEmployment||'—'}</td>
                                            <td style={{ ...TD, fontSize:12 }}>{s.contact||'—'}</td>
                                            <td style={TD}><span style={{ background:'#fff8e1', color:'#6d4c00', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:600 }}>{INCOME_LABEL[s.incomeBracket]||s.incomeBracket||'—'}</span></td>
                                            <td style={{ ...TD, textAlign:'center', fontWeight:700 }}>{s.totalAnswered}</td>
                                            <td style={{ ...TD, textAlign:'center', color:'#bbb' }}>{s.totalSkipped}</td>
                                            <td style={{ ...TD, color:'#1b5e20', fontWeight:800, textAlign:'center' }}>{s.yesCount}</td>
                                            <td style={{ ...TD, color:'#880e4f', fontWeight:800, textAlign:'center' }}>{s.nopeCount}</td>
                                            <td style={{ ...TD, maxWidth:180, fontSize:12, color:'#888' }}>
                                                {s.commentText ? (s.commentText.length>60?s.commentText.slice(0,60)+'…':s.commentText) : '—'}
                                            </td>
                                            <td style={{ ...TD, fontSize:11, color:'#bbb', whiteSpace:'nowrap' }}>{s.completedAt?new Date(s.completedAt).toLocaleString():'—'}</td>
                                            <td style={{ ...TD, fontSize:11, color:'#bbb', whiteSpace:'nowrap' }}>{s.createdAt?new Date(s.createdAt).toLocaleString():'—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {filteredSessions.length===0&&(
                                    <p style={{ textAlign:'center', color:'#ccc', padding:'32px 0', fontSize:14 }}>No sessions found</p>
                                )}
                            </div>
                        </div>
                    </>}

                    {/* ════ ANSWERS ════ */}
                    {tab==='answers' && <>
                        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                            <input value={search} onChange={e=>setSearch(e.target.value)}
                                   placeholder="Search by section, question, answer, gender…"
                                   style={{ flex:1, padding:'10px 14px', border:'1.5px solid #e0ddd5',
                                       borderRadius:9, fontSize:13, outline:'none', fontFamily:'inherit',
                                       background:'#fff', color:'#222' }} />
                            <button style={greenBtn} onClick={exportAnswers}>⬇ Export All Answers CSV</button>
                        </div>
                        <div style={card}>
                            <p style={{ ...sectionTitle, marginBottom:14 }}>
                                {filteredAnswers.length.toLocaleString()} of {answers.length.toLocaleString()} answers
                                {filteredAnswers.length>500&&' · showing first 500 below — export for full data'}
                            </p>
                            <div style={{ overflowX:'auto' }}>
                                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                    <thead><tr>
                                        {['ID','Session ID','Card','Section','Question','Answer','Dwell (s)','Gender','Age','Employment','Answered At'].map(h=><th key={h} style={TH}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                    {filteredAnswers.slice(0,500).map(a=>{
                                        const isYes=a.answer==='yes', isNo=a.answer==='nope';
                                        return <tr key={a.id}>
                                            <td style={{ ...TD, color:'#ddd', fontSize:11 }}>{a.id}</td>
                                            <td style={{ ...TD, fontSize:11 }}>
                                                <code style={{ background:'#f5f2ee', color:'#666', padding:'1px 5px', borderRadius:3, fontSize:10, fontFamily:'monospace' }}>
                                                    {(a.sessionId||'').slice(0,14)}…
                                                </code>
                                            </td>
                                            <td style={TD}><code style={{ background:'#f0ece8', color:'#3C3489', padding:'2px 7px', borderRadius:4, fontSize:11, fontFamily:'monospace' }}>{a.cardId}</code></td>
                                            <td style={TD}><Pill label={a.section} color={SEC_COLORS[a.section]||'#555'} /></td>
                                            <td style={{ ...TD, maxWidth:220, fontSize:12, lineHeight:1.4 }}>{a.statement}</td>
                                            <td style={TD}>
                                                {isYes&&<span style={{ background:'#e8f5e9', color:'#1b5e20', padding:'3px 10px', borderRadius:10, fontSize:12, fontWeight:700 }}>Yes</span>}
                                                {isNo&&<span style={{ background:'#fce4ec', color:'#880e4f', padding:'3px 10px', borderRadius:10, fontSize:12, fontWeight:700 }}>No</span>}
                                                {!isYes&&!isNo&&<span style={{ background:'#f5f5f5', color:'#777', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:600 }}>{a.answer}</span>}
                                            </td>
                                            <td style={{ ...TD, color:'#aaa', fontSize:12 }}>{a.dwellTimeMs?(a.dwellTimeMs/1000).toFixed(1):'—'}</td>
                                            <td style={TD}>{a.userGender||'—'}</td>
                                            <td style={TD}>{a.userAgeGroup||'—'}</td>
                                            <td style={TD}>{a.userEmployment||'—'}</td>
                                            <td style={{ ...TD, fontSize:11, color:'#bbb', whiteSpace:'nowrap' }}>{a.answeredAt?new Date(a.answeredAt).toLocaleString():'—'}</td>
                                        </tr>;
                                    })}
                                    </tbody>
                                </table>
                                {filteredAnswers.length===0&&(
                                    <p style={{ textAlign:'center', color:'#ccc', padding:'32px 0', fontSize:14 }}>No answers found</p>
                                )}
                            </div>
                        </div>
                    </>}

                    {/* ════ DEMOGRAPHICS ════ */}
                    {tab==='demographics' && <>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                            <div style={card}>
                                <p style={sectionTitle}>By Gender</p>
                                {genders.length===0&&<p style={{ color:'#ccc', fontSize:13 }}>No data</p>}
                                {genders.map(g=>{
                                    const rows=stats.demographicStats.filter(d=>d.gender===g);
                                    const total=rows.reduce((s,r)=>s+Number(r.total),0);
                                    const avg=rows.length?rows.reduce((s,r)=>s+Number(r.yesRate||0),0)/rows.length:0;
                                    return <div key={g} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid #f5f2ee' }}>
                                        <span style={{ fontSize:13, fontWeight:700, color:'#333', minWidth:90 }}>{g||'Unknown'}</span>
                                        <span style={{ fontSize:12, color:'#ccc', minWidth:80 }}>{total.toLocaleString()} answers</span>
                                        <span style={{ fontSize:12, fontWeight:800, color:'#3C3489', minWidth:52 }}>{avg.toFixed(1)}%</span>
                                        <div style={{ flex:1 }}><Bar pct={avg} color="#3C3489" /></div>
                                    </div>;
                                })}
                            </div>
                            <div style={card}>
                                <p style={sectionTitle}>By Age Group</p>
                                {ageGroups.length===0&&<p style={{ color:'#ccc', fontSize:13 }}>No data</p>}
                                {ageGroups.map(ag=>{
                                    const rows=stats.demographicStats.filter(d=>d.ageGroup===ag);
                                    const total=rows.reduce((s,r)=>s+Number(r.total),0);
                                    const avg=rows.length?rows.reduce((s,r)=>s+Number(r.yesRate||0),0)/rows.length:0;
                                    return <div key={ag} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 0', borderBottom:'1px solid #f5f2ee' }}>
                                        <span style={{ fontSize:13, fontWeight:700, color:'#333', minWidth:60 }}>{ag||'Unknown'}</span>
                                        <span style={{ fontSize:12, color:'#ccc', minWidth:80 }}>{total.toLocaleString()} answers</span>
                                        <span style={{ fontSize:12, fontWeight:800, color:'#0E5F75', minWidth:52 }}>{avg.toFixed(1)}%</span>
                                        <div style={{ flex:1 }}><Bar pct={avg} color="#0E5F75" /></div>
                                    </div>;
                                })}
                            </div>
                        </div>
                        {/* Cross-tab */}
                        <div style={card}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                                <p style={{ ...sectionTitle, margin:0 }}>Demographic Cross-tab</p>
                                <button style={greenBtn} onClick={()=>downloadCSV(
                                    stats.demographicStats.map(d=>({ Gender:d.gender, Age_Group:d.ageGroup, Total_Answers:d.total, Yes_Rate_pct:Number(d.yesRate||0).toFixed(1) })),
                                    'kiabi_demographics.csv')}>⬇ CSV</button>
                            </div>
                            <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                <thead><tr>{['Gender','Age Group','Total Answers','Yes Rate','Bar'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                                <tbody>
                                {stats.demographicStats.map((d,i)=>(
                                    <tr key={i}>
                                        <td style={TD}>{d.gender||'—'}</td>
                                        <td style={TD}>{d.ageGroup||'—'}</td>
                                        <td style={{ ...TD, fontWeight:700 }}>{Number(d.total).toLocaleString()}</td>
                                        <td style={TD}><RateBadge rate={Number(d.yesRate||0)} /></td>
                                        <td style={{ ...TD, minWidth:130 }}><Bar pct={Number(d.yesRate||0)} color="#3C3489" /></td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Income */}
                        <div style={card}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                                <p style={{ ...sectionTitle, margin:0 }}>Income Distribution</p>
                                <button style={greenBtn} onClick={()=>downloadCSV(
                                    stats.incomeDist.map(d=>({ Bracket:INCOME_LABEL[d.bracket]||d.bracket, Count:d.count })),
                                    'kiabi_income.csv')}>⬇ CSV</button>
                            </div>
                            <table style={{ width:'100%', borderCollapse:'collapse' }}>
                                <thead><tr>{['Income Bracket','Respondents','Share'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                                <tbody>
                                {stats.incomeDist.map(d=>{
                                    const tot=stats.incomeDist.reduce((s,x)=>s+Number(x.count),0);
                                    const pct=tot?Number(d.count)/tot*100:0;
                                    return <tr key={d.bracket}>
                                        <td style={TD}><span style={{ background:'#fff8e1', color:'#6d4c00', padding:'3px 9px', borderRadius:6, fontSize:12, fontWeight:600 }}>{INCOME_LABEL[d.bracket]||d.bracket}</span></td>
                                        <td style={{ ...TD, fontWeight:700 }}>{Number(d.count).toLocaleString()}</td>
                                        <td style={{ ...TD, minWidth:200 }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <div style={{ flex:1 }}><Bar pct={pct} color="#854F0B" /></div>
                                                <span style={{ fontSize:12, color:'#aaa', minWidth:38 }}>{pct.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                    </tr>;
                                })}
                                </tbody>
                            </table>
                        </div>
                    </>}

                </div>
            </main>
        </div>
    );
}
