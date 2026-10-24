import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { getToken, setToken } from '../api.js';
import { Logo } from '../components/ui.jsx';

const links = [
  ['/admin', 'Ma’lumotlar', true],
  ['/admin/monitor', 'Nazorat'],
  ['/admin/photos', 'Rasmlar'],
  ['/admin/groups', 'Guruhlar'],
  ['/admin/fields', 'Forma maydonlari'],
  ['/admin/options', 'Variantlar'],
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  if (!getToken()) return <Navigate to="/admin/login" />;
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-5">
      <header className="mb-5 flex items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-1 text-sm">
          <Link to="/" className="rounded-lg px-3 py-2 text-slate-400 transition hover:text-brand-400">Forma ↗</Link>
          <button onClick={() => { setToken(null); location.href = '/admin/login'; }} className="rounded-lg px-3 py-2 text-slate-400 transition hover:text-red-300">Chiqish</button>
        </div>
      </header>
      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-ink-700 bg-ink-800/70 p-1.5 [scrollbar-width:none]">
        {links.map(([to, label, end]) => (
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
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
