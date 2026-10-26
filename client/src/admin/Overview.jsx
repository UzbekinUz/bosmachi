import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Avatar, Button, Field, Kpis, Meter, PageHead, Pill, Select, Tabs } from '../components/ui.jsx';

export const BOSHQARUV_TABS = [
  { to: '/admin/overview', label: 'Holat' },
  { to: '/admin/users', label: 'Kuratorlar' },
];

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
const GRID = 'lg:grid lg:grid-cols-[minmax(0,2fr)_5rem_minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-5';

export default function Overview() {
  const [data, setData] = useState(null);
  const [log, setLog] = useState([]);
  const [who, setWho] = useState('');
  const [open, setOpen] = useState({});
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');

  const loadOverview = () => api('/admin/overview').then(setData).catch((e) => setError(e.message));
  const loadLog = () => api(`/admin/activity${who ? `?user=${who}` : ''}`).then(setLog).catch((e) => setError(e.message));
  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { loadLog(); }, [who]); // eslint-disable-line

  const refresh = () => { loadOverview(); loadLog(); };
  const curators = data?.curators || [];
  const idle = curators.filter((c) => c.active && daysIdle(c.lastActiveAt) >= 7);
  const total = curators.reduce((a, c) => ({
    groups: a.groups + c.totals.groups, students: a.students + c.totals.students, submitted: a.submitted + c.totals.submitted,
  }), { groups: 0, students: 0, submitted: 0 });
  const slowest = [...curators].filter((c) => c.totals.students).sort((a, b) => pct(a.totals.submitted, a.totals.students) - pct(b.totals.submitted, b.totals.students))[0];

  let finding;
  if (idle.length) finding = `${idle.map((c) => c.fullName).join(', ')} 7 kundan beri tizimda faol bo‘lmagan.`;
  else if (slowest && pct(slowest.totals.submitted, slowest.totals.students) < 100) finding = `${slowest.fullName} guruhlarida forma to‘ldirish eng orqada: ${pct(slowest.totals.submitted, slowest.totals.students)}%.`;

  return (
    <div>
      <PageHead
        title="Boshqaruv"
        finding={finding}
        actions={<Button variant="ghost" onClick={refresh}>Yangilash</Button>}
        steps={[
          'Har bir kurator uchun guruhlar soni, talabalar, formani to‘ldirganlar va 4 ta rasmi to‘liq talabalar ulushi ko‘rinadi.',
          'Kurator qatoriga bossangiz, uning har bir guruhi bo‘yicha batafsil holat ochiladi: qaysi guruhda ish orqada ekanini darhol ko‘rasiz.',
          '"Biriktirilmagan guruhlar" hech bir kuratorga berilmagan guruhlarni ko‘rsatadi. Ularni Kuratorlar bo‘limida biriktiring.',
          'Faoliyat jurnali: kim, qachon, nima qilgani (kirish, rasm yuklash, ma’lumotni o‘zgartirish, hisobot olish). Kurator bo‘yicha saralash mumkin.',
        ]}
      >
        Kuratorlar ishini va ularning guruhlarini bir joydan kuzating.
      </PageHead>
      <Tabs items={BOSHQARUV_TABS} />
      <Alert>{error}</Alert>

      <div className="grid gap-x-6 gap-y-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Kpis items={[
            { label: 'Kuratorlar', value: curators.length, caption: `${curators.filter((c) => c.active).length} tasi faol` },
            { label: 'Guruhlar', value: total.groups, caption: data?.unassigned.length ? `${data.unassigned.length} tasi biriktirilmagan` : 'hammasi biriktirilgan' },
            { label: 'Talabalar', value: total.students, caption: 'kuratorlar guruhlarida' },
            { label: 'Forma to‘ldirgan', value: `${pct(total.submitted, total.students)}%`, caption: `${total.submitted} / ${total.students} talaba` },
          ]} />

          <h2 className="mb-1 mt-10 text-base font-semibold text-fg">Kuratorlar</h2>
          <p className="mb-3 text-sm text-slate-300">Guruhlar bo‘yicha forma va rasm holati.</p>
          <div role="table" aria-label="Kuratorlar">
            <div role="row" className={`${GRID} hidden border-b border-[var(--rule)] pb-2 text-xs text-slate-400 lg:grid`}>
              <span>Kurator</span><span className="text-right">Guruh</span><span>Forma to‘ldirgan</span><span>Rasmlari to‘liq</span>
            </div>
            {curators.map((c) => (
              <div key={c._id} className={`border-b border-[var(--rule)] ${c.active ? '' : 'opacity-60'}`}>
                <button type="button" onClick={() => setOpen({ ...open, [c._id]: !open[c._id] })} aria-expanded={!!open[c._id]} className={`${GRID} flex w-full flex-col items-stretch gap-2 py-3 text-left transition hover:bg-ink-800 lg:min-h-[72px]`}>
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={c.fullName} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{c.fullName}{!c.active && <Pill tone="negative" className="ml-2 align-middle">faol emas</Pill>}</span>
                      <span className="block text-[13px] text-slate-300 lg:truncate">@{c.username}{c.phone ? ` · ${c.phone}` : ''}</span>
                      <span className="block text-[13px] text-slate-400">Oxirgi faollik: {ago(c.lastActiveAt)}</span>
                    </span>
                  </span>
                  <span className="text-sm tabular-nums text-slate-200 lg:text-right">{c.totals.groups} ta guruh</span>
                  <Meter value={c.totals.submitted} total={c.totals.students} />
                  <Meter value={c.totals.photosComplete} total={c.totals.submitted} />
                </button>
                {open[c._id] && (
                  <div className="mb-3 rounded-[14px] bg-ink-800 px-4 py-2">
                    {c.groupList.length ? c.groupList.map((g) => (
                      <div key={g._id} className={`${GRID} flex flex-col gap-1.5 border-b border-[var(--rule)] py-2.5 text-sm last:border-0`}>
                        <span className="font-medium text-fg">{g.index}</span>
                        <span className="tabular-nums text-slate-200 lg:text-right">{g.students} talaba</span>
                        <Meter value={g.submitted} total={g.students} />
                        <Meter value={g.photosComplete} total={g.submitted} />
                      </div>
                    )) : <p className="py-2 text-sm text-warning">Guruh biriktirilmagan</p>}
                  </div>
                )}
              </div>
            ))}
            {data && !curators.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Hali kurator yo‘q. “Kuratorlar” tabida yarating.</p>}
          </div>

          {data?.unassigned.length > 0 && (
            <>
              <h2 className="mb-1 mt-10 text-base font-semibold text-fg">Biriktirilmagan guruhlar</h2>
              <p className="mb-3 text-sm text-slate-300">Hech bir kuratorga berilmagan, ularni siz boshqarasiz.</p>
              {data.unassigned.map((g) => (
                <div key={g._id} className={`${GRID} flex flex-col gap-1.5 border-b border-[var(--rule)] py-3`}>
                  <span className="font-medium text-fg">{g.index}</span>
                  <span className="text-sm tabular-nums text-slate-200 lg:text-right">{g.students} talaba</span>
                  <Meter value={g.submitted} total={g.students} />
                  <Meter value={g.photosComplete} total={g.submitted} />
                </div>
              ))}
            </>
          )}
        </div>

        <aside className="min-w-0">
          <h2 className="mb-3 text-base font-semibold text-fg">Faoliyat jurnali</h2>
          <Field label="Kurator">
            <Select value={who} onChange={(e) => setWho(e.target.value)}>
              <option value="">Hammasi</option>
              {curators.map((c) => <option key={c._id} value={c._id}>{c.fullName}</option>)}
            </Select>
          </Field>
          <ul className="mt-3">
            {(more ? log : log.slice(0, 8)).map((l) => (
              <li key={l._id} className="border-b border-[var(--rule)] py-2.5 text-sm">
                <div className="flex items-baseline justify-between gap-3"><span className="font-medium text-fg">{l.fullName || l.username}</span><span className="shrink-0 text-xs text-slate-400">{ago(l.at)}</span></div>
                <div className="text-slate-300">{ACTION[l.action] || l.action}{l.summary && l.action !== 'login' ? ` · ${l.summary}` : ''}</div>
              </li>
            ))}
            {!log.length && <li className="rounded-[14px] border border-dashed border-ink-600 px-3 py-6 text-center text-sm text-slate-400">Hozircha faoliyat yo‘q</li>}
          </ul>
          {log.length > 8 && <Button variant="ghost" className="mt-3 w-full" onClick={() => setMore(!more)}>{more ? 'Kamroq ko‘rsatish' : `Hammasini ko‘rish (${log.length})`}</Button>}
        </aside>
      </div>
    </div>
  );
}
