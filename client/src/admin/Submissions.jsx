import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Alert, Avatar, Button, Field, Input, Modal, PageHead, Select } from '../components/ui.jsx';

const editable = [
  ['phone', 'Telefon'], ['landlordName', 'Uy egasi'], ['landlordPhone', 'Uy egasi telefoni'],
  ['district', 'Tuman'], ['mahalla', 'Mahalla'], ['street', 'Ko‘cha'],
  ['house', 'Uy'], ['apartment', 'Xonadon'], ['location', 'Geolokatsiya'],
];

// Ijara holati tusi: Yashil, Sariq, Qizil — o'z rangining to'q tusi
const TONE = { yashil: 'pill-positive', sariq: 'pill-warning', qizil: 'pill-negative' };
function StatusSelect({ value, options, onChange }) {
  return (
    <span className="relative inline-block">
      <select
        value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label="Ijara holati"
        className={`pill ${TONE[String(value || '').toLowerCase()] || 'pill-neutral'} h-8 cursor-pointer appearance-none pr-7 sm:h-7`}
      >
        <option value="">Belgilanmagan</option>
        {options.map((s) => <option key={s._id}>{s.value}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  );
}

const COLS = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1.5fr)_10.5rem_4.5rem] md:gap-x-4';

export default function Submissions() {
  const [rows, setRows] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [group, setGroup] = useState('');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [error, setError] = useState('');

  const load = () => api(`/admin/submissions${group ? `?group=${group}` : ''}`).then(setRows).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [group]); // eslint-disable-line
  useEffect(() => {
    api('/admin/groups').then(setGroups).catch(() => {});
    api('/admin/options').then((o) => setStatuses(o.filter((x) => x.type === 'rentStatus'))).catch(() => {});
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => `${r.fullName} ${r.phone} ${r.district} ${r.mahalla}`.toLowerCase().includes(s)) : rows;
  }, [rows, q]);

  const patch = async (id, body) => {
    try {
      const u = await api(`/admin/submissions/${id}`, { method: 'PATCH', body });
      setRows((r) => r.map((x) => (x._id === id ? u : x)));
      setError('');
      return u;
    } catch (e) { setError(e.message); return null; }
  };
  const remove = async (r) => {
    if (!confirm(`${r.fullName} yozuvi o‘chirilsinmi? Talaba formani qayta to‘ldira oladi.`)) return;
    try {
      await api(`/admin/submissions/${r._id}`, { method: 'DELETE' });
      setRows((x) => x.filter((y) => y._id !== r._id));
      setEdit(null);
    } catch (e) { setError(e.message); }
  };
  const download = async () => {
    const blob = await api('/admin/export', { raw: true });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bosmachi.xlsx' });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const unmarked = rows.filter((r) => !r.rentStatus).length;
  return (
    <div>
      <PageHead
        title="Ma’lumotlar"
        finding={rows.length ? (unmarked ? `${unmarked} ta talabaning ijara holati hali belgilanmagan.` : 'Hamma talabaning ijara holati belgilangan.') : undefined}
        actions={<Button variant="ghost" onClick={download}>Excel yuklab olish</Button>}
        steps={[
          'Talabalar formada kiritgan ma’lumotlar shu yerda ko‘rinadi. Guruh bo‘yicha saralash va ism, telefon yoki tuman bo‘yicha qidirish mumkin.',
          'Har bir talabaning ijara holatini (Yashil, Sariq, Qizil) qator ichidagi tugmadan o‘zingiz belgilaysiz. Talaba buni ko‘rmaydi.',
          '"Ko‘rish" to‘liq ma’lumotni ochadi: uni tahrirlash yoki xatoni to‘g‘rilash mumkin. O‘sha oynadagi "Yozuvni o‘chirish" talabaga formani qayta to‘ldirish imkonini beradi.',
          '"Excel yuklab olish" har bir guruh uchun alohida listli tayyor jadval beradi.',
        ]}
      >
        Talabalarning ijara va yashash joyi haqida yuborgan ma’lumotlari.
      </PageHead>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44"><Field label="Guruh"><Select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barchasi</option>{groups.map((g) => <option key={g._id} value={g._id}>{g.index}</option>)}</Select></Field></div>
        <div className="min-w-48 max-w-sm flex-1"><Field label="Qidirish"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon, tuman…" /></Field></div>
        <p className="ml-auto pb-2.5 text-sm text-slate-300">{shown.length} ta yozuv</p>
      </div>
      <Alert>{error}</Alert>

      <div role="table" aria-label="Talabalar ma’lumotlari">
        <div role="row" className={`${COLS} !hidden border-b border-[var(--rule)] pb-2 text-xs text-slate-400 md:!grid`}>
          <span role="columnheader">Talaba</span><span role="columnheader" className="text-right">Telefon</span><span role="columnheader">Manzil</span><span role="columnheader">Ijara holati</span><span />
        </div>
        {shown.map((r) => (
          <div key={r._id} role="row" className={`${COLS} border-b border-[var(--rule)] py-3 md:min-h-14`}>
            <div role="cell" className="flex min-w-0 items-center gap-3">
              <Avatar name={r.fullName} />
              <button type="button" onClick={() => setEdit(r)} className="min-w-0 text-left"><span className="block font-medium text-white md:truncate">{r.fullName}</span><span className="block text-[13px] text-slate-400">{r.groupIndex}</span></button>
            </div>
            <a role="cell" href={`tel:${r.phone}`} className="whitespace-nowrap text-right text-sm tabular-nums text-slate-200 hover:text-white">{r.phone || '—'}</a>
            <div role="cell" className="min-w-0 truncate text-sm text-slate-300 md:col-auto">{[r.district, r.mahalla].filter(Boolean).join(', ') || '—'}</div>
            <div role="cell"><StatusSelect value={r.rentStatus} options={statuses} onChange={(v) => patch(r._id, { rentStatus: v })} /></div>
            <div role="cell" className="hidden md:col-span-1 md:block md:text-right"><button onClick={() => setEdit(r)} className="min-h-9 text-sm text-slate-200 underline-offset-4 hover:text-white hover:underline">Ko‘rish</button></div>
          </div>
        ))}
        {!shown.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Hali ma’lumot yo‘q. Talabalar formani to‘ldirgach, shu yerda ko‘rinadi.</p>}
      </div>
      {edit && <Detail row={edit} onClose={() => setEdit(null)} onDelete={() => remove(edit)} onSave={async (body) => { if (await patch(edit._id, body)) setEdit(null); }} />}
    </div>
  );
}

