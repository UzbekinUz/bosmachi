import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Field, Input, Modal, Select } from '../components/ui.jsx';

const editable = [
  ['phone', 'Telefon'], ['landlordName', 'Uy egasi'], ['landlordPhone', 'Uy egasi telefoni'],
  ['district', 'Tuman'], ['mahalla', 'Mahalla'], ['street', 'Ko‘cha'],
  ['house', 'Uy'], ['apartment', 'Xonadon'], ['location', 'Geolokatsiya'],
];

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
      return u;
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    if (!confirm('Ushbu yozuv o‘chirilsinmi?')) return;
    await api(`/admin/submissions/${id}`, { method: 'DELETE' });
    setRows((r) => r.filter((x) => x._id !== id));
  };
  const download = async () => {
    const blob = await api('/admin/export', { raw: true });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'bosmachi.xlsx' });
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44"><Field label="Guruh"><Select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barchasi</option>{groups.map((g) => <option key={g._id} value={g._id}>{g.index}</option>)}</Select></Field></div>
        <div className="min-w-48 flex-1"><Field label="Qidirish"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon, tuman…" /></Field></div>
        <Button onClick={download}>⬇ Excel yuklab olish</Button>
      </div>
      <p className="text-sm text-slate-400">Jami: <b className="text-white">{shown.length}</b> ta yozuv. Ma’lumotlar <code className="text-brand-400">server/data/submissions.xlsx</code> fayliga avtomatik yoziladi.</p>
      <Alert>{error}</Alert>

      {/* Telefon: kartochkalar */}
      <div className="space-y-3 md:hidden">
        {shown.map((r) => (
          <Card key={r._id} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div><div className="font-semibold text-white">{r.fullName}</div><div className="text-sm text-blue-300">{r.groupIndex}</div></div>
              <a href={`tel:${r.phone}`} className="text-sm text-brand-400">{r.phone}</a>
            </div>
            <div className="text-sm text-slate-300">{[r.district, r.mahalla, r.street].filter(Boolean).join(', ') || '—'}</div>
            <Select value={r.rentStatus || ''} onChange={(e) => patch(r._id, { rentStatus: e.target.value })}>
              <option value="">Ijara holati: belgilanmagan</option>
              {statuses.map((s) => <option key={s._id}>{s.value}</option>)}
            </Select>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setEdit(r)}>Ko‘rish</Button>
              <Button variant="danger" className="flex-1" onClick={() => remove(r._id)}>O‘chirish</Button>
            </div>
          </Card>
        ))}
        {!shown.length && <Card className="py-10 text-center text-slate-500">Ma’lumot yo‘q</Card>}
      </div>

      {/* Kompyuter: jadval */}
      <Card className="hidden overflow-x-auto !p-0 md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-ink-700 text-xs uppercase tracking-wide text-slate-400">
            <tr>{['Guruh', 'To‘liq ismi', 'Telefon', 'Tuman / Mahalla', 'Ijara holati', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r._id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-700/20">
                <td className="px-4 py-3 text-blue-200">{r.groupIndex}</td>
                <td className="px-4 py-3 font-medium text-white">{r.fullName}</td>
                <td className="px-4 py-3">{r.phone}</td>
                <td className="px-4 py-3 text-slate-300">{[r.district, r.mahalla].filter(Boolean).join(' / ') || '—'}</td>
                <td className="px-4 py-3">
                  <Select value={r.rentStatus || ''} onChange={(e) => patch(r._id, { rentStatus: e.target.value })} className="!py-1.5">
                    <option value="">Belgilanmagan</option>
                    {statuses.map((s) => <option key={s._id}>{s.value}</option>)}
                  </Select>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button onClick={() => setEdit(r)} className="mr-3 text-brand-400 hover:underline">Ko‘rish</button>
                  <button onClick={() => remove(r._id)} className="text-red-300 hover:underline">O‘chirish</button>
                </td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Ma’lumot yo‘q</td></tr>}
          </tbody>
        </table>
      </Card>
      {edit && <Detail row={edit} onClose={() => setEdit(null)} onSave={async (body) => { await patch(edit._id, body); setEdit(null); }} />}
    </div>
  );
}

function Detail({ row, onClose, onSave }) {
  const [f, setF] = useState(Object.fromEntries(editable.map(([k]) => [k, row[k] || ''])));
  return (
    <Modal title={`${row.fullName} · ${row.groupIndex}`} onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-400">{row.faculty} · {row.direction} · {row.course} · Tyutor: {row.tutor || '—'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {editable.map(([k, label]) => <Field key={k} label={label}><Input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
      </div>
      {!!row.cohabitants?.length && (
        <div className="mt-4">
          <h4 className="mb-2 text-sm font-medium text-blue-100">Birga yashovchilar</h4>
          <ul className="space-y-1 text-sm text-slate-300">
            {row.cohabitants.map((c, i) => <li key={i} className="rounded-lg bg-ink-800 px-3 py-2">{[c.info, c.fullName, c.phone].filter(Boolean).join(' · ')}</li>)}
          </ul>
        </div>
      )}
      {row.location && <a href={row.location} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm text-brand-400 hover:underline">Xaritada ochish ↗</a>}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Yopish</Button>
        <Button onClick={() => onSave(f)}>Saqlash</Button>
      </div>
    </Modal>
  );
}
