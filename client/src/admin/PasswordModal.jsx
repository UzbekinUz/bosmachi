import { useState } from 'react';
import { api, setToken } from '../api.js';
import { Alert, Button, Field, Input, Modal } from '../components/ui.jsx';

// forced = true: birinchi kirishda parolni almashtirish majburiy, oynani yopib bo'lmaydi
export default function PasswordModal({ forced, onClose, onDone }) {
  const [f, setF] = useState({ current: '', password: '', again: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.again) return setError('Yangi parol ikki marta bir xil kiritilmadi');
    setBusy(true);
    try {
      const res = await api('/admin/me/password', { method: 'POST', body: { current: f.current, password: f.password } });
      if (res.token) setToken(res.token); // eski tokenlar bekor bo'ladi, yangisini saqlaymiz
      onDone();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <Modal title={forced ? 'Yangi parol belgilang' : 'Parolni almashtirish'} onClose={forced ? () => {} : onClose}>
      {forced && <p className="mb-3 text-sm text-slate-400">Birinchi kirish: egasi bergan vaqtincha parolni o‘zingiznikiga almashtiring.</p>}
      <form onSubmit={submit} className="space-y-3">
        <Field label={forced ? 'Vaqtincha parol' : 'Joriy parol'}><Input type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></Field>
        <Field label="Yangi parol" hint="Kamida 8 belgi"><Input type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={8} /></Field>
        <Field label="Yangi parol (takror)"><Input type="password" autoComplete="new-password" value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} required minLength={8} /></Field>
        <Alert>{error}</Alert>
        <div className="flex justify-end gap-2 pt-1">
          {!forced && <Button type="button" variant="ghost" onClick={onClose}>Bekor qilish</Button>}
          <Button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
        </div>
      </form>
    </Modal>
  );
}
