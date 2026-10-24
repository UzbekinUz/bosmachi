import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { api, getToken, setToken } from '../api.js';
import { Avatar, Logo } from '../components/ui.jsx';
import PasswordModal from './PasswordModal.jsx';
import ProfileModal from './ProfileModal.jsx';

// [yo'l, nomi, end, faqat egasi uchun, shu bo'limga tegishli boshqa yo'llar]
const links = [
  ['/admin', 'Ma’lumotlar', true],
  ['/admin/photos', 'Rasmlar'],
  ['/admin/monitor', 'Nazorat'],
  ['/admin/groups', 'Guruhlar'],
  ['/admin/overview', 'Boshqaruv', false, true, ['/admin/users']],
  ['/admin/fields', 'Sozlamalar', false, true, ['/admin/options']],
];
const OWNER_PATHS = ['/admin/overview', '/admin/users', '/admin/fields', '/admin/options'];

const logout = () => { setToken(null); location.href = '/admin/login'; };
const isActive = (l, path) => (l[2] ? path === l[0] : [l[0], ...(l[4] || [])].some((p) => path === p || path.startsWith(`${p}/`)));

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [me, setMe] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menu, setMenu] = useState(false); // hisob menyusi (kompyuter)
  const [sheet, setSheet] = useState(false); // to'liq ekranli menyu (telefon)
  const menuRef = useRef(null);
  const loggedIn = !!getToken();

  useEffect(() => { if (loggedIn) api('/admin/me').then(setMe).catch(() => {}); }, [loggedIn]);
  useEffect(() => { setSheet(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    const esc = (e) => { if (e.key === 'Escape') { setMenu(false); setSheet(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  if (!loggedIn) return <Navigate to="/admin/login" />;
  if (!me) return <p className="py-20 text-center text-slate-400">Yuklanmoqda…</p>;

  const owner = me.role === 'owner';
  if (!owner && OWNER_PATHS.includes(pathname)) return <Navigate to="/admin" />;
  const visible = links.filter((l) => owner || !l[3]);
  const name = me.fullName || me.username;
  const openProfile = () => { setMenu(false); setSheet(false); setProfileOpen(true); };
  const openPassword = () => { setMenu(false); setSheet(false); setPwOpen(true); };

  const menuItem = 'block w-full rounded-[10px] px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-ink-700 hover:text-white';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-ink-950">
        <div className="mx-auto flex h-12 max-w-[1208px] items-center gap-8 px-4 sm:px-6 lg:px-10">
          <Link to="/admin" aria-label="Bosmachi"><Logo /></Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Asosiy">
            {visible.map((l) => (
              <NavLink key={l[0]} to={l[0]} end className={`text-sm font-semibold transition ${isActive(l, pathname) ? 'text-white' : 'text-slate-300 hover:text-white'}`}>{l[1]}</NavLink>
            ))}
          </nav>

          {/* Kompyuter: hisob menyusi */}
          <div className="relative ml-auto hidden lg:block" ref={menuRef}>
            <button onClick={() => setMenu(!menu)} aria-expanded={menu} className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm text-slate-200 transition hover:bg-ink-800 hover:text-white">
              <Avatar name={name} size={28} />
              <span className="max-w-40 truncate">{name}</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            {menu && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-[14px] bg-ink-700 p-2 shadow-2xl">
                <div className="px-3 py-2"><div className="truncate text-sm font-medium text-white">{name}</div><div className="text-xs text-slate-300">@{me.username} · {owner ? 'Egasi' : 'Kurator'}</div></div>
                <button className={menuItem} onClick={openProfile}>Profil va telefon</button>
                <button className={menuItem} onClick={openPassword}>Parolni almashtirish</button>
                <Link className={menuItem} to="/">Talaba formasi</Link>
                <button className={`${menuItem} hover:!text-negative`} onClick={logout}>Chiqish</button>
              </div>
            )}
          </div>

          {/* Telefon: menyu tugmasi */}
          <button onClick={() => setSheet(true)} className="-mr-2 ml-auto grid h-11 w-11 place-items-center rounded-full text-white lg:hidden" aria-label="Menyu">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h14M3 10h14M3 14h14" /></svg>
          </button>
        </div>
      </header>

      {sheet && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-950 lg:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
          <div className="mx-auto flex h-12 max-w-[1208px] items-center justify-between px-4 sm:px-6">
            <Logo />
            <button onClick={() => setSheet(false)} className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-white" aria-label="Yopish">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
            </button>
          </div>
          <nav className="mx-auto max-w-[1208px] px-4 pt-4 sm:px-6" aria-label="Asosiy">
            {visible.map((l) => (
              <NavLink key={l[0]} to={l[0]} end className={`flex min-h-12 items-center border-b border-[var(--rule)] text-lg font-medium ${isActive(l, pathname) ? 'text-white' : 'text-slate-300'}`}>{l[1]}</NavLink>
            ))}
          </nav>
          <div className="mx-auto max-w-[1208px] px-4 pb-10 pt-6 sm:px-6">
            <div className="mb-3 flex items-center gap-3"><Avatar name={name} /><div><div className="text-sm font-medium text-white">{name}</div><div className="text-xs text-slate-300">@{me.username} · {owner ? 'Egasi' : 'Kurator'}</div></div></div>
            <button className={menuItem} onClick={openProfile}>Profil va telefon</button>
            <button className={menuItem} onClick={openPassword}>Parolni almashtirish</button>
            <Link className={menuItem} to="/">Talaba formasi</Link>
            <button className={`${menuItem} hover:!text-negative`} onClick={logout}>Chiqish</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1208px] px-4 pb-20 pt-8 sm:px-6 lg:px-10 lg:pt-10">
        <Outlet context={{ me }} />
      </main>

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
