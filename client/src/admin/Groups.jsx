import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, formatPhone } from '../api.js';
import { Alert, Avatar, Button, Field, Input, Kpis, Meter, Modal, PageHead } from '../components/ui.jsx';

const blank = { index: '', faculty: '', direction: '', course: '', tutor: '', tutorPhone: '' };
const COLS = 'lg:grid lg:grid-cols-[7rem_minmax(0,1.6fr)_5rem_minmax(0,1.3fr)_5rem_11rem_8.5rem] lg:items-center lg:gap-4';

export default function Groups() {
  const { me } = useOutletContext();
  const curator = me.role === 'curator';
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
    try { await api(`/admin/groups/${g._id}`, { method: 'DELETE' }); setError(''); setForm(null); load(); } catch (err) { setError(err.message); }
  };

  const totalStudents = groups.reduce((a, g) => a + g.students, 0);
  const totalSubmitted = groups.reduce((a, g) => a + g.submissions, 0);
  const behind = groups.filter((g) => g.students && g.submissions < g.students);
  const newGroup = () => { setError(''); setForm({ ...blank, ...(curator ? { tutor: me.fullName, tutorPhone: me.phone } : {}) }); };

  return (
    <div>
      <PageHead
        title="Guruhlar"
        finding={groups.length ? (behind.length ? `${behind.length} ta guruhda formani to‘ldirmagan talabalar bor.` : 'Hamma guruhda talabalar formani to‘ldirgan.') : undefined}
        actions={<Button onClick={newGroup}>Yangi guruh</Button>}
        steps={[
          '"Yangi guruh": indeks (masalan I-87/25i), fakultet, yo‘nalish, kurs va guruh tyutorining ismi hamda telefonini kiriting. Talaba formada guruhni shu indeks bilan tanlaydi.',
          '"Talabalar" tugmasi guruh ro‘yxatini ochadi. Ismlarni Excel’dan nusxalab, har qatorga bittadan qo‘yish mumkin, ular avtomatik to‘g‘ri yoziladi.',
          '"To‘ldirgan" chizig‘i nechta talaba formani to‘ldirganini ko‘rsatadi.',
          'Guruhni o‘chirsangiz, uning talabalari, yozuvlari va rasmlari ham o‘chadi. Yozuvli guruhni faqat egasi o‘chira oladi.',
        ]}
      >
        {curator ? 'O‘zingiz yaratgan guruhlar. Yangi guruh avtomatik sizga biriktiriladi.' : 'Talabalar guruhlari, ularning tyutorlari va talabalar ro‘yxati.'}
      </PageHead>
      <Alert>{form ? '' : error}</Alert>

      {groups.length > 0 && (
        <div className="mb-8">
          <Kpis items={[
            { label: 'Guruhlar', value: groups.length, caption: curator ? 'sizga biriktirilgan' : 'tizimda' },
            { label: 'Talabalar', value: totalStudents, caption: 'barcha guruhlarda' },
            { label: 'Forma to‘ldirgan', value: totalSubmitted, caption: `jamining ${totalStudents ? Math.round((totalSubmitted / totalStudents) * 100) : 0}%` },
          ]} />
        </div>
      )}

      <div role="table" aria-label="Guruhlar">
        <div role="row" className={`${COLS} hidden border-b border-[var(--rule)] pb-2 text-xs text-slate-400 lg:grid`}>
          <span>Guruh</span><span>Fakultet va yo‘nalish</span><span>Kurs</span><span>Tyutor</span><span className="text-right">Talaba</span><span>To‘ldirgan</span><span />
        </div>
        {groups.map((g) => (
          <div key={g._id} role="row" className={`${COLS} flex flex-col gap-1.5 border-b border-[var(--rule)] py-3 lg:min-h-14`}>
            <div role="cell" className="font-medium text-white">{g.index}</div>
            <div role="cell" className="min-w-0 text-sm text-slate-300 lg:truncate">{g.faculty}{g.direction && g.direction !== g.faculty ? ` · ${g.direction}` : ''}</div>
            <div role="cell" className="text-sm text-slate-300">{g.course}</div>
            <div role="cell" className="min-w-0 truncate text-sm text-slate-300">{g.tutor || '—'}</div>
            <div role="cell" className="text-sm tabular-nums text-slate-200 lg:text-right">{g.students} talaba</div>
            <div role="cell"><Meter value={g.submissions} total={g.students} /></div>
            <div role="cell" className="flex gap-4 lg:justify-end">
              <button onClick={() => setStudentsOf(g)} className="min-h-9 text-sm text-slate-200 underline-offset-4 hover:text-white hover:underline">Talabalar</button>
              <button onClick={() => { setError(''); setForm(g); }} className="min-h-9 text-sm text-slate-200 underline-offset-4 hover:text-white hover:underline">Tahrirlash</button>
            </div>
          </div>
        ))}
        {!groups.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Hali guruh yo‘q. “Yangi guruh” tugmasi bilan birinchisini yarating.</p>}
      </div>

      {form && (
        <Modal title={form._id ? 'Guruhni tahrirlash' : 'Yangi guruh'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Guruh indeksi" required><Input value={form.index} onChange={(e) => setForm({ ...form, index: e.target.value })} placeholder="I-87/25i" required /></Field>
            <Field label="Fakultet" required><Input value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })} placeholder="Iqtisodiyot" required /></Field>
            <Field label="Yo‘nalish" required><Input value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })} placeholder="Iqtisodiyot" required /></Field>
            <Field label="Kurs" required><Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="2-kurs" required /></Field>
            <Field label="Guruh tyutori"><Input value={form.tutor} onChange={(e) => setForm({ ...form, tutor: e.target.value })} /></Field>
            <Field label="Tyutor telefon raqami"><Input type="tel" inputMode="tel" value={form.tutorPhone || ''} onChange={(e) => setForm({ ...form, tutorPhone: formatPhone(e.target.value) })} placeholder="+998 90 123 45 67" /></Field>
            <Alert>{error}</Alert>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {form._id ? <Button type="button" variant="danger" onClick={() => remove(form)}>Guruhni o‘chirish</Button> : <span />}
              <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setForm(null)}>Bekor qilish</Button><Button type="submit">Saqlash</Button></div>
            </div>
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
    try { await api(`/admin/groups/${group._id}/students`, { method: 'POST', body: { names: text } }); setText(''); setError(''); load(); } catch (e) { setError(e.message); }
  };
  const rename = async (s) => {
    const fullName = prompt('To‘liq ismi', s.fullName);
    if (fullName?.trim()) { try { await api(`/admin/students/${s._id}`, { method: 'PUT', body: { fullName } }); load(); } catch (e) { setError(e.message); } }
  };
  const remove = async (s) => {
    if (!confirm(`${s.fullName} o‘chirilsinmi?`)) return;
    try { await api(`/admin/students/${s._id}`, { method: 'DELETE' }); setError(''); load(); } catch (e) { setError(e.message); }
  };

  return (
    <Modal title={`${group.index} · talabalar`} onClose={onClose} wide>
      <Alert>{error}</Alert>
      <Field label="Talabalar qo‘shish" hint="Har bir qatorga bitta to‘liq ism (Excel’dan nusxalab qo‘yish mumkin)">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full rounded-[10px] border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-base text-white outline-none focus:border-accent sm:text-sm" />
      </Field>
      <Button className="mt-3" onClick={add}>Qo‘shish</Button>
      <p className="mb-1 mt-6 text-sm text-slate-300">{list.length} ta talaba</p>
      <ul>
        {list.map((s) => (
          <li key={s._id} className="flex items-center justify-between gap-3 border-b border-[var(--rule)] py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-3"><Avatar name={s.fullName} size={28} /><span className="truncate text-white">{s.fullName}</span></span>
            <span className="flex shrink-0 gap-4">
              <button onClick={() => rename(s)} className="min-h-9 text-slate-200 underline-offset-4 hover:text-white hover:underline">Tahrirlash</button>
              <button onClick={() => remove(s)} className="min-h-9 text-negative underline-offset-4 hover:underline">O‘chirish</button>
            </span>
          </li>
        ))}
        {!list.length && <li className="rounded-[14px] border border-dashed border-ink-600 px-3 py-6 text-center text-sm text-slate-400">Talabalar yo‘q</li>}
      </ul>
    </Modal>
  );
}
