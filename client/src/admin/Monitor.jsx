import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card } from '../components/ui.jsx';

const Stat = ({ label, value, tone = 'text-white' }) => (
  <Card className="!p-4"><div className="text-xs uppercase tracking-wide text-slate-400">{label}</div><div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div></Card>
);

export default function Monitor() {
  const [r, setR] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState({});
  const [onlyWarn, setOnlyWarn] = useState(true);

  const load = () => api('/admin/monitor').then(setR).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  if (!r) return <Alert>{error}</Alert>;
  const s = r.summary;
  const issues = r.issues.filter((i) => !onlyWarn || i.problems.some((p) => p.level === 'warn'));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">Kim hali to‘ldirmagani va shubhali yozuvlar avtomatik tekshiriladi.</p>
        <Button variant="ghost" onClick={load}>↻ Yangilash</Button>
      </div>
      <Alert>{error}</Alert>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Jami talaba" value={s.students} />
        <Stat label="To‘ldirgan" value={s.submitted} tone="text-emerald-300" />
        <Stat label="To‘ldirmagan" value={s.missing} tone={s.missing ? 'text-amber-300' : 'text-emerald-300'} />
        <Stat label="Shubhali yozuv" value={s.warnings} tone={s.warnings ? 'text-red-300' : 'text-emerald-300'} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Guruhlar bo‘yicha</h2>
        <Card className="divide-y divide-ink-700/60 !p-0">
          {r.groups.map((g) => {
            const pct = g.total ? Math.round((g.submitted / g.total) * 100) : 0;
            return (
              <div key={g._id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <b className="w-28 text-white">{g.index}</b>
                  <div className="h-2 min-w-32 flex-1 overflow-hidden rounded-full bg-ink-700"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
                  <span className="w-24 text-right text-sm text-slate-300">{g.submitted}/{g.total} ({pct}%)</span>
                  {g.missing.length > 0 && (
                    <button onClick={() => setOpen({ ...open, [g._id]: !open[g._id] })} className="text-sm text-brand-400 hover:underline">
                      {open[g._id] ? 'Yopish' : `Kimlar yo‘q (${g.missing.length})`}
                    </button>
                  )}
                </div>
                {open[g._id] && (
                  <div className="mt-2 text-sm text-amber-200/90">
                    {g.tutor && <p className="mb-1 text-slate-400">Tyutor: {g.tutor}</p>}
                    <ol className="list-decimal pl-6">{g.missing.map((n) => <li key={n}>{n}</li>)}</ol>
                  </div>
                )}
              </div>
            );
          })}
          {!r.groups.length && <p className="px-4 py-6 text-center text-slate-500">Guruhlar yo‘q</p>}
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Tekshiruv natijalari</h2>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={onlyWarn} onChange={(e) => setOnlyWarn(e.target.checked)} className="h-4 w-4 accent-blue-500" />
            Faqat jiddiy muammolar
          </label>
        </div>
        <Card className="divide-y divide-ink-700/60 !p-0">
          {issues.map((i) => (
            <div key={i.id} className="px-4 py-3">
              <div className="mb-1 flex items-center gap-2"><b className="text-white">{i.fullName}</b><span className="text-sm text-blue-300">{i.groupIndex}</span></div>
              <ul className="space-y-0.5 text-sm">
                {i.problems.filter((p) => !onlyWarn || p.level === 'warn').map((p, k) => (
                  <li key={k} className={p.level === 'warn' ? 'text-red-300' : 'text-slate-400'}>{p.level === 'warn' ? '⚠' : 'ℹ'} {p.text}</li>
                ))}
              </ul>
            </div>
          ))}
          {!issues.length && <p className="px-4 py-6 text-center text-emerald-300">Muammo topilmadi ✓</p>}
        </Card>
      </section>

    </div>
  );
}
