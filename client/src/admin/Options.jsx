import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Input, Select } from '../components/ui.jsx';

function Section({ title, hint, type, items, regions, reload, withParent }) {
  const [value, setValue] = useState('');
  const [parent, setParent] = useState('Toshkent shahar');
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    try {
      await api('/admin/options', { method: 'POST', body: { type, value, parent: withParent ? parent : '' } });
      setValue(''); setError(''); reload();
    } catch (err) { setError(err.message); }
  };
  const rename = async (o) => {
    const v = prompt('Yangi nomi', o.value);
    if (v?.trim()) { await api(`/admin/options/${o._id}`, { method: 'PUT', body: { value: v, parent: o.parent } }); reload(); }
  };
  const remove = async (o) => { await api(`/admin/options/${o._id}`, { method: 'DELETE' }); reload(); };

  return (
    <Card className="space-y-3">
      <div><h3 className="font-semibold text-white">{title}</h3><p className="text-xs text-slate-400">{hint}</p></div>
      <form onSubmit={add} className="flex flex-wrap gap-2">
        {withParent && <div className="w-48"><Select value={parent} onChange={(e) => setParent(e.target.value)}>{regions.map((r) => <option key={r}>{r}</option>)}</Select></div>}
        <div className="min-w-40 flex-1"><Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Yangi variant…" /></div>
        <Button type="submit">Qo‘shish</Button>
      </form>
      <Alert>{error}</Alert>
      <ul className="max-h-72 divide-y divide-ink-700/60 overflow-y-auto rounded-xl border border-ink-700">
        {items.map((o) => (
          <li key={o._id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>{o.value}{withParent && <span className="ml-2 text-xs text-slate-500">{o.parent}</span>}</span>
            <span><button onClick={() => rename(o)} className="mr-3 text-brand-400 hover:underline">Tahrirlash</button><button onClick={() => remove(o)} className="text-red-300 hover:underline">O‘chirish</button></span>
          </li>
        ))}
        {!items.length && <li className="px-3 py-5 text-center text-sm text-slate-500">Bo‘sh</li>}
      </ul>
    </Card>
  );
}

export default function Options() {
  const [all, setAll] = useState([]);
  const load = () => api('/admin/options').then(setAll).catch(() => {});
  useEffect(() => { load(); }, []);
  const of = (t) => all.filter((o) => o.type === t);
  const regions = ['Toshkent shahar'];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Ijara holati variantlari" hint="Admin talabaga shu variantlardan birini belgilaydi." type="rentStatus" items={of('rentStatus')} reload={load} />
      <div className="lg:col-span-2">
        <Section title="Toshkent shahri tumanlari" hint="Formadagi tuman ro‘yxati." type="district" items={of('district')} regions={regions} reload={load} withParent />
      </div>
    </div>
  );
}
