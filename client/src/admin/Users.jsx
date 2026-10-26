import { useEffect, useState } from 'react';
import { api, formatPhone } from '../api.js';
import { Alert, Avatar, Button, Field, Input, Modal, PageHead, Pill, Select, Tabs } from '../components/ui.jsx';
import { BOSHQARUV_TABS } from './Overview.jsx';

const blank = { username: '', fullName: '', phone: '', password: '', groups: [], active: true };

// Tasodifiy vaqtincha parol (o'xshash belgilarsiz)
const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => chars[b % chars.length]).join('');
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(null); // {_id?, ...}
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // {username, password}

  const load = () => Promise.all([api('/admin/users'), api('/admin/groups')])
    .then(([u, g]) => { setUsers(u); setGroups(g); })
    .catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const groupName = (id) => groups.find((g) => g._id === id)?.index || '—';

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (form._id) {
        await api(`/admin/users/${form._id}`, { method: 'PUT', body: { fullName: form.fullName, phone: form.phone, groups: form.groups, active: form.active, password: form.password || undefined } });
        if (form.password) setCreated({ username: form.username, password: form.password });
      } else {
        await api('/admin/users', { method: 'POST', body: form });
        setCreated({ username: form.username, password: form.password });
      }
      setForm(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (u) => {
    if (!confirm(`${u.fullName || u.username} o‘chirilsinmi? Uning ma’lumotlari (yozuvlar, rasmlar) saqlanib qoladi, guruhlari esa biriktirilmagan bo‘lib qoladi.`)) return;
    try { await api(`/admin/users/${u._id}`, { method: 'DELETE' }); setForm(null); load(); } catch (err) { setError(err.message); }
  };

  const toggleGroup = (id) => setForm((f) => ({ ...f, groups: f.groups.includes(id) ? f.groups.filter((x) => x !== id) : [...f.groups, id] }));
  const assigned = new Set(users.flatMap((u) => u.groups.map(String)));
  const unassigned = groups.filter((g) => !assigned.has(String(g._id)));
  const [pick, setPick] = useState({});
  const assign = async (g) => {
    const u = users.find((x) => x._id === pick[g._id]);
    if (!u) return;
    try {
      await api(`/admin/users/${u._id}`, { method: 'PUT', body: { groups: [...u.groups, g._id] } });
      setError(''); load();
    } catch (err) { setError(err.message); }
  };
  const noGroup = users.filter((u) => u.role === 'curator' && u.active && !u.groups.length);

  return (
    <div>
      <PageHead
        title="Kuratorlar"
        finding={noGroup.length ? `${noGroup.map((u) => u.fullName).join(', ')} uchun guruh biriktirilmagan.` : undefined}
        actions={<Button onClick={() => { setError(''); setForm({ ...blank, password: randomPassword() }); }}>Yangi kurator</Button>}
        steps={[
          '"Yangi kurator": ism, telefon, login va vaqtincha parolni kiriting (tasodifiy parol tugmasi bor), so‘ng kurator javob beradigan guruhlarni belgilang.',
          'Login va parolni kuratorga o‘zingiz yuborasiz. Kurator birinchi kirishda parolni o‘zi almashtiradi. Telefon Word hisobotda tyutor sifatida chiqadi.',
          'Kurator o‘z guruhlarini ham o‘zi yaratadi, ular avtomatik unga biriktiriladi. Siz istalgan guruhni boshqa kuratorga o‘tkaza olasiz.',
          '"Faol" belgisini o‘chirsangiz, kurator darhol tizimga kira olmay qoladi, ma’lumotlari saqlanadi.',
        ]}
      >
        Sizning nomingizdan ishlaydigan adminlar. Har biri faqat o‘ziga biriktirilgan guruhlarni ko‘radi.
      </PageHead>
      <Tabs items={BOSHQARUV_TABS} />
      <Alert>{form ? '' : error}</Alert>

      <div>
        {users.map((u) => (
          <div key={u._id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--rule)] py-3 md:min-h-[72px] ${u.active ? '' : 'opacity-60'}`}>
            <Avatar name={u.fullName || u.username} size={40} />
            <div className="min-w-0 flex-1 basis-56">
              <div className="flex flex-wrap items-center gap-2"><span className="font-medium text-fg">{u.fullName || u.username}</span>{u.role === 'owner' && <Pill>Egasi</Pill>}{!u.active && <Pill tone="negative">faol emas</Pill>}</div>
              <div className="text-[13px] text-slate-300">@{u.username}{u.phone ? ` · ${u.phone}` : ''}</div>
            </div>
            {u.role === 'curator' && (
              <div className="flex min-w-0 flex-1 basis-56 flex-wrap gap-1.5">
                {u.groups.length ? u.groups.map((id) => <Pill key={id}>{groupName(id)}</Pill>) : <span className="text-sm text-warning">Guruh biriktirilmagan</span>}
              </div>
            )}
            <button onClick={() => { setError(''); setForm({ ...u, password: '' }); }} className="min-h-9 text-sm text-slate-200 underline-offset-4 hover:text-fg hover:underline">Tahrirlash</button>
          </div>
        ))}
        {!users.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Hali kurator yo‘q.</p>}
      </div>

      {unassigned.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-base font-semibold text-fg">Biriktirilmagan guruhlar</h2>
          <p className="mb-3 text-sm text-slate-300">Hech bir kuratorga berilmagan guruhlarni shu yerdan biriktiring.</p>
          {unassigned.map((g) => (
            <div key={g._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--rule)] py-3">
              <div className="min-w-0 flex-1 basis-40"><div className="font-medium text-fg">{g.index}</div><div className="text-[13px] text-slate-300">{g.students} talaba · {g.faculty}</div></div>
              <div className="flex flex-1 basis-72 items-center gap-2">
                <Select value={pick[g._id] || ''} onChange={(e) => setPick({ ...pick, [g._id]: e.target.value })} aria-label={`${g.index} uchun kurator`}>
                  <option value="">Kuratorni tanlang…</option>
                  {users.filter((u) => u.role === 'curator' && u.active).map((u) => <option key={u._id} value={u._id}>{u.fullName}</option>)}
                </Select>
                <Button variant="ghost" disabled={!pick[g._id]} onClick={() => assign(g)}>Biriktirish</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {form && (
        <Modal title={form._id ? 'Kuratorni tahrirlash' : 'Yangi kurator'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="To‘liq ismi" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Familiya Ism Otasining ismi" required /></Field>
            <Field label="Login" required hint="Lotin harf, raqam, nuqta, defis (3-30 belgi)"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!form._id} autoCapitalize="none" required /></Field>
            <Field label="Telefon raqami" required hint="Hisobot (Word) hujjatida tyutor sifatida ko‘rsatiladi"><Input type="tel" inputMode="tel" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} placeholder="+998 90 123 45 67" required /></Field>
            {form.role !== 'owner' && (
              <>
                <Field label={form._id ? 'Yangi vaqtincha parol (ixtiyoriy)' : 'Vaqtincha parol'} required={!form._id} hint="Kurator birinchi kirishda uni o‘zgartiradi">
                  <div className="flex gap-2">
                    <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={form._id && !form.password ? undefined : 8} required={!form._id} autoComplete="off" />
                    <Button type="button" variant="ghost" onClick={() => setForm({ ...form, password: randomPassword() })}>Tasodifiy</Button>
                  </div>
                </Field>
                <div>
                  <span className="mb-2 block text-sm font-medium text-fg">Biriktirilgan guruhlar</span>
                  <div className="grid max-h-52 grid-cols-2 gap-1 overflow-y-auto rounded-[10px] bg-ink-900 p-2">
                    {groups.map((g) => (
                      <label key={g._id} className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-slate-200 hover:bg-ink-700">
                        <input type="checkbox" checked={form.groups.includes(g._id)} onChange={() => toggleGroup(g._id)} className="h-4 w-4 accent-fg" />{g.index}
                      </label>
                    ))}
                    {!groups.length && <p className="col-span-2 py-3 text-center text-sm text-slate-400">Avval guruh yarating</p>}
                  </div>
                </div>
                {form._id && <label className="flex min-h-9 items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-fg" />Faol (tizimga kira oladi)</label>}
              </>
            )}
            <Alert>{error}</Alert>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {form._id && form.role === 'curator' ? <Button type="button" variant="danger" onClick={() => remove(form)}>Kuratorni o‘chirish</Button> : <span />}
              <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setForm(null)}>Bekor qilish</Button><Button type="submit">Saqlash</Button></div>
            </div>
          </form>
        </Modal>
      )}

      {created && (
        <Modal title="Kirish ma’lumotlari" onClose={() => setCreated(null)}>
          <p className="mb-3 text-sm text-slate-300">Buni kuratorga yuboring. Parol bu oynada faqat hozir ko‘rinadi.</p>
          <div className="space-y-1 rounded-[14px] bg-ink-700 p-4 text-sm text-fg">
            <div>Login: <b className="font-semibold">{created.username}</b></div>
            <div>Parol: <b className="font-semibold">{created.password}</b></div>
          </div>
          <div className="mt-5 flex justify-end"><Button onClick={() => setCreated(null)}>Tushunarli</Button></div>
        </Modal>
      )}
    </div>
  );
}
