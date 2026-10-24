import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Avatar, Button, Kpis, Meter, PageHead } from '../components/ui.jsx';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

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
    <div>
      <PageHead
        title="Nazorat"
        finding={s.students ? (s.missing ? `${s.missing} ta talaba hali formani to‘ldirmagan.` : 'Hamma talaba formani to‘ldirgan.') : undefined}
        actions={<Button variant="ghost" onClick={load}>Yangilash</Button>}
        steps={[
          'Yuqoridagi raqamlar: nechta talaba formani to‘ldirgan, nechtasi to‘ldirmagan va nechta yozuvda shubhali joy bor.',
          '"Guruhlar bo‘yicha" ro‘yxatida har guruhning to‘ldirish chizig‘i turadi. "Kimlar yo‘q" tugmasi to‘ldirmagan talabalarni ko‘rsatadi: eslatish uchun.',
          '"Tekshiruv natijalari"da noto‘g‘ri telefon, to‘liq bo‘lmagan ism yoki manzil, lokatsiyasiz yozuvlar chiqadi.',
          'Sahifa ochilganda yangilanadi. Yangi ma’lumotni ko‘rish uchun "Yangilash"ni bosing.',
        ]}
      >
        Kim hali formani to‘ldirmagani va shubhali yozuvlar avtomatik tekshiriladi.
      </PageHead>
      <Alert>{error}</Alert>

      <Kpis items={[
        { label: 'Jami talaba', value: s.students, caption: `${r.groups.length} ta guruhda` },
        { label: 'To‘ldirgan', value: s.submitted, caption: `jamining ${pct(s.submitted, s.students)}%` },
        { label: 'To‘ldirmagan', value: s.missing, caption: `jamining ${pct(s.missing, s.students)}%` },
        { label: 'Shubhali yozuv', value: s.warnings, caption: s.warnings ? 'tekshirish kerak' : 'muammo yo‘q' },
      ]} />

      <section className="mt-10">
        <h2 className="mb-1 text-base font-semibold text-white">Guruhlar bo‘yicha</h2>
        <p className="mb-3 text-sm text-slate-300">Formani to‘ldirgan talabalar ulushi.</p>
        <div>
          {r.groups.map((g) => (
            <div key={g._id} className="border-b border-[var(--rule)] py-3">
              <div className="grid items-center gap-x-6 gap-y-2 md:grid-cols-[10rem_1fr_9rem]">
                <div className="min-w-0"><div className="font-medium text-white">{g.index}</div>{g.tutor && <div className="truncate text-[13px] text-slate-400">{g.tutor}</div>}</div>
                <Meter value={g.submitted} total={g.total} />
                <div className="md:text-right">
                  {g.missing.length > 0
                    ? <button onClick={() => setOpen({ ...open, [g._id]: !open[g._id] })} className="min-h-9 text-sm text-slate-200 underline-offset-4 hover:text-white hover:underline">{open[g._id] ? 'Yopish' : `Kimlar yo‘q (${g.missing.length})`}</button>
                    : <span className="text-sm text-slate-400">{g.total ? 'Hamma to‘ldirgan' : 'Talaba yo‘q'}</span>}
                </div>
              </div>
              {open[g._id] && (
                <ul className="mt-3 grid gap-x-6 gap-y-1 rounded-[14px] bg-ink-800 p-4 text-sm text-slate-200 sm:grid-cols-2">
                  {g.missing.map((n) => <li key={n} className="flex items-center gap-2.5 py-1"><Avatar name={n} size={24} />{n}</li>)}
                </ul>
              )}
            </div>
          ))}
          {!r.groups.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Hali guruh yo‘q. Guruhlar bo‘limida yarating.</p>}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Tekshiruv natijalari</h2>
            <p className="text-sm text-slate-300">{issues.length} ta yozuvda izoh bor.</p>
          </div>
          <label className="flex min-h-9 items-center gap-2 text-sm text-slate-200">
            <input type="checkbox" checked={onlyWarn} onChange={(e) => setOnlyWarn(e.target.checked)} className="h-4 w-4 accent-white" />
            Faqat jiddiy muammolar
          </label>
        </div>
        <div>
          {issues.map((i) => (
            <div key={i.id} className="border-b border-[var(--rule)] py-3">
              <div className="mb-1 flex items-center gap-3"><Avatar name={i.fullName} size={28} /><span className="font-medium text-white">{i.fullName}</span><span className="text-sm text-slate-400">{i.groupIndex}</span></div>
              <ul className="ml-10 space-y-0.5 text-sm">
                {i.problems.filter((p) => !onlyWarn || p.level === 'warn').map((p, k) => (
                  <li key={k} className={p.level === 'warn' ? 'text-warning' : 'text-slate-300'}>{p.text}</li>
                ))}
              </ul>
            </div>
          ))}
          {!issues.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Muammo topilmadi.</p>}
        </div>
      </section>
    </div>
  );
}
