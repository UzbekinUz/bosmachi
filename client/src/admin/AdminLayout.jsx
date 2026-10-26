import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, getToken, setToken } from '../api.js';
import { useInstall, useOnline, useUpdate } from '../pwa.js';
import { Avatar, Button, Logo, ThemeButton, ThemeSwitch } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import InstallBanner, { IosHelp } from '../components/InstallBanner.jsx';
import PasswordModal from './PasswordModal.jsx';
import ProfileModal from './ProfileModal.jsx';

// [yo'l, nomi, qisqa nom (pastki panel), belgi, end, faqat egasi uchun, shu bo'limga tegishli boshqa yo'llar]
const LINKS = [
  { to: '/admin', label: 'Ma’lumotlar', short: 'Ma’lumot', icon: 'data', end: true },
  { to: '/admin/photos', label: 'Rasmlar', short: 'Rasmlar', icon: 'photos' },
  { to: '/admin/monitor', label: 'Nazorat', short: 'Nazorat', icon: 'monitor' },
  { to: '/admin/groups', label: 'Guruhlar', short: 'Guruhlar', icon: 'groups' },
  { to: '/admin/overview', label: 'Boshqaruv', short: 'Boshqaruv', icon: 'overview', owner: true, also: ['/admin/users'] },
  { to: '/admin/fields', label: 'Sozlamalar', short: 'Sozlamalar', icon: 'settings', owner: true, also: ['/admin/options'] },
];
const OWNER_PATHS = ['/admin/overview', '/admin/users', '/admin/fields', '/admin/options'];

