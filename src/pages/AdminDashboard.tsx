import { useState, useEffect, useRef, useCallback } from 'react';
import type { CSSProperties } from 'react';

/* ─── auth ────────────────────────────────────────────── */
const ADMIN_USER = 'kiabi';
const ADMIN_PASS = 'kiabi2026';
const API = '/api/survey';

/* ─── card definitions ────────────────────────────────── */
type CardType = 'binary' | 'choice' | 'scale';
interface CardDef { id: string; section: string; type: CardType; label: string; color: string; }

const CARDS: CardDef[] = [
    { id: 's1',  section: 'Sections Shopped', type: 'choice', label: 'Which sections did you shop today?',           color: '#993556' },
    { id: 'k1',  section: 'Brand Awareness',  type: 'binary', label: 'Did you know KIABI before visiting this sale?',color: '#8B5E15' },
    { id: 'st1', section: 'Style Perception', type: 'choice', label: "How would you describe KIABI's styles?",       color: '#0E5F75' },
    { id: 'p1',  section: 'Price Perception', type: 'choice', label: 'What did you think of the prices at the sale?',color: '#2B6B26' },
    { id: 'sh1', section: 'Shopping Habits',  type: 'choice', label: 'Where do you usually shop for clothes?',       color: '#7A3010' },
    { id: 'm1',  section: 'Myntra Intent',    type: 'binary', label: 'Were you aware KIABI is on Myntra?',           color: '#444441' },
    { id: 'm2',  section: 'Myntra Intent',    type: 'scale',  label: 'How likely to shop KIABI on Myntra? (1–5)',    color: '#2C2C2A' },
    { id: 'r1',  section: 'Recommendation',   type: 'scale',  label: 'Would you recommend KIABI to a friend? (1–5)',color: '#185FA5' },
    { id: 'i1',  section: 'Income Range',     type: 'choice', label: 'Monthly household income?',                    color: '#854F0B' },
    { id: 'o1',  section: 'Overall',          type: 'binary', label: 'Would you love KIABI to open a store in your city?', color: '#534AB7' },
];
const CARD_MAP: Record<string, CardDef> = Object.fromEntries(CARDS.map(c => [c.id, c]));

const CHOICE_LABELS: Record<string, Record<string, string>> = {
    s1:  { women: 'Women', men: 'Men', girl: 'Kids (Girl)', boy: 'Kids (Boy)', new_born: 'Baby/Newborn', just_browsing: 'Just Browsing' },
    st1: { trendy: 'Trendy & fashionable', casual: 'Everyday casual', family: 'Family-friendly', european: 'Too European', basic: 'Basic / nothing special' },
    p1:  { excellent: 'Excellent value', fair: 'Fair / reasonable', okay: 'Expected more discount', high: 'Too high' },
    sh1: { mass: 'Reliance/Max/Pantaloons/Zudio', intl: 'H&M/Zara/Uniqlo/M&S', online: 'Myntra/Ajio (online)', local: 'Local markets', premium: 'Premium brands' },
    i1:  { under_5L: 'Under ₹5,00,000', above_5L: 'Above ₹5,00,000', prefer_not: 'Prefer not to say' },
};

const SEC_COLORS: Record<string, string> = {
    'Sections Shopped': '#993556', 'Brand Awareness': '#8B5E15',
    'Style Perception': '#0E5F75', 'Price Perception': '#2B6B26',
    'Shopping Habits':  '#7A3010', 'Myntra Intent':    '#444441',
    'Recommendation':   '#185FA5', 'Income Range':     '#854F0B', 'Overall': '#534AB7',
};

/* ─── types ────────────────────────────────────────────── */
interface AnswerDist  { cardId: string; answer: string; count: string; }
interface CardStat    { cardId: string; section: string; statement: string; total: string; yesCount: string; yesRate: string; avgDwellMs: string; }
interface SectionStat { section: string; total: string; yesRate: string; }
interface IncomeDist  { bracket: string; count: string; }
interface DemoStat    { gender: string; ageGroup: string; total: string; yesRate: string; }
interface ScaleItem   { answer: string; count: string; }
interface Stats {
    totalSessions: number; cardStats: CardStat[]; answerDist: AnswerDist[];
    sectionStats: SectionStat[]; incomeDist: IncomeDist[];
    demographicStats: DemoStat[]; myntraScale: ScaleItem[]; npsScale: ScaleItem[];
}
interface Session {
    id: number; sessionId: string; userName: string; userGender: string;
    userAgeGroup: string; userEmployment: string; contact: string; incomeBracket: string;
    totalAnswered: number; totalSkipped: number; yesCount: number; nopeCount: number;
    skippedCardIds: string[]; commentText: string; completedAt: string; createdAt: string;
}
interface Answer {
    id: number; sessionId: string; cardId: string; section: string; statement: string;
    answer: string; dwellTimeMs: number; userGender: string; userAgeGroup: string;
    userEmployment: string; answeredAt: string;
}

