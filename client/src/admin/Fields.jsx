import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Input, PageHead } from '../components/ui.jsx';

export default function Fields() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState({ type: 'ok', text: '' });

  useEffect(() => { api('/admin/fields').then(setList).catch((e) => setMsg({ type: 'error', text: e.message })); }, []);

  const upd = (i, patch) => setList((l) => l.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const move = (i, d) => setList((l) => {
    const n = [...l]; const j = i + d;
    if (j < 0 || j >= n.length) return l;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });
  const save = async () => {
    try {
      setList(await api('/admin/fields', { method: 'PUT', body: list }));
      setMsg({ type: 'ok', text: 'Saqlandi' });
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };

  return (
    <div className="space-y-4">
      <PageHead
        title="Forma maydonlari"
        steps={[
          '"Ko‘rsatish" belgisi o‘chirilsa, maydon formada chiqmaydi va talabadan so‘ralmaydi.',
          '"Majburiy" belgisi bo‘lsa, talaba bu maydonni to‘ldirmasdan yubora olmaydi.',
          'Maydon nomini o‘zgartirsangiz, u formada va Excel jadvalida yangi nom bilan chiqadi. ▲ ▼ tugmalari tartibni o‘zgartiradi.',
          'O‘zgarishlar "Saqlash"ni bosgandan keyin kuchga kiradi.',
        ]}
      >
        Formada qaysi ma’lumotlar yig‘ilishini, ularning nomi va majburiyligini belgilang. Guruh va to‘liq ism doim so‘raladi, ijara holatini esa admin o‘zi belgilaydi.
      </PageHead>
      <Card className="divide-y divide-ink-700/60 !p-0">
        {list.map((f, i) => (
          <div key={f.key} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${f.enabled ? '' : 'opacity-60'}`}>
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} className="text-xs text-slate-400 hover:text-white" aria-label="Yuqoriga">▲</button>
              <button onClick={() => move(i, 1)} className="text-xs text-slate-400 hover:text-white" aria-label="Pastga">▼</button>
            </div>
            <div className="min-w-56 flex-1"><Input value={f.label} onChange={(e) => upd(i, { label: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} className="h-4 w-4 accent-blue-500" />Ko‘rsatish</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.required} disabled={!f.enabled} onChange={(e) => upd(i, { required: e.target.checked })} className="h-4 w-4 accent-blue-500" />Majburiy</label>
          </div>
        ))}
      </Card>
      <Alert type={msg.type}>{msg.text}</Alert>
      <Button onClick={save}>Saqlash</Button>
    </div>
  );
}
