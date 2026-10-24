import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Field, PageHead, Select } from '../components/ui.jsx';

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const ACTION = {
  login: 'Kirdi', 'group.create': 'Guruh yaratdi', 'group.update': 'Guruhni yangiladi', 'group.delete': 'Guruhni o‘chirdi',
  'student.add': 'Talaba qo‘shdi', 'student.update': 'Talabani yangiladi', 'student.delete': 'Talabani o‘chirdi',
  'submission.update': 'Ma’lumotni yangiladi', 'submission.delete': 'Yozuvni o‘chirdi',
  'photo.upload': 'Rasm yukladi', 'photo.crop': 'Rasmni kesdi', 'photo.delete': 'Rasmni o‘chirdi',
  'report.download': 'Hisobot yukladi', 'export.excel': 'Excel yukladi',
  'user.create': 'Kurator yaratdi', 'user.update': 'Kuratorni yangiladi', 'user.delete': 'Kuratorni o‘chirdi',
  'password.change': 'Parol almashtirdi', 'profile.update': 'Profilni yangiladi',
};

const ago = (d) => {
  if (!d) return 'hech qachon';
  const m = Math.round((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'hozir';
  if (m < 60) return `${m} daqiqa oldin`;
  if (m < 1440) return `${Math.round(m / 60)} soat oldin`;
  return `${Math.round(m / 1440)} kun oldin`;
};
const daysIdle = (d) => (d ? (Date.now() - new Date(d)) / 86400000 : Infinity);

function Bar({ value, total, tone = 'bg-brand-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-ink-700"><div className={`h-full rounded-full ${tone}`} style={{ width: `${pct(value, total)}%` }} /></div>
      <span className="w-20 text-sm text-slate-200">{value}/{total} <span className="text-slate-400">({pct(value, total)}%)</span></span>
    </div>
  );
}

export default function Overview() {
  const [data, setData] = useState(null);
  const [log, setLog] = useState([]);
  const [who, setWho] = useState('');
  const [open, setOpen] = useState({});
  const [error, setError] = useState('');

  const loadOverview = () => api('/admin/overview').then(setData).catch((e) => setError(e.message));
  const loadLog = () => api(`/admin/activity${who ? `?user=${who}` : ''}`).then(setLog).catch((e) => setError(e.message));
  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { loadLog(); }, [who]); // eslint-disable-line

  const refresh = () => { loadOverview(); loadLog(); };
  const idle = (data?.curators || []).filter((c) => c.active && daysIdle(c.lastActiveAt) >= 7);

  return (
    <div className="space-y-6">
      <PageHead
        title="Boshqaruv"
        steps={[
          'Har bir kurator uchun guruhlar soni, talabalar, formani to‘ldirganlar va 4 ta rasmi to‘liq talabalar ulushi ko‘rinadi.',
          'Kurator ismiga bossangiz, uning har bir guruhi bo‘yicha batafsil holat ochiladi: qaysi guruhda ish orqada ekanini darhol ko‘rasiz.',
          '"Biriktirilmagan guruhlar" ro‘yxati hech bir kuratorga berilmagan guruhlarni ko‘rsatadi. Ularni Kuratorlar bo‘limida biriktiring.',
          'Faoliyat jurnali: kim, qachon, nima qilgani (kirish, rasm yuklash, ma’lumotni o‘zgartirish, hisobot olish). Kurator bo‘yicha saralash mumkin.',
        ]}
      >
        Kuratorlar ishini va ularning guruhlarini bir joydan kuzating.
      </PageHead>
      <div className="-mt-3 flex justify-end"><Button variant="ghost" onClick={refresh}>↻ Yangilash</Button></div>
      <Alert>{error}</Alert>

      {idle.length > 0 && (
        <div className="rounded-lg bg-amber-500/10 px-4 py-3 text-[15px] text-amber-200">
          Diqqat: {idle.map((c) => c.fullName).join(', ')} — 7 kundan ortiq tizimda faol bo‘lmagan.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-2xl font-semibold text-white">Kuratorlar</h2>
        <Card className="divide-y divide-ink-700/60 !p-0">
          {(data?.curators || []).map((c) => (
            <div key={c._id} className={c.active ? '' : 'opacity-50'}>
              <button type="button" onClick={() => setOpen({ ...open, [c._id]: !open[c._id] })} className="grid w-full gap-x-6 gap-y-2 px-4 py-4 text-left transition hover:bg-ink-700/40 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <span>
                  <span className="block font-medium text-white">{c.fullName}{!c.active && <span className="ml-2 text-xs text-red-300">faol emas</span>}</span>
                  <span className="block text-sm text-slate-400">@{c.username}{c.phone ? ` · ${c.phone}` : ''}</span>
                  <span className="block text-[13px] text-slate-400">Oxirgi faollik: {ago(c.lastActiveAt)}</span>
                </span>
                <span><span className="block text-[13px] text-slate-400">Guruhlar / talabalar</span><span className="text-slate-100">{c.totals.groups} / {c.totals.students}</span></span>
                <span><span className="mb-1 block text-[13px] text-slate-400">Forma to‘ldirgan</span><Bar value={c.totals.submitted} total={c.totals.students} /></span>
                <span><span className="mb-1 block text-[13px] text-slate-400">Rasmlari to‘liq (4/4)</span><Bar value={c.totals.photosComplete} total={c.totals.submitted} tone="bg-emerald-400" /></span>
              </button>
              {open[c._id] && (
                <div className="bg-ink-900 px-4 py-3">
                  {c.groupList.length ? (
                    <ul className="space-y-2">
                      {c.groupList.map((g) => (
                        <li key={g._id} className="grid items-center gap-x-6 gap-y-1 text-[15px] lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                          <span className="font-medium text-blue-200">{g.index}</span>
                          <span className="text-slate-300">{g.students} talaba</span>
                          <Bar value={g.submitted} total={g.students} />
                          <Bar value={g.photosComplete} total={g.submitted} tone="bg-emerald-400" />
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-amber-300">Guruh biriktirilmagan</p>}
                </div>
              )}
            </div>
          ))}
          {data && !data.curators.length && <p className="px-4 py-10 text-center text-slate-400">Hali kurator yo‘q. Kuratorlar bo‘limida yarating.</p>}
        </Card>
      </section>

      {data?.unassigned.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl font-semibold text-white">Biriktirilmagan guruhlar</h2>
          <Card className="divide-y divide-ink-700/60 !p-0">
            {data.unassigned.map((g) => (
              <div key={g._id} className="grid items-center gap-x-6 gap-y-1 px-4 py-3 text-[15px] lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <span className="font-medium text-blue-200">{g.index}</span>
                <span className="text-slate-300">{g.students} talaba</span>
                <Bar value={g.submitted} total={g.students} />
                <Bar value={g.photosComplete} total={g.submitted} tone="bg-emerald-400" />
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold text-white">Faoliyat jurnali</h2>
          <div className="w-60">
            <Field label="Kurator">
              <Select value={who} onChange={(e) => setWho(e.target.value)}>
                <option value="">Hammasi</option>
                {(data?.curators || []).map((c) => <option key={c._id} value={c._id}>{c.fullName}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <Card className="divide-y divide-ink-700/60 !p-0">
          {log.map((l) => (
            <div key={l._id} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-2.5 text-[15px]">
              <span className="w-36 shrink-0 text-[13px] text-slate-400">{new Date(l.at).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })}</span>
              <span className="w-40 shrink-0 font-medium text-white">{l.fullName || l.username}</span>
              <span className="min-w-0 flex-1 text-slate-200"><b className="font-medium text-blue-200">{ACTION[l.action] || l.action}</b>{l.summary ? ` · ${l.summary}` : ''}</span>
            </div>
          ))}
          {!log.length && <p className="px-4 py-10 text-center text-slate-400">Hozircha faoliyat yo‘q</p>}
        </Card>
      </section>
    </div>
  );
}
