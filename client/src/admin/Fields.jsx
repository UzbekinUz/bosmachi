import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Input, PageHead, Tabs, Toggle } from '../components/ui.jsx';

export const SOZLAMALAR_TABS = [
  { to: '/admin/fields', label: 'Forma maydonlari' },
  { to: '/admin/options', label: 'Variantlar' },
];

export default function Fields() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState({ type: 'ok', text: '' });
  const [dirty, setDirty] = useState(false);

  useEffect(() => { api('/admin/fields').then(setList).catch((e) => setMsg({ type: 'error', text: e.message })); }, []);

  const upd = (i, patch) => { setDirty(true); setList((l) => l.map((f, j) => (j === i ? { ...f, ...patch } : f))); };
  const move = (i, d) => { setDirty(true); setList((l) => {
    const n = [...l]; const j = i + d;
    if (j < 0 || j >= n.length) return l;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  }); };
  const save = async () => {
    try {
      setList(await api('/admin/fields', { method: 'PUT', body: list }));
      setMsg({ type: 'ok', text: 'Saqlandi' });
      setDirty(false);
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };

  return (
    <div>
      <PageHead
        title="Sozlamalar"
        actions={<Button onClick={save} disabled={!dirty}>Saqlash</Button>}
        steps={[
          '"Ko‘rsatish" o‘chirilsa, maydon formada chiqmaydi va talabadan so‘ralmaydi.',
          '"Majburiy" yoqilgan bo‘lsa, talaba bu maydonni to‘ldirmasdan yubora olmaydi.',
          'Maydon nomini o‘zgartirsangiz, u formada va Excel jadvalida yangi nom bilan chiqadi. Strelkalar tartibni o‘zgartiradi.',
          'O‘zgarishlar "Saqlash"ni bosgandan keyin kuchga kiradi.',
        ]}
      >
        Formada qaysi ma’lumotlar yig‘ilishini, ularning nomi va majburiyligini belgilang. Guruh va to‘liq ism doim so‘raladi, ijara holatini esa admin o‘zi belgilaydi.
      </PageHead>
      <Tabs items={SOZLAMALAR_TABS} />
      <Alert type={msg.type === 'error' ? 'error' : 'ok'}>{msg.text}</Alert>

      <div role="table" aria-label="Forma maydonlari" className="mt-2">
        <div role="row" className="hidden grid-cols-[3rem_minmax(0,1fr)_7rem_7rem] items-center gap-4 border-b border-[var(--rule)] pb-2 text-xs text-slate-400 sm:grid">
          <span /><span>Maydon nomi</span><span>Ko‘rsatish</span><span>Majburiy</span>
        </div>
        {list.map((f, i) => (
          <div key={f.key} role="row" className={`grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-x-4 gap-y-3 border-b border-[var(--rule)] py-3 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_7rem] ${f.enabled ? '' : 'opacity-60'}`}>
            <div className="flex flex-col items-center">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="grid h-7 w-9 place-items-center text-slate-300 hover:text-white disabled:opacity-30" aria-label="Yuqoriga">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5-5 5 5" /></svg>
              </button>
              <button onClick={() => move(i, 1)} disabled={i === list.length - 1} className="grid h-7 w-9 place-items-center text-slate-300 hover:text-white disabled:opacity-30" aria-label="Pastga">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 5 5 5-5" /></svg>
              </button>
            </div>
            <Input value={f.label} onChange={(e) => upd(i, { label: e.target.value })} aria-label="Maydon nomi" />
            <label className="col-span-1 col-start-2 flex items-center gap-3 text-sm text-slate-200 sm:col-start-auto"><Toggle checked={f.enabled} onChange={(v) => upd(i, { enabled: v })} label="Ko‘rsatish" /><span className="sm:hidden">Ko‘rsatish</span></label>
            <label className="col-span-1 col-start-2 flex items-center gap-3 text-sm text-slate-200 sm:col-start-auto"><Toggle checked={f.required} disabled={!f.enabled} onChange={(v) => upd(i, { required: v })} label="Majburiy" /><span className="sm:hidden">Majburiy</span></label>
          </div>
        ))}
      </div>
    </div>
  );
}
