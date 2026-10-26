import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { Alert, Button, Field, Input, Logo, ThemeButton } from '../components/ui.jsx';
import InstallBanner from '../components/InstallBanner.jsx';

export default function Login() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [f, setF] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: f });
      setToken(token);
      const next = params.get('next');
      nav(next && next.startsWith('/admin') ? next : '/admin');
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--rule)]">
        <div className="mx-auto flex h-12 max-w-[1208px] items-center justify-between px-4 sm:px-6 lg:px-10">
          <Logo />
          <div className="flex items-center gap-1"><a href="/" className="rounded-full px-3 py-2 text-sm text-slate-300 transition hover:text-fg">Talaba formasi</a><ThemeButton /></div>
        </div>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1208px] items-center gap-16 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-10">
        <section className="hidden max-w-md lg:block" aria-label="Tizim haqida">
          <h2 className="text-base font-semibold text-fg">Tyutorlar va kuratorlar uchun</h2>
          <dl className="mt-4">
            {[
              ['Talabalar formasi', 'Guruh bo‘yicha ro‘yxatdan ism tanlanadi, manzil va lokatsiya yig‘iladi, ma’lumot Excel jadvaliga tushadi.'],
              ['Xonadon rasmlari', 'Tyutor har talaba uchun 4 ta rasm yuklaydi va kerakli qismini kesadi.'],
              ['Nazorat va hisobot', 'Kim formani to‘ldirmagani ko‘rinadi, rasmlardan tayyor Word hisobot yig‘iladi.'],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-[var(--rule)] py-4"><dt className="text-sm font-medium text-fg">{k}</dt><dd className="mt-1 text-sm leading-relaxed text-slate-300">{v}</dd></div>
            ))}
          </dl>
        </section>
        <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-fg">Kirish</h1>
        <p className="mt-1 text-[15px] text-slate-300">Talabalarning ijara ma’lumotlari: egasi yoki kurator hisobi bilan kiring.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <Field label="Login"><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} autoFocus autoCapitalize="none" autoComplete="username" required /></Field>
          <Field label="Parol"><Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" required /></Field>
          <Alert>{error}</Alert>
          <Button type="submit" disabled={busy} className="w-full !min-h-11">{busy ? 'Tekshirilmoqda…' : 'Kirish'}</Button>
        </form>
        <p className="mt-6 text-[13px] leading-relaxed text-slate-400">Parolni unutgan bo‘lsangiz, tizim egasiga murojaat qiling. Bir nechta noto‘g‘ri urinishdan keyin kirish vaqtincha to‘xtatiladi.</p>
        </div>
      </main>
      <InstallBanner />
    </div>
  );
}
