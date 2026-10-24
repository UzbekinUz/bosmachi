import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Alert, Button, Card, Field, Input, Modal } from '../components/ui.jsx';

const blank = { username: '', fullName: '', password: '', groups: [], active: true };

// Tasodifiy vaqtincha parol (o'xshash belgilarsiz)
const randomPassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
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
        await api(`/admin/users/${form._id}`, { method: 'PUT', body: { fullName: form.fullName, groups: form.groups, active: form.active, password: form.password || undefined } });
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
    if (!confirm(`${u.fullName || u.username} o‘chirilsinmi? Uning ma’lumotlari (yozuvlar, rasmlar) saqlanib qoladi.`)) return;
    try { await api(`/admin/users/${u._id}`, { method: 'DELETE' }); load(); } catch (err) { setError(err.message); }
  };

  const toggleGroup = (id) => setForm((f) => ({ ...f, groups: f.groups.includes(id) ? f.groups.filter((x) => x !== id) : [...f.groups, id] }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Kuratorlar faqat o‘zlariga biriktirilgan guruhlarning ma’lumotlari, rasmlari va hisobotini ko‘radi.</p>
        <Button onClick={() => { setError(''); setForm({ ...blank, password: randomPassword() }); }}>+ Yangi kurator</Button>
      </div>
      <Alert>{form ? '' : error}</Alert>

      <Card className="divide-y divide-ink-700/60 !p-0">
        {users.map((u) => (
          <div key={u._id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${u.active ? '' : 'opacity-50'}`}>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-white">{u.fullName || u.username} {u.role === 'owner' && <span className="ml-1 rounded bg-brand-600/20 px-1.5 py-0.5 text-xs text-brand-400">Egasi</span>}{!u.active && <span className="ml-1 text-xs text-red-300">faol emas</span>}</div>
              <div className="text-sm text-slate-400">@{u.username}</div>
              {u.role === 'curator' && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {u.groups.length ? u.groups.map((id) => <span key={id} className="rounded-full bg-ink-700 px-2.5 py-0.5 text-xs text-blue-200">{groupName(id)}</span>) : <span className="text-xs text-amber-300">Guruh biriktirilmagan</span>}
                </div>
              )}
            </div>
            <div className="whitespace-nowrap text-sm">
              <button onClick={() => { setError(''); setForm({ ...u, password: '' }); }} className="mr-3 text-brand-400 hover:underline">Tahrirlash</button>
              {u.role === 'curator' && <button onClick={() => remove(u)} className="text-red-300 hover:underline">O‘chirish</button>}
            </div>
          </div>
        ))}
        {!users.length && <p className="px-4 py-10 text-center text-slate-500">Hali kurator yo‘q</p>}
      </Card>

      {form && (
        <Modal title={form._id ? 'Kuratorni tahrirlash' : 'Yangi kurator'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="To‘liq ismi" required><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Familiya Ism Otasining ismi" required /></Field>
            <Field label="Login" required hint="Lotin harf, raqam, nuqta, defis (3-30 belgi)"><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!form._id} autoCapitalize="none" required /></Field>
            {form.role !== 'owner' && (
              <>
                <Field label={form._id ? 'Yangi vaqtincha parol (ixtiyoriy)' : 'Vaqtincha parol'} required={!form._id} hint="Kurator birinchi kirishda uni o‘zgartiradi">
                  <div className="flex gap-2">
                    <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={form._id && !form.password ? undefined : 8} required={!form._id} autoComplete="off" />
                    <Button type="button" variant="ghost" onClick={() => setForm({ ...form, password: randomPassword() })}>Tasodifiy</Button>
                  </div>
                </Field>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-blue-100/90">Biriktirilgan guruhlar</span>
                  <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-ink-700 p-2">
                    {groups.map((g) => (
                      <label key={g._id} className="flex min-h-10 items-center gap-2 rounded-md px-2 text-sm hover:bg-ink-700/40">
                        <input type="checkbox" checked={form.groups.includes(g._id)} onChange={() => toggleGroup(g._id)} className="h-4 w-4 accent-blue-500" />{g.index}
                      </label>
                    ))}
                    {!groups.length && <p className="col-span-2 py-3 text-center text-sm text-slate-500">Avval guruh yarating</p>}
                  </div>
                </div>
                {form._id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-blue-500" />Faol (kira oladi)</label>}
              </>
            )}
            <Alert>{error}</Alert>
            <div className="flex justify-end gap-2 pt-1"><Button type="button" variant="ghost" onClick={() => setForm(null)}>Bekor qilish</Button><Button type="submit">Saqlash</Button></div>
          </form>
        </Modal>
      )}

      {created && (
        <Modal title="Kirish ma’lumotlari" onClose={() => setCreated(null)}>
          <p className="mb-3 text-sm text-slate-400">Buni kuratorga yuboring. Parol bu oynada faqat hozir ko‘rinadi.</p>
          <div className="space-y-1 rounded-lg border border-ink-600 bg-ink-800 p-3 font-mono text-sm text-white">
            <div>Login: {created.username}</div>
            <div>Parol: {created.password}</div>
          </div>
          <div className="mt-4 flex justify-end"><Button onClick={() => setCreated(null)}>Tushunarli</Button></div>
        </Modal>
      )}
    </div>
  );
}
