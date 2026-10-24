import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, getToken, setToken } from '../api.js';
import { Logo } from '../components/ui.jsx';
import PasswordModal from './PasswordModal.jsx';

// [yo'l, nomi, end, faqat egasi uchun]
const links = [
  ['/admin', 'Ma’lumotlar', true],
  ['/admin/monitor', 'Nazorat'],
  ['/admin/photos', 'Rasmlar'],
  ['/admin/groups', 'Guruhlar', false, true],
  ['/admin/users', 'Kuratorlar', false, true],
  ['/admin/fields', 'Forma maydonlari', false, true],
  ['/admin/options', 'Variantlar', false, true],
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [me, setMe] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const loggedIn = !!getToken();

  useEffect(() => { if (loggedIn) api('/admin/me').then(setMe).catch(() => {}); }, [loggedIn]);

  if (!loggedIn) return <Navigate to="/admin/login" />;
  if (!me) return <p className="py-20 text-center text-slate-400">Yuklanmoqda…</p>;

  const owner = me.role === 'owner';
  const ownerPaths = links.filter((l) => l[3]).map((l) => l[0]);
  if (!owner && ownerPaths.includes(pathname)) return <Navigate to="/admin" />;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="mr-2 hidden text-slate-400 sm:inline">{me.fullName || me.username} · {owner ? 'Egasi' : 'Kurator'}</span>
          <Link to="/" className="rounded-lg px-3 py-2 text-slate-400 transition hover:text-brand-400">Forma ↗</Link>
          <button onClick={() => setPwOpen(true)} className="rounded-lg px-3 py-2 text-slate-400 transition hover:text-brand-400">Parol</button>
          <button onClick={() => { setToken(null); location.href = '/admin/login'; }} className="rounded-lg px-3 py-2 text-slate-400 transition hover:text-red-300">Chiqish</button>
        </div>
      </header>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-ink-700 bg-ink-800/70 p-1.5 [scrollbar-width:none]">
        {links.filter((l) => owner || !l[3]).map(([to, label, end]) => (
          <NavLink key={to} to={to} end={end} className="relative whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-lg bg-brand-600" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className={`relative ${isActive ? 'text-white' : 'text-slate-300'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <AnimatePresence mode="wait">
        <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Outlet context={{ me }} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {me.mustChangePassword && <PasswordModal forced onDone={() => setMe({ ...me, mustChangePassword: false })} />}
        {pwOpen && !me.mustChangePassword && <PasswordModal onClose={() => setPwOpen(false)} onDone={() => setPwOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