type Tab = 'overview' | 'questions' | 'sessions' | 'answers' | 'demographics';

/* ─── helpers ───────────────────────────────────────────── */
function downloadCSV(rows: Record<string, unknown>[], filename: string): void {
    if (!rows.length) return;
    const esc = (v: unknown): string => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = filename;
    a.click();
}

function choiceLabel(cardId: string, val: string): string {
    return CHOICE_LABELS[cardId]?.[val] ?? val;
}

/* ─── tiny components ───────────────────────────────────── */
function Bar({ pct, color, h = 8 }: { pct: number; color: string; h?: number }) {
    return (
        <div style={{ background: '#f0ece8', borderRadius: 99, height: h, width: '100%', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 99, transition: 'width .6s ease' }} />
        </div>
    );
}

function Badge({ v, green, red }: { v: string | number; green?: boolean; red?: boolean }) {
    const bg  = green ? '#e8f5e9' : red ? '#fce4ec' : '#eef0fb';
    const col = green ? '#1b5e20' : red ? '#880e4f' : '#3C3489';
    return <span style={{ background: bg, color: col, padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{v}</span>;
}

function Pill({ label, color }: { label: string; color: string }) {
    return (
        <span style={{ background: color + '1a', color, border: `1px solid ${color}33`, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
    );
}

/* ─── canvas bar chart ──────────────────────────────────── */
function BarChart({ labels, values, color, h = 200 }: { labels: string[]; values: number[]; color: string | string[]; h?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext('2d'); if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const W = c.offsetWidth;
        c.width = W * dpr; c.height = h * dpr; ctx.scale(dpr, dpr);
        const pL = 36, pR = 10, pT = 18, pB = 44, cW = W - pL - pR, cH = h - pT - pB;
        const max = Math.max(...values, 1);
        ctx.clearRect(0, 0, W, h);
        for (let i = 0; i <= 4; i++) {
            const y = pT + cH - (i / 4) * cH;
            ctx.strokeStyle = '#ede8e2'; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.stroke();
            ctx.fillStyle = '#bbb'; ctx.font = '9px system-ui'; ctx.textAlign = 'right';
            ctx.fillText(String(Math.round((i / 4) * max)), pL - 4, y + 3);
        }
        const gap = cW / labels.length, bW = Math.max(6, gap * 0.58);
        labels.forEach((lbl, i) => {
            const bH = (values[i] / max) * cH, y = pT + cH - bH, x = pL + i * gap + gap / 2 - bW / 2;
            ctx.fillStyle = Array.isArray(color) ? (color[i % color.length] ?? '#3C3489') : color;
            ctx.beginPath(); ctx.roundRect(x, y, bW, bH, [3, 3, 0, 0]); ctx.fill();
            ctx.fillStyle = '#444'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
            if (values[i] > 0) ctx.fillText(String(values[i]), pL + i * gap + gap / 2, y - 4);
            const short = lbl.length > 10 ? lbl.slice(0, 10) + '…' : lbl;
            ctx.fillStyle = '#999'; ctx.fillText(short, pL + i * gap + gap / 2, pT + cH + 14);
        });
    }, [labels, values, color, h]);
    return <canvas ref={ref} style={{ width: '100%', height: h, display: 'block' }} />;
}

/* ─── horizontal bar for choice questions ───────────────── */
interface HorizItem { label: string; count: number; color: string; }
function HorizBar({ data, total }: { data: HorizItem[]; total: number }) {
    if (!total) return <span style={{ fontSize: 12, color: '#ccc' }}>No data yet</span>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.map((d, i) => {
                const pct = (d.count / total) * 100;
                return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: '#666', minWidth: 160, flexShrink: 0, lineHeight: 1.3 }}>{d.label}</span>
                        <div style={{ flex: 1, background: '#f0ece8', borderRadius: 99, height: 10, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 99, transition: 'width .5s ease' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#333', minWidth: 28, textAlign: 'right' }}>{d.count}</span>
                        <span style={{ fontSize: 10, color: '#bbb', minWidth: 32 }}>{pct.toFixed(0)}%</span>
                    </div>
                );
            })}
        </div>
    );
}

/* ─── r1 recommendation is 1–5 scale (same as Myntra) ──────── */
function NpsGauge({ data }: { data: ScaleItem[] }) {
    return <ScaleBar data={data} min={1} max={5} />;
}

