import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Field, Input, Modal, PageHead } from '../components/ui.jsx';

const blank = { index: '', faculty: '', direction: '', course: '', tutor: '', tutorPhone: '' };

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(null); // {_id?, ...}
  const [studentsOf, setStudentsOf] = useState(null);
  const [error, setError] = useState('');

  const load = () => api('/admin/groups').then(setGroups).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api(form._id ? `/admin/groups/${form._id}` : '/admin/groups', { method: form._id ? 'PUT' : 'POST', body: form });
      setForm(null); setError(''); load();
    } catch (err) { setError(err.message); }
  };
  const remove = async (g) => {
    if (!confirm(`${g.index} guruhi, uning talabalari va yuborilgan ma’lumotlari o‘chiriladi. Davom etasizmi?`)) return;
    await api(`/admin/groups/${g._id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="space-y-4">
      <PageHead
        title="Guruhlar"
        steps={[
          '"Yangi guruh": indeks (masalan I-87/25i), fakultet, yo‘nalish, kurs va guruh tyutorining ismi hamda telefonini kiriting. Talaba formada guruhni shu indeks bilan tanlaydi.',
          '"Talabalar" tugmasi guruh ro‘yxatini ochadi. Ismlarni Excel’dan nusxalab, har qatorga bittadan qo‘yish mumkin, ular avtomatik to‘g‘ri yoziladi.',
          '"To‘ldirgan" ustuni nechta talaba formani to‘ldirganini ko‘rsatadi.',
          'Guruhni o‘chirsangiz, uning talabalari, yozuvlari va rasmlari ham o‘chadi.',
        ]}
      >
        Talabalar guruhlari, ularning tyutorlari va talabalar ro‘yxati.
      </PageHead>
      <div className="flex justify-end">
        <Button onClick={() => setForm({ ...blank })}>+ Yangi guruh</Button>
      </div>
      <Alert>{error}</Alert>
      <Card className="overflow-x-auto !p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-ink-700 text-sm font-semibold text-slate-100">
            <tr>{['Guruh', 'Fakultet', 'Yo‘nalish', 'Kurs', 'Tyutor', 'Talabalar', 'To‘ldirgan', ''].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g._id} className="border-b border-ink-700/60 last:border-0 hover:bg-ink-700/20">
                <td className="px-4 py-3 font-semibold text-white">{g.index}</td>
                <td className="px-4 py-3">{g.faculty}</td><td className="px-4 py-3">{g.direction}</td>
                <td className="px-4 py-3">{g.course}</td><td className="px-4 py-3">{g.tutor || '—'}</td>
                <td className="px-4 py-3">{g.students}</td>
                <td className="px-4 py-3"><span className={g.submissions < g.students ? 'text-amber-300' : 'text-emerald-300'}>{g.submissions}/{g.students}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button onClick={() => setStudentsOf(g)} className="mr-3 text-brand-400 hover:underline">Talabalar</button>
                  <button onClick={() => setForm(g)} className="mr-3 text-brand-400 hover:underline">Tahrirlash</button>
                  <button onClick={() => remove(g)} className="text-red-300 hover:underline">O‘chirish</button>
                </td>
              </tr>
            ))}
            {!groups.length && <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">Hali guruh yo‘q</td></tr>}
          </tbody>
        </table>
      </Card>

      {form && (
        <Modal title={form._id ? 'Guruhni tahrirlash' : 'Yangi guruh'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Guruh indeksi" required><Input value={form.index} onChange={(e) => setForm({ ...form, index: e.target.value })} placeholder="I-87/25i" required /></Field>
            <Field label="Fakultet" required><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="Iqtisodiyot" required /></Field>
            <Field label="Yo‘nalish" required><Input value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} placeholder="Iqtisodiyot" required /></Field>
            <Field label="Kurs" required><Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="2-kurs" required /></Field>
            <Field label="Guruh tyutori"><Input value={form.tutor} onChange={(e) => setForm({ ...form, tutor: e.target.value })} /></Field>
            <Field label="Tyutor telefon raqami"><Input value={form.tutorPhone || ''} onChange={(e) => setForm({ ...form, tutorPhone: e.target.value })} placeholder="90 123 45 67" /></Field>
            <Alert>{error}</Alert>
            <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="ghost" onClick={() => setForm(null)}>Bekor qilish</Button><Button type="submit">Saqlash</Button></div>
          </form>
        </Modal>
      )}
      {studentsOf && <Students group={studentsOf} onClose={() => { setStudentsOf(null); load(); }} />}
    </div>
  );
}

function Students({ group, onClose }) {
  const [list, setList] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const load = () => api(`/admin/groups/${group._id}/students`).then(setList).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async () => {
    if (!text.trim()) return;
    await api(`/admin/groups/${group._id}/students`, { method: 'POST', body: { names: text } });
    setText(''); load();
  };
  const rename = async (s) => {
    const fullName = prompt('To‘liq ismi', s.fullName);
    if (fullName?.trim()) { await api(`/admin/students/${s._id}`, { method: 'PUT', body: { fullName } }); load(); }
  };
  const remove = async (s) => {
    if (confirm(`${s.fullName} o‘chirilsinmi?`)) { await api(`/admin/students/${s._id}`, { method: 'DELETE' }); load(); }
  };

  return (
    <Modal title={`${group.index} · talabalar`} onClose={onClose} wide>
      <Alert>{error}</Alert>
      <Field label="Talabalar qo‘shish" hint="Har bir qatorga bitta to‘liq ism (Excel'dan nusxalab qo‘yish mumkin)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full rounded-xl border border-ink-600/70 bg-ink-900/80 px-3.5 py-2.5 text-sm outline-none focus:border-brand-500" />
      </Field>
      <Button className="mt-2" onClick={add}>Qo‘shish</Button>
      <ul className="mt-5 divide-y divide-ink-700/60 rounded-xl border border-ink-700">
        {list.map((s, i) => (
          <li key={s._id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span><span className="mr-2 text-slate-500">{i + 1}.</span>{s.fullName}</span>
            <span><button onClick={() => rename(s)} className="mr-3 text-brand-400 hover:underline">Tahrirlash</button><button onClick={() => remove(s)} className="text-red-300 hover:underline">O‘chirish</button></span>
          </li>
        ))}
        {!list.length && <li className="px-3 py-6 text-center text-sm text-slate-500">Talabalar yo‘q</li>}
      </ul>
    </Modal>
  );
}