const logout = () => { setToken(null); location.href = '/admin/login'; };
const on = (l, path) => (l.end ? path === l.to : [l.to, ...(l.also || [])].some((p) => path === p || path.startsWith(`${p}/`)));

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [me, setMe] = useState(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menu, setMenu] = useState(false); // hisob menyusi (kompyuter)
  const [more, setMore] = useState(false); // "Yana" paneli (telefon)
  const [iosHelp, setIosHelp] = useState(false);
  const menuRef = useRef(null);
  const loggedIn = !!getToken();
  const online = useOnline();
  const update = useUpdate();
  const pwa = useInstall();

  useEffect(() => { if (loggedIn) api('/admin/me').then(setMe).catch(() => {}); }, [loggedIn]);
  useEffect(() => { setMore(false); setMenu(false); }, [pathname]);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    const esc = (e) => { if (e.key === 'Escape') { setMenu(false); setMore(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  if (!loggedIn) return <Navigate to={`/admin/login?next=${encodeURIComponent(pathname)}`} />;
  if (!me) return <p className="py-20 text-center text-slate-400">Yuklanmoqda…</p>;

  const owner = me.role === 'owner';
  if (!owner && OWNER_PATHS.includes(pathname)) return <Navigate to="/admin" />;
  const visible = LINKS.filter((l) => owner || !l.owner);
  const primary = visible.filter((l) => !l.owner); // pastki panelda to'g'ridan-to'g'ri
  const extra = visible.filter((l) => l.owner); // "Yana" ichida
  const name = me.fullName || me.username;
  const needPhone = me.role === 'curator' && !me.phone && !me.mustChangePassword; // hisobot uchun telefon shart

  const close = () => { setMenu(false); setMore(false); };
  const openProfile = () => { close(); setProfileOpen(true); };
  const openPassword = () => { close(); setPwOpen(true); };
  const doInstall = async () => { close(); await pwa.install(); };

  const row = 'flex min-h-12 w-full items-center gap-3 rounded-[10px] px-3 text-left text-[15px] text-slate-200 transition hover:bg-ink-700 hover:text-fg lg:min-h-10 lg:text-sm';
  const accountRows = (
    <>
      <button className={row} onClick={openProfile}><Icon name="user" />Profil va telefon</button>
      <button className={row} onClick={openPassword}><Icon name="lock" />Parolni almashtirish</button>
      <Link className={row} to="/" onClick={close}><Icon name="form" />Talaba formasi</Link>
      {pwa.canInstall && <button className={row} onClick={doInstall}><Icon name="download" />Ilovani o‘rnatish</button>}
      {pwa.needsIosHelp && <button className={row} onClick={() => { close(); setIosHelp(true); }}><Icon name="download" />Ilovani o‘rnatish</button>}
      <div className="px-1 py-2"><ThemeSwitch /></div>
      <button className={`${row} hover:!text-negative`} onClick={logout}><Icon name="logout" />Chiqish</button>
    </>
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[var(--rule)] bg-ink-950">
        <div className="mx-auto flex h-12 max-w-[1208px] items-center gap-8 px-4 sm:px-6 lg:px-10">
          <Link to="/admin" aria-label="Hygge"><Logo /></Link>

          <nav className="hidden items-center gap-6 lg:flex" aria-label="Asosiy">
            {visible.map((l) => (
              <NavLink key={l.to} to={l.to} end className={`text-sm font-semibold transition ${on(l, pathname) ? 'text-fg' : 'text-slate-300 hover:text-fg'}`}>{l.label}</NavLink>
            ))}
          </nav>

          {/* Kompyuter: hisob menyusi */}
          <div className="relative ml-auto hidden lg:block" ref={menuRef}>
            <button onClick={() => setMenu(!menu)} aria-expanded={menu} className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-sm text-slate-200 transition hover:bg-ink-800 hover:text-fg">
              <Avatar name={name} size={28} />
              <span className="max-w-40 truncate">{name}</span>
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full z-40 mt-2 w-72 origin-top-right rounded-[14px] bg-ink-800 p-2 shadow-2xl ring-1 ring-[var(--rule)]"
                >
                  <div className="px-3 py-2"><div className="truncate text-sm font-medium text-fg">{name}</div><div className="text-xs text-slate-300">@{me.username} · {owner ? 'Egasi' : 'Kurator'}</div></div>
                  {accountRows}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Telefon: rejim tugmasi */}
          <div className="-mr-2 ml-auto lg:hidden"><ThemeButton /></div>
        </div>
        <AnimatePresence initial={false}>
          {!online && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pill-warning px-4 py-2 text-center text-sm">Internet aloqasi yo‘q. Ma’lumotlar yangilanmaydi.</div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto max-w-[1208px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:px-10 lg:pb-20 lg:pt-10">
        <Outlet context={{ me }} />
      </main>

      {/* Telefon: pastki navigatsiya paneli */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rule)] bg-ink-800 lg:hidden safe-bottom" aria-label="Asosiy">
        <ul className="mx-auto grid max-w-xl grid-cols-5 px-2">
          {primary.map((l) => {
            const active = on(l, pathname) && !more;
            return (
              <li key={l.to}>
                <NavLink to={l.to} end className={`relative flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${active ? 'text-fg' : 'text-slate-300'}`}>
                  {active && <motion.span layoutId="tab-pill" className="absolute top-1.5 h-7 w-14 rounded-full bg-ink-700" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />}
                  <motion.span whileTap={{ scale: 0.88 }} className="relative grid h-7 place-items-center"><Icon name={l.icon} size={22} /></motion.span>
                  <span className="relative">{l.short}</span>
                </NavLink>
              </li>
            );
          })}
          <li>
            <button onClick={() => setMore(!more)} aria-expanded={more} className={`relative flex min-h-[58px] w-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${more || extra.some((l) => on(l, pathname)) ? 'text-fg' : 'text-slate-300'}`}>
              {(more || extra.some((l) => on(l, pathname))) && <motion.span layoutId="tab-pill" className="absolute top-1.5 h-7 w-14 rounded-full bg-ink-700" transition={{ type: 'spring', stiffness: 480, damping: 34 }} />}
              <motion.span whileTap={{ scale: 0.88 }} className="relative grid h-7 place-items-center"><Icon name="more" size={22} /></motion.span>
              <span className="relative">Yana</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* "Yana" paneli: egasi bo'limlari va hisob */}
      <AnimatePresence>
        {more && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="absolute inset-0 bg-[var(--backdrop)]" onClick={() => setMore(false)} />
            <motion.div
              role="dialog" aria-modal="true" aria-label="Yana"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 34, stiffness: 380 }}
              className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[20px] bg-ink-800 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3"
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-600" aria-hidden />
              <div className="mb-2 flex items-center gap-3 px-1"><Avatar name={name} size={40} /><div className="min-w-0"><div className="truncate font-medium text-fg">{name}</div><div className="text-xs text-slate-300">@{me.username} · {owner ? 'Egasi' : 'Kurator'}</div></div></div>
              {extra.length > 0 && (
                <div className="mb-2 border-b border-[var(--rule)] pb-2">
                  {extra.map((l) => (
                    <NavLink key={l.to} to={l.to} end className={`${row} ${on(l, pathname) ? '!text-fg' : ''}`}><Icon name={l.icon} />{l.label}</NavLink>
                  ))}
                </div>
              )}
              {accountRows}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Yangi versiya xabari */}
      <AnimatePresence>
        {update.ready && (
          <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[14px] bg-ink-700 px-4 py-3 text-sm shadow-2xl lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
            <span className="text-fg">Yangi versiya tayyor.</span>
            <Button className="!min-h-9" onClick={update.apply}>Yangilash</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {me.mustChangePassword && <PasswordModal forced onDone={() => setMe({ ...me, mustChangePassword: false })} />}
        {pwOpen && !me.mustChangePassword && <PasswordModal onClose={() => setPwOpen(false)} onDone={() => setPwOpen(false)} />}
        {(profileOpen || needPhone) && !me.mustChangePassword && (
          <ProfileModal
            me={me} forced={needPhone} onClose={() => setProfileOpen(false)}
            onSaved={(u) => { setMe(u); setProfileOpen(false); }}
            onPassword={() => { setProfileOpen(false); setPwOpen(true); }}
          />
        )}
        {iosHelp && <IosHelp onClose={() => setIosHelp(false)} />}
      </AnimatePresence>

      <InstallBanner lifted />
    </div>
  );
}
