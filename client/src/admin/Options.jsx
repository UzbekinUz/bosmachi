import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Input, PageHead, Tabs } from '../components/ui.jsx';
import { SOZLAMALAR_TABS } from './Fields.jsx';

const PARENT = 'Toshkent shahar';

// Sozlamalar: chapda sarlavha va tavsif, o'ngda panel (settings-two-column namunasi)
function Section({ title, hint, type, items, reload }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    try {
      await api('/admin/options', { method: 'POST', body: { type, value, parent: type === 'district' ? PARENT : '' } });
      setValue(''); setError(''); reload();
    } catch (err) { setError(err.message); }
  };
  const rename = async (o) => {
    const v = prompt('Yangi nomi', o.value);
    if (v?.trim()) { await api(`/admin/options/${o._id}`, { method: 'PUT', body: { value: v, parent: o.parent } }); reload(); }
  };
  const remove = async (o) => {
    if (!confirm(`"${o.value}" o‘chirilsinmi? Eski yozuvlardagi qiymat o‘zgarmaydi.`)) return;
    await api(`/admin/options/${o._id}`, { method: 'DELETE' });
    reload();
  };

  return (
    <section className="grid gap-4 border-b border-[var(--rule)] py-8 first:pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-12">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-slate-300">{hint}</p>
        <p className="mt-3 text-sm text-slate-400">Hozir: {items.length} ta variant</p>
      </div>
      <div className="rounded-[20px] bg-ink-800 p-4 sm:p-5">
        <form onSubmit={add} className="flex gap-2">
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Yangi variant…" aria-label="Yangi variant" />
          <Button type="submit">Qo‘shish</Button>
        </form>
        <Alert>{error}</Alert>
        <ul className="mt-3 max-h-80 overflow-y-auto">
          {items.map((o) => (
            <li key={o._id} className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--rule)] text-sm last:border-0">
              <span className="text-white">{o.value}</span>
              <span className="flex shrink-0 gap-4">
                <button onClick={() => rename(o)} className="min-h-9 text-slate-200 underline-offset-4 hover:text-white hover:underline">Tahrirlash</button>
                <button onClick={() => remove(o)} className="min-h-9 text-negative underline-offset-4 hover:underline">O‘chirish</button>
              </span>
            </li>
          ))}
          {!items.length && <li className="rounded-[14px] border border-dashed border-ink-600 px-3 py-6 text-center text-sm text-slate-400">Variantlar yo‘q</li>}
        </ul>
      </div>
    </section>
  );
}

export default function Options() {
  const [all, setAll] = useState([]);
  const load = () => api('/admin/options').then(setAll).catch(() => {});
  useEffect(() => { load(); }, []);
  const of = (t) => all.filter((o) => o.type === t);

  return (
    <div>
      <PageHead
        title="Sozlamalar"
        steps={[
          '"Ijara holati": Ma’lumotlar bo‘limida talabaga belgilanadigan variantlar. Word hisobotdagi jadval faqat Yashil, Sariq va Qizilni sanaydi.',
          '"Toshkent tumanlari": formada talaba tanlaydigan tumanlar. Qo‘shish, nomini tuzatish yoki o‘chirish mumkin.',
          'Nomini o‘zgartirsangiz, eski yozuvlardagi qiymat o‘zgarmaydi, faqat yangi tanlovlarga ta’sir qiladi.',
        ]}
      >
        Formadagi tanlov ro‘yxatlari: ijara holati va tumanlar.
      </PageHead>
      <Tabs items={SOZLAMALAR_TABS} />
      <Section title="Ijara holati" hint="Admin talabaga shu variantlardan birini belgilaydi. Talaba buni ko‘rmaydi." type="rentStatus" items={of('rentStatus')} reload={load} />
      <Section title="Toshkent tumanlari" hint="Formada talaba shu ro‘yxatdan tumanini tanlaydi." type="district" items={of('district')} reload={load} />
    </div>
  );
}
