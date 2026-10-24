import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, getToken, setToken } from '../api.js';
import { Logo } from '../components/ui.jsx';
import PasswordModal from './PasswordModal.jsx';
import ProfileModal from './ProfileModal.jsx';

// [yo'l, nomi, end, faqat egasi uchun]
const links = [
  ['/admin', 'Ma’lumotlar', true],
  ['/admin/monitor', 'Nazorat'],
  ['/admin/photos', 'Rasmlar'],
  ['/admin/groups', 'Guruhlar'],
  ['/admin/overview', 'Boshqaruv', false, true],
  ['/admin/users', 'Kuratorlar', false, true],
  ['/admin/fields', 'Forma maydonlari', false, true],
  ['/admin/options', 'Variantlar', false, true],
];

const logout = () => { setToken(null); location.href = '/admin/login'; };

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [me, setMe] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const loggedIn = !!getToken();

  useEffect(() => { if (loggedIn) api('/admin/me').then(setMe).catch(() => {}); }, [loggedIn]);

  if (!loggedIn) return <Navigate to="/admin/login" />;
  if (!me) return <p className="py-20 text-center text-slate-400">Yuklanmoqda…</p>;

  const owner = me.role === 'owner';
  const ownerPaths = links.filter((l) => l[3]).map((l) => l[0]);
  if (!owner && ownerPaths.includes(pathname)) return <Navigate to="/admin" />;
  const visible = links.filter((l) => owner || !l[3]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Kompyuter: chap menyu */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink-900 px-4 py-6 lg:flex">
        <div className="px-2"><Logo /></div>
        <nav className="mt-8 flex flex-col gap-1">
          {visible.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className="relative rounded-lg px-3 py-2.5 text-[15px] font-medium">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="nav-side" className="absolute inset-0 rounded-lg bg-ink-700" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                  <span className={`relative flex items-center gap-3 ${isActive ? 'text-white' : 'text-slate-300 hover:text-white'}`}>
                    <span className={`h-5 w-1 rounded-full ${isActive ? 'bg-brand-500' : 'bg-transparent'}`} />{label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 px-2 text-sm">
          <div className="mb-3">
            <div className="truncate font-medium text-white">{me.fullName || me.username}</div>
            <div className="text-slate-400">@{me.username} · {owner ? 'Egasi' : 'Kurator'}</div>
          </div>
          <Link to="/" className="block rounded-lg py-1.5 text-slate-300 transition hover:text-white">Forma ↗</Link>
          <button onClick={() => setProfileOpen(true)} className="block rounded-lg py-1.5 text-slate-300 transition hover:text-white">Profil va telefon</button>
          <button onClick={() => setPwOpen(true)} className="block rounded-lg py-1.5 text-slate-300 transition hover:text-white">Parolni almashtirish</button>
          <button onClick={logout} className="block rounded-lg py-1.5 text-slate-300 transition hover:text-red-300">Chiqish</button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Telefon: yuqori panel */}
        <header className="bg-ink-900 px-4 pb-2 pt-4 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <Logo size="text-xl" />
            <div className="flex items-center gap-1 text-sm">
              <Link to="/" className="whitespace-nowrap rounded-lg px-2 py-2 text-slate-300">Forma ↗</Link>
              <button onClick={() => setProfileOpen(true)} className="rounded-lg px-2.5 py-2 text-slate-300">Profil</button>
              <button onClick={logout} className="rounded-lg px-2.5 py-2 text-slate-300">Chiqish</button>
            </div>
          </div>
          <nav className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            {visible.map(([to, label, end]) => (
              <NavLink key={to} to={to} end={end} className="relative whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium">
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="nav-top" className="absolute inset-0 rounded-lg bg-ink-700" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                    <span className={`relative ${isActive ? 'text-white' : 'text-slate-300'}`}>{label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-20 pt-7 lg:px-10 lg:pt-10">
          <AnimatePresence mode="wait">
            <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Outlet context={{ me }} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {me.mustChangePassword && <PasswordModal forced onDone={() => setMe({ ...me, mustChangePassword: false })} />}
        {pwOpen && !me.mustChangePassword && <PasswordModal onClose={() => setPwOpen(false)} onDone={() => setPwOpen(false)} />}
        {profileOpen && !me.mustChangePassword && (
          <ProfileModal me={me} onClose={() => setProfileOpen(false)} onSaved={(u) => { setMe(u); setProfileOpen(false); }} onPassword={() => { setProfileOpen(false); setPwOpen(true); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
