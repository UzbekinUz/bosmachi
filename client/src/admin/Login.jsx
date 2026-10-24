import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { Alert, Button, Field, Input, Logo } from '../components/ui.jsx';

export default function Login() {
  const nav = useNavigate();
  const [f, setF] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: f });
      setToken(token);
      nav('/admin');
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-brand-600 p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo inverse />
        <p className="max-w-md font-serif text-5xl font-semibold leading-[1.05] text-white">Talabalar ijarasi: bitta jadvalda, tartib bilan.</p>
        <p className="max-w-sm text-[15px] text-blue-50">Ma’lumotlar, rasmlar va hisobotlar. Egasi va kuratorlar uchun.</p>
      </div>
      <div className="grid place-items-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="font-serif text-3xl font-semibold text-white">Kirish</h1>
          <p className="mt-1.5 text-[15px] text-slate-300">Egasi yoki kurator hisobingiz bilan kiring.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Login"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus autoCapitalize="none" required /></Field>
            <Field label="Parol"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></Field>
            <Alert>{error}</Alert>
            <Button type="submit" className="w-full !min-h-12">Kirish</Button>
          </form>
          <p className="mt-6 text-[13px] text-slate-400">Parolni unutgan bo‘lsangiz, tizim egasiga murojaat qiling.</p>
        </div>
      </div>
    </div>
  );
}