function Detail({ row, onClose, onSave, onDelete }) {
  const [f, setF] = useState(Object.fromEntries(editable.map(([k]) => [k, row[k] || ''])));
  return (
    <Modal title="Talaba ma’lumoti" onClose={onClose} wide>
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={row.fullName} size={44} />
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-white">{row.fullName}</div>
          <div className="text-sm text-slate-300">{row.groupIndex} · {row.faculty} · {row.course} · Tyutor: {row.tutor || '—'}</div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {editable.map(([k, label]) => <Field key={k} label={label}><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
      </div>
      {!!row.cohabitants?.length && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-medium text-white">Birga yashovchilar</h4>
          <ul className="space-y-2 text-sm text-slate-200">
            {row.cohabitants.map((c, i) => <li key={i} className="rounded-[10px] bg-ink-700 px-3 py-2">{[c.info, c.fullName, c.phone].filter(Boolean).join(' · ')}</li>)}
          </ul>
        </div>
      )}
      {row.location && <a href={row.location} target="_blank" rel="noreferrer" className="mt-5 inline-block text-sm text-white underline underline-offset-4">Xaritada ochish</a>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button variant="danger" onClick={onDelete}>Yozuvni o‘chirish</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Yopish</Button>
          <Button onClick={() => onSave(f)}>Saqlash</Button>
        </div>
      </div>
    </Modal>
  );
}