/* ─── Likert scale bar (1–5) ────────────────────────────── */
function ScaleBar({ data, min, max }: { data: ScaleItem[]; min: number; max: number }) {
    const total = data.reduce((s, d) => s + Number(d.count), 0);
    const scores = Array.from({ length: max - min + 1 }, (_, i) => {
        const v = String(i + min);
        const f = data.find(d => d.answer === v);
        return { score: i + min, count: f ? Number(f.count) : 0 };
    });
    const avg = total ? scores.reduce((s, d) => s + d.score * d.count, 0) / total : 0;
    const maxC = Math.max(...scores.map(s => s.count), 1);
    const pal = ['#f44336', '#ff9800', '#ffc107', '#8bc34a', '#4caf50'];
    return (
        <div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60, marginBottom: 8 }}>
                {scores.map((s, i) => (
                    <div key={s.score} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <span style={{ fontSize: 10, color: '#555', fontWeight: 700 }}>{s.count || ''}</span>
                        <div style={{ width: '100%', background: pal[i] ?? '#3C3489', borderRadius: '3px 3px 0 0', height: `${(s.count / maxC) * 44}px`, minHeight: s.count > 0 ? 4 : 0 }} />
                        <span style={{ fontSize: 9, color: '#aaa' }}>{s.score}</span>
                    </div>
                ))}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#888', textAlign: 'center' }}>
                Avg: <strong style={{ color: '#3C3489' }}>{avg.toFixed(2)}</strong> / {max} &nbsp;·&nbsp; {total} responses
            </p>
        </div>
    );
}

