import { useState } from 'react';
import { api, formatPhone } from '../api.js';
import { Alert, Button, Field, Input, Modal } from '../components/ui.jsx';

// Profil: ism va telefon. Telefon Word hisobotda tyutor ma'lumoti sifatida chiqadi.
export default function ProfileModal({ me, onClose, onSaved, onPassword }) {
  const [f, setF] = useState({ fullName: me.fullName || '', phone: me.phone || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      onSaved(await api('/admin/me', { method: 'PUT', body: f }));
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <Modal title="Profil" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="To‘liq ismi" required hint="Familiya, ism, otasining ismi"><Input value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} required /></Field>
        <Field label="Telefon raqami" required hint="Word hisobotda tyutor sifatida ko‘rsatiladi"><Input type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: formatPhone(e.target.value) })} placeholder="+998 90 123 45 67" required /></Field>
        <p className="text-[13px] text-slate-400">Login: <b className="text-slate-200">@{me.username}</b> · {me.role === 'owner' ? 'Egasi' : 'Kurator'}</p>
        <Alert>{error}</Alert>
        <div className="flex flex-wrap justify-between gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onPassword}>Parolni almashtirish</Button>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Bekor qilish</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Saqlash'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