/* ─── style atoms ───────────────────────────────────────── */
const TH: CSSProperties = { padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.5px', borderBottom: '2px solid #ede8e2', whiteSpace: 'nowrap', background: '#fafaf8' };
const TD: CSSProperties = { padding: '9px 12px', borderBottom: '1px solid #f5f2ee', fontSize: 12, color: '#333', verticalAlign: 'middle' };
const CARD: CSSProperties = { background: '#fff', border: '1px solid #ede8e2', borderRadius: 14, padding: '20px 22px' };
const ST: CSSProperties  = { fontSize: 11, fontWeight: 800, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.8px', margin: '0 0 16px' };
const GB: CSSProperties  = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: '#2B6B26', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer' };
const OB: CSSProperties  = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 13px', background: '#fff', color: '#666', border: '1px solid #e0ddd5', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer' };
const COLORS_PAL = ['#3C3489', '#993556', '#0E5F75', '#2B6B26', '#854F0B', '#7A3010'];

/* ══════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
    const [authed, setAuthed]     = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginErr, setLoginErr] = useState('');
    const [stats, setStats]       = useState<Stats | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [answers, setAnswers]   = useState<Answer[]>([]);
    const [loading, setLoading]   = useState(false);
    const [tab, setTab]           = useState<Tab>('overview');
    const [search, setSearch]     = useState('');
    const [sideOpen, setSideOpen] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === ADMIN_USER && password === ADMIN_PASS) { setAuthed(true); setLoginErr(''); }
        else setLoginErr('Invalid username or password');
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [st, se, an] = await Promise.all([
                fetch(`${API}/stats`).then(r => r.json()) as Promise<Stats>,
                fetch(`${API}/admin/sessions`).then(r => r.json()) as Promise<Session[]>,
                fetch(`${API}/admin/answers`).then(r => r.json()) as Promise<Answer[]>,
            ]);
            setStats(st);
            setSessions(Array.isArray(se) ? se : []);
            setAnswers(Array.isArray(an) ? an : []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { if (authed) load(); }, [authed, load]);

    /* ── LOGIN ── */
    if (!authed) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#f5f4f0,#eceae4)', fontFamily: 'system-ui,sans-serif', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e0ddd5', padding: '44px 36px', width: '100%', maxWidth: 380, boxShadow: '0 8px 48px rgba(60,52,137,.10)' }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ display: 'inline-flex', background: '#3C3489', color: '#fff', borderRadius: 12, padding: '9px 22px', marginBottom: 12 }}>
                        <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: 4 }}>KIABI</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: '#bbb', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Admin Dashboard</p>
                </div>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>Username</label>
                        <input type="text" value={username} placeholder="Enter username" onChange={e => setUsername(e.target.value)}
                               style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4df', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafaf8', fontFamily: 'inherit' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>Password</label>
                        <input type="password" value={password} placeholder="Enter password" onChange={e => setPassword(e.target.value)}
                               style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #e8e4df', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fafaf8', fontFamily: 'inherit' }} />
                    </div>
                    {loginErr && <p style={{ margin: 0, fontSize: 12, color: '#993556', background: '#fce4ec', borderRadius: 8, padding: '8px 12px' }}>{loginErr}</p>}
                    <button type="submit" style={{ padding: '12px', background: '#3C3489', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>
                        Sign in →
                    </button>
                </form>
            </div>
        </div>
    );

    /* ── LOADING ── */
    if (loading || !stats) return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f5f4f0', fontFamily: 'system-ui,sans-serif', color: '#aaa' }}>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ width: 36, height: 36, border: '3px solid #e8e4df', borderTopColor: '#3C3489', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13 }}>Loading analytics…</p>
        </div>
    );

    /* ── derived ── */
    const binaryCards = CARDS.filter(c => c.type === 'binary');
    const totalAnswers = stats.cardStats.reduce((s, c) => s + Number(c.total), 0);
    const avgYesRate = binaryCards.length
        ? binaryCards.reduce((s, c) => { const f = stats.cardStats.find(x => x.cardId === c.id); return s + Number(f?.yesRate ?? 0); }, 0) / binaryCards.length
        : 0;

    const distByCard: Record<string, AnswerDist[]> = {};
    (stats.answerDist ?? []).forEach(d => { (distByCard[d.cardId] ??= []).push(d); });

    const lc = search.toLowerCase();
    const filtS = sessions.filter(s => !lc || [s.userName, s.contact, s.userGender, s.userAgeGroup, s.sessionId].some(v => v?.toLowerCase().includes(lc)));
    const filtA = answers.filter(a => !lc || [a.section, a.statement, a.answer, a.userGender, a.sessionId].some(v => v?.toLowerCase().includes(lc)));
    const genders   = Array.from(new Set(stats.demographicStats.map(d => d.gender))).filter(Boolean) as string[];
    const ageGroups = Array.from(new Set(stats.demographicStats.map(d => d.ageGroup))).filter(Boolean) as string[];

    /* ── csv exports ── */
    const exportSessions = () => downloadCSV(sessions.map(s => ({
        ID: s.id, Session_ID: s.sessionId, Name: s.userName, Gender: s.userGender,
        Age: s.userAgeGroup, Employment: s.userEmployment, Contact: s.contact,
        Income: s.incomeBracket, Answered: s.totalAnswered, Skipped: s.totalSkipped,
        Yes: s.yesCount, No: s.nopeCount, Comment: s.commentText ?? '',
        Completed: s.completedAt, Created: s.createdAt,
    })), 'kiabi_sessions.csv');

    const exportAnswers = () => downloadCSV(answers.map(a => ({
        ID: a.id, Session: a.sessionId, Card: a.cardId, Section: a.section,
        Question: a.statement, Answer: a.answer,
        Dwell_ms: a.dwellTimeMs, Dwell_sec: (a.dwellTimeMs / 1000).toFixed(2),
        Gender: a.userGender, Age: a.userAgeGroup, Employment: a.userEmployment, Date: a.answeredAt,
    })), 'kiabi_answers.csv');

    const exportQ = () => downloadCSV(CARDS.map(c => {
        const cs = stats.cardStats.find(x => x.cardId === c.id);
        return {
            Card: c.id, Section: c.section, Type: c.type, Question: c.label,
            Total: cs?.total ?? 0, Yes: cs?.yesCount ?? '',
            Yes_Rate: cs?.yesRate ? `${cs.yesRate}%` : '',
            Avg_Dwell: cs?.avgDwellMs ? `${(Number(cs.avgDwellMs) / 1000).toFixed(1)}s` : '',
        };
    }), 'kiabi_questions.csv');

    const NAV: [Tab, string, string][] = [
        ['overview',     '▦', 'Overview'],
        ['questions',    '◧', 'Questions'],
        ['sessions',     '☰', 'Sessions'],
        ['answers',      '≡', 'Answers'],
        ['demographics', '◉', 'Demographics'],
    ];

    /* ── sidebar ── */
    const SidebarContent = () => (
        <aside style={{ width: 210, background: '#fff', borderRight: '1px solid #ede8e2', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
            <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #f5f2ee' }}>
                <div style={{ display: 'inline-flex', background: '#3C3489', color: '#fff', borderRadius: 9, padding: '6px 14px', marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 3 }}>KIABI</span>
                </div>
                <p style={{ margin: 0, fontSize: 10, color: '#ccc', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Admin Portal</p>
            </div>
            <nav style={{ padding: '10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {NAV.map(([id, icon, label]) => (
                    <button key={id} onClick={() => { setTab(id); setSearch(''); setSideOpen(false); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, border: 'none', background: tab === id ? '#3C3489' : 'transparent', color: tab === id ? '#fff' : '#888', fontSize: 13, fontWeight: tab === id ? 700 : 400, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <span style={{ fontSize: 14 }}>{icon}</span>{label}
                    </button>
                ))}
            </nav>
            <div style={{ padding: '0 8px 20px' }}>
                <div style={{ padding: '12px 14px', background: '#f5f4f0', borderRadius: 10, marginBottom: 8 }}>
                    <p style={{ margin: '0 0 2px', fontSize: 10, color: '#bbb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px' }}>Total Responses</p>
                    <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#3C3489', lineHeight: 1 }}>{stats.totalSessions}</p>
                </div>
                <button onClick={() => setAuthed(false)} style={{ width: '100%', padding: '9px', background: 'transparent', border: '1px solid #e8e4e0', borderRadius: 8, fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
                    ⎋ &nbsp;Sign out
                </button>
            </div>
        </aside>
    );

    return (
        <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#f5f4f0', fontFamily: 'system-ui,-apple-system,sans-serif', overflowX: 'hidden' }}>
            <style>{`
        *{box-sizing:border-box}
        body{margin:0!important;display:block!important;justify-content:unset!important;align-items:unset!important;}
        #root{display:flex!important;width:100%!important;justify-content:unset!important;align-items:unset!important;}
        .desk-sb{display:flex;position:sticky;top:0;height:100vh;flex-shrink:0}
        .mob-ham{display:none!important}
        @media(max-width:767px){.desk-sb{display:none!important}.mob-ham{display:flex!important}}
      `}</style>

            {/* Desktop sidebar */}
            <div className="desk-sb"><SidebarContent /></div>

            {/* Mobile overlay */}
            {sideOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)' }} onClick={() => setSideOpen(false)} />
                    <div style={{ position: 'relative', zIndex: 1, height: '100%', width: 220 }}><SidebarContent /></div>
                </div>
            )}

            <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
                {/* topbar */}
                <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="mob-ham" onClick={() => setSideOpen(true)}
                                style={{ background: '#fff', border: '1px solid #e0ddd5', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', fontSize: 16, display: 'none' }}>☰</button>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a1a2e' }}>
                                {tab === 'overview' && 'Survey Overview'}{tab === 'questions' && 'Question Analysis'}
                                {tab === 'sessions' && 'All Sessions'}{tab === 'answers' && 'All Answers'}
                                {tab === 'demographics' && 'Demographics'}
                            </h1>
                            <p style={{ margin: 0, fontSize: 11, color: '#ccc' }}>KIABI Sample Sale · Analytics</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {tab === 'questions'    && <button style={GB} onClick={exportQ}>⬇ CSV</button>}
                        {tab === 'sessions'     && <button style={GB} onClick={exportSessions}>⬇ Sessions CSV</button>}
                        {tab === 'answers'      && <button style={GB} onClick={exportAnswers}>⬇ Answers CSV</button>}
                        <button onClick={load} style={OB}>↻ Refresh</button>
                    </div>
                </div>

                <div style={{ padding: '0 16px 48px', display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* ════ OVERVIEW ════ */}
                    {tab === 'overview' && <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
                            {([
                                ['Responses',    stats.totalSessions,           '#3C3489'],
                                ['Total Answers',totalAnswers.toLocaleString(), '#0E5F75'],
                                ['Avg Yes Rate', `${avgYesRate.toFixed(1)}%`,  '#2B6B26'],
                                ['Questions',    CARDS.length,                  '#854F0B'],
                            ] as [string, string | number, string][]).map(([lbl, val, col]) => (
                                <div key={lbl} style={{ background: '#fff', border: '1px solid #ede8e2', borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${col}` }}>
                                    <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', letterSpacing: '.6px' }}>{lbl}</p>
                                    <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: col, lineHeight: 1 }}>{val}</p>
                                </div>
                            ))}
                        </div>

                        <div style={CARD}>
                            <p style={ST}>Section Yes Rate (%)</p>
                            <BarChart
                                labels={stats.sectionStats.map(s => s.section.split(' ')[0] ?? s.section)}
                                values={stats.sectionStats.map(s => Math.round(Number(s.yesRate ?? 0)))}
                                color={stats.sectionStats.map(s => SEC_COLORS[s.section] ?? '#3C3489')}
                                h={200} />
                        </div>

                        <div style={CARD}>
                            <p style={ST}>Yes / No Questions at a Glance</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {binaryCards.map(c => {
                                    const cs = stats.cardStats.find(x => x.cardId === c.id);
                                    const rate = Number(cs?.yesRate ?? 0);
                                    return (
                                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 12, color: '#555', minWidth: 240, lineHeight: 1.4, flex: 1 }}>{c.label}</span>
                                            <div style={{ flex: 2, minWidth: 100 }}><Bar pct={rate} color={c.color} h={10} /></div>
                                            <Badge v={`${rate.toFixed(0)}%`} green={rate >= 60} red={rate < 40} />
                                            <span style={{ fontSize: 11, color: '#ccc', minWidth: 56 }}>{cs?.total ?? 0} resp.</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
                            <div style={CARD}>
                                <p style={ST}>Recommend KIABI? (1–5)</p>
                                <NpsGauge data={stats.npsScale ?? []} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                    <span style={{ fontSize: 10, color: '#bbb' }}>Not at all</span>
                                    <span style={{ fontSize: 10, color: '#bbb' }}>Definitely</span>
                                </div>
                            </div>
                            <div style={CARD}>
                                <p style={ST}>Myntra Shopping Likelihood (1–5)</p>
                                <ScaleBar data={stats.myntraScale ?? []} min={1} max={5} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                                    <span style={{ fontSize: 10, color: '#bbb' }}>Very unlikely</span>
                                    <span style={{ fontSize: 10, color: '#bbb' }}>Very likely</span>
                                </div>
                            </div>
                        </div>

                        <div style={CARD}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <p style={{ ...ST, margin: 0 }}>Section Summary</p>
                                <button style={GB} onClick={() => downloadCSV(stats.sectionStats.map(s => ({ Section: s.section, Total: s.total, Yes_Rate: `${s.yesRate}%` })), 'kiabi_sections.csv')}>⬇ CSV</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>{['Section', 'Total', 'Yes Rate', 'Bar'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                    <tbody>
                                    {stats.sectionStats.map(s => {
                                        const r = Number(s.yesRate ?? 0), col = SEC_COLORS[s.section] ?? '#3C3489';
                                        return (
                                            <tr key={s.section}>
                                                <td style={TD}><Pill label={s.section} color={col} /></td>
                                                <td style={{ ...TD, fontWeight: 600 }}>{Number(s.total).toLocaleString()}</td>
                                                <td style={TD}><Badge v={`${r.toFixed(1)}%`} green={r >= 60} red={r < 40} /></td>
                                                <td style={{ ...TD, minWidth: 120 }}><Bar pct={r} color={col} /></td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>}

                    {/* ════ QUESTIONS ════ */}
                    {tab === 'questions' && <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button style={GB} onClick={exportQ}>⬇ Export All CSV</button>
                        </div>
                        {CARDS.map(c => {
                            const cs = stats.cardStats.find(x => x.cardId === c.id);
                            const dist = distByCard[c.id] ?? [];
                            const total = Number(cs?.total ?? 0);
                            return (
                                <div key={c.id} style={{ ...CARD, borderLeft: `4px solid ${c.color}` }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <code style={{ background: '#f0ece8', color: '#3C3489', padding: '2px 7px', borderRadius: 5, fontSize: 11, fontFamily: 'monospace' }}>{c.id}</code>
                                            <Pill label={c.section} color={c.color} />
                                            <span style={{ fontSize: 10, fontWeight: 700, color: '#bbb', textTransform: 'uppercase', background: '#f5f4f0', padding: '2px 7px', borderRadius: 5 }}>{c.type}</span>
                                        </div>
                                        <span style={{ fontSize: 11, color: '#aaa' }}>
                      {total} responses{cs?.avgDwellMs ? ` · ${(Number(cs.avgDwellMs) / 1000).toFixed(1)}s avg` : ''}
                    </span>
                                    </div>
                                    <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#222', lineHeight: 1.5 }}>{c.label}</p>

                                    {c.type === 'binary' && cs && (
                                        <div>
                                            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                                                {([
                                                    { l: 'Yes', n: Number(cs.yesCount), col: '#4caf50', bg: '#e8f5e9' },
                                                    { l: 'No',  n: total - Number(cs.yesCount), col: '#f44336', bg: '#fce4ec' },
                                                ]).map(x => (
                                                    <div key={x.l} style={{ flex: 1, minWidth: 80, background: x.bg, borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                                                        <p style={{ margin: '0 0 2px', fontSize: 11, color: x.col, fontWeight: 700 }}>{x.l}</p>
                                                        <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 900, color: x.col }}>{x.n}</p>
                                                        <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>{total ? ((x.n / total) * 100).toFixed(0) : 0}%</p>
                                                    </div>
                                                ))}
                                            </div>
                                            <Bar pct={Number(cs.yesRate ?? 0)} color={c.color} h={10} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                <span style={{ fontSize: 10, color: '#aaa' }}>Yes {cs.yesRate}%</span>
                                                <span style={{ fontSize: 10, color: '#aaa' }}>No {(100 - Number(cs.yesRate ?? 0)).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    )}

                                    {c.type === 'choice' && (
                                        <HorizBar
                                            total={dist.reduce((s, d) => s + Number(d.count), 0)}
                                            data={[...dist].sort((a, b) => Number(b.count) - Number(a.count)).map((d, i) => ({
                                                label: choiceLabel(c.id, d.answer),
                                                count: Number(d.count),
                                                color: COLORS_PAL[i % COLORS_PAL.length] ?? '#3C3489',
                                            }))}
                                        />
                                    )}

                                    {c.type === 'scale' && c.id === 'r1' && (
                                        <>
                                            <NpsGauge data={dist.map(d => ({ answer: d.answer, count: d.count }))} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                <span style={{ fontSize: 10, color: '#bbb' }}>Not at all</span>
                                                <span style={{ fontSize: 10, color: '#bbb' }}>Definitely</span>
                                            </div>
                                        </>
                                    )}
                                    {c.type === 'scale' && c.id === 'm2' && (
                                        <>
                                            <ScaleBar data={dist.map(d => ({ answer: d.answer, count: d.count }))} min={1} max={5} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                <span style={{ fontSize: 10, color: '#bbb' }}>Very unlikely</span>
                                                <span style={{ fontSize: 10, color: '#bbb' }}>Very likely</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </>}

                    {/* ════ SESSIONS ════ */}
                    {tab === 'sessions' && <>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, contact, gender…"
                                   style={{ flex: 1, minWidth: 200, padding: '9px 13px', border: '1.5px solid #e0ddd5', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                            <button style={GB} onClick={exportSessions}>⬇ Export CSV</button>
                        </div>
                        <div style={CARD}>
                            <p style={{ ...ST, marginBottom: 12 }}>{filtS.length} of {sessions.length} sessions</p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>
                                        {['ID', 'Name', 'Gender', 'Age', 'Employment', 'Contact', 'Income', 'Ans', 'Yes', 'No', 'Comment', 'Date'].map(h => <th key={h} style={TH}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                    {filtS.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ ...TD, color: '#ddd', fontSize: 10 }}>{s.id}</td>
                                            <td style={{ ...TD, fontWeight: 700 }}>{s.userName || '—'}</td>
                                            <td style={TD}>{s.userGender || '—'}</td>
                                            <td style={TD}>{s.userAgeGroup || '—'}</td>
                                            <td style={TD}>{s.userEmployment || '—'}</td>
                                            <td style={{ ...TD, fontSize: 11 }}>{s.contact || '—'}</td>
                                            <td style={TD}><span style={{ background: '#fff8e1', color: '#6d4c00', padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 600 }}>{s.incomeBracket || '—'}</span></td>
                                            <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>{s.totalAnswered}</td>
                                            <td style={{ ...TD, color: '#1b5e20', fontWeight: 800, textAlign: 'center' }}>{s.yesCount}</td>
                                            <td style={{ ...TD, color: '#880e4f', fontWeight: 800, textAlign: 'center' }}>{s.nopeCount}</td>
                                            <td style={{ ...TD, maxWidth: 160, fontSize: 11, color: '#888' }}>
                                                {s.commentText ? s.commentText.slice(0, 50) + (s.commentText.length > 50 ? '…' : '') : '—'}
                                            </td>
                                            <td style={{ ...TD, fontSize: 10, color: '#bbb', whiteSpace: 'nowrap' }}>
                                                {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                                {filtS.length === 0 && <p style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 13 }}>No sessions found</p>}
                            </div>
                        </div>
                    </>}

                    {/* ════ ANSWERS ════ */}
                    {tab === 'answers' && <>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by section, question, answer…"
                                   style={{ flex: 1, minWidth: 200, padding: '9px 13px', border: '1.5px solid #e0ddd5', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                            <button style={GB} onClick={exportAnswers}>⬇ Export CSV</button>
                        </div>
                        <div style={CARD}>
                            <p style={{ ...ST, marginBottom: 12 }}>
                                {filtA.length.toLocaleString()} of {answers.length.toLocaleString()} answers
                                {filtA.length > 500 ? ' · showing first 500 — export for full data' : ''}
                            </p>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>
                                        {['Card', 'Section', 'Question', 'Answer', 'Dwell', 'Gender', 'Age', 'Date'].map(h => <th key={h} style={TH}>{h}</th>)}
                                    </tr></thead>
                                    <tbody>
                                    {filtA.slice(0, 500).map(a => {
                                        const cardDef = CARD_MAP[a.cardId];
                                        const disp = cardDef?.type === 'choice' ? choiceLabel(a.cardId, a.answer) : a.answer;
                                        const isY = a.answer === 'yes', isN = a.answer === 'nope';
                                        return (
                                            <tr key={a.id}>
                                                <td style={TD}><code style={{ background: '#f0ece8', color: '#3C3489', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontFamily: 'monospace' }}>{a.cardId}</code></td>
                                                <td style={TD}><Pill label={a.section} color={SEC_COLORS[a.section] ?? '#555'} /></td>
                                                <td style={{ ...TD, maxWidth: 200, fontSize: 11, lineHeight: 1.4 }}>{a.statement}</td>
                                                <td style={TD}>
                                                    {isY && <span style={{ background: '#e8f5e9', color: '#1b5e20', padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Yes</span>}
                                                    {isN && <span style={{ background: '#fce4ec', color: '#880e4f', padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>No</span>}
                                                    {!isY && !isN && <span style={{ background: '#f0ece8', color: '#555', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{disp}</span>}
                                                </td>
                                                <td style={{ ...TD, color: '#bbb', fontSize: 11 }}>{a.dwellTimeMs ? `${(a.dwellTimeMs / 1000).toFixed(1)}s` : '—'}</td>
                                                <td style={TD}>{a.userGender || '—'}</td>
                                                <td style={TD}>{a.userAgeGroup || '—'}</td>
                                                <td style={{ ...TD, fontSize: 10, color: '#bbb', whiteSpace: 'nowrap' }}>{a.answeredAt ? new Date(a.answeredAt).toLocaleDateString() : '—'}</td>
                                            </tr>
                                        );
                                    })}
                                    </tbody>
                                </table>
                                {filtA.length === 0 && <p style={{ textAlign: 'center', color: '#ccc', padding: '32px 0', fontSize: 13 }}>No answers found</p>}
                            </div>
                        </div>
                    </>}

                    {/* ════ DEMOGRAPHICS ════ */}
                    {tab === 'demographics' && <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 18 }}>
                            <div style={CARD}>
                                <p style={ST}>By Gender (avg yes rate)</p>
                                {genders.map(g => {
                                    const rows = stats.demographicStats.filter(d => d.gender === g);
                                    const total = rows.reduce((s, r) => s + Number(r.total), 0);
                                    const avg = rows.length ? rows.reduce((s, r) => s + Number(r.yesRate ?? 0), 0) / rows.length : 0;
                                    return (
                                        <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f2ee' }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#333', minWidth: 90 }}>{g}</span>
                                            <span style={{ fontSize: 11, color: '#ccc', minWidth: 70 }}>{total.toLocaleString()}</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#3C3489', minWidth: 40 }}>{avg.toFixed(0)}%</span>
                                            <div style={{ flex: 1 }}><Bar pct={avg} color="#3C3489" /></div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={CARD}>
                                <p style={ST}>By Age Group (avg yes rate)</p>
                                {ageGroups.map(ag => {
                                    const rows = stats.demographicStats.filter(d => d.ageGroup === ag);
                                    const total = rows.reduce((s, r) => s + Number(r.total), 0);
                                    const avg = rows.length ? rows.reduce((s, r) => s + Number(r.yesRate ?? 0), 0) / rows.length : 0;
                                    return (
                                        <div key={ag} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f5f2ee' }}>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#333', minWidth: 60 }}>{ag}</span>
                                            <span style={{ fontSize: 11, color: '#ccc', minWidth: 70 }}>{total.toLocaleString()}</span>
                                            <span style={{ fontSize: 12, fontWeight: 800, color: '#0E5F75', minWidth: 40 }}>{avg.toFixed(0)}%</span>
                                            <div style={{ flex: 1 }}><Bar pct={avg} color="#0E5F75" /></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={CARD}>
                            <p style={ST}>Income Distribution</p>
                            <BarChart labels={stats.incomeDist.map(d => d.bracket)} values={stats.incomeDist.map(d => Number(d.count))} color="#854F0B" h={180} />
                        </div>

                        <div style={CARD}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <p style={{ ...ST, margin: 0 }}>Gender × Age Cross-tab</p>
                                <button style={GB} onClick={() => downloadCSV(stats.demographicStats.map(d => ({ Gender: d.gender, Age: d.ageGroup, Total: d.total, Yes_Rate: `${d.yesRate}%` })), 'kiabi_demographics.csv')}>⬇ CSV</button>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead><tr>{['Gender', 'Age Group', 'Total', 'Yes Rate', 'Bar'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                                    <tbody>
                                    {stats.demographicStats.map((d, i) => (
                                        <tr key={i}>
                                            <td style={TD}>{d.gender || '—'}</td>
                                            <td style={TD}>{d.ageGroup || '—'}</td>
                                            <td style={{ ...TD, fontWeight: 600 }}>{Number(d.total).toLocaleString()}</td>
                                            <td style={TD}><Badge v={`${Number(d.yesRate ?? 0).toFixed(1)}%`} green={Number(d.yesRate) >= 60} red={Number(d.yesRate) < 40} /></td>
                                            <td style={{ ...TD, minWidth: 120 }}><Bar pct={Number(d.yesRate ?? 0)} color="#3C3489" /></td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>}

                </div>
            </main>
        </div>
    );
}
