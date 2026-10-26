import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import Icon from './Icon.jsx';
import { useTheme } from '../theme.js';

/* ---------- Maydonlar ---------- */
const base = 'h-11 w-full rounded-[10px] border border-ink-600 bg-ink-900 px-3.5 text-base text-fg placeholder-slate-500 outline-none transition focus:border-accent disabled:opacity-50 sm:h-10 sm:text-sm';

export function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-fg">
        {label}{required && <span className="ml-0.5 text-slate-300"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-2 block text-[13px] leading-snug text-slate-400">{hint}</span>}
    </label>
  );
}

export const Input = (props) => <input {...props} className={`${base} ${props.className || ''}`} />;

// Oddiy (native) select — admin jadvallarida ishlatiladi
export function Select({ children, ...props }) {
  return <select {...props} className={`${base} ${props.className || ''}`}>{children}</select>;
}

// Asosiy tugma teskari: oq to'liq-yumaloq, qora yozuv. Ko'k rang tugmaga tegmaydi.
export function Button({ variant = 'primary', className = '', disabled, ...props }) {
  const styles = {
    primary: 'bg-fg text-onfg hover:bg-slate-200',
    ghost: 'border border-ink-600 text-fg hover:bg-ink-700',
    danger: 'border border-negative/50 text-negative hover:bg-negative/10',
  };
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors sm:min-h-9 disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    />
  );
}

// Tugma ko'rinishidagi havola
export const LinkButton = ({ variant = 'primary', className = '', ...props }) => (
  <a
    {...props}
    className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors sm:min-h-9 ${variant === 'primary' ? 'bg-fg text-onfg hover:bg-slate-200' : 'border border-ink-600 text-fg hover:bg-ink-700'} ${className}`}
  />
);

// Karta: faqat fon pog'onasi bilan ajraladi (chegara ham, soya ham yo'q)
export const Card = ({ className = '', ...props }) => (
  <div {...props} className={`rounded-[20px] bg-ink-800 p-5 sm:p-6 ${className}`} />
);

export function Alert({ type = 'error', children }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className={`rounded-xl px-4 py-3 text-sm ${type === 'error' ? 'alert-error' : 'alert-ok'}`}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Holat: bitta tus (to'q fonda o'z rangining tusi)
export const Pill = ({ tone = 'neutral', className = '', children }) => <span className={`pill pill-${tone} ${className}`}>{children}</span>;

/* ---------- Mahsulot belgisi (A variant): qalqon, ichida tom va H harfi ---------- */
export function Mark({ size = 30 }) {
  return (
    <svg width={size * 0.86} height={size} viewBox="0 0 48 56" aria-hidden="true">
      <path d="M24 2.5 44.5 9.5v18.2c0 12.4-8.4 21.5-20.5 26.3C11.9 49.200 3.500 40.100 3.500 27.700V9.500z" fill="#2563eb" />
      <path d="M12.500 26 24 15.500 35.500 26" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.500 26.500v14M30.500 26.500v14M17.500 33.500h13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 'text-xl' }) {
  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight text-fg ${size}`}>
      <Mark />
      Hygge
    </div>
  );
}

/* ---------- Odamlar: barqaror bosh harf va o'z rangining och tusi ---------- */
const hueOf = (s) => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
export function Avatar({ name, size = 32 }) {
  const parts = String(name || '?').trim().split(/\s+/);
  const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  const h = hueOf(name);
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, '--h': h, fontSize: size * 0.38 }}
      className="avatar grid shrink-0 place-items-center rounded-full font-medium"
    >{initials}</span>
  );
}

/* ---------- To'ldirish chizig'i: ko'k faqat ma'lumotda ---------- */
export function Meter({ value, total, className = '' }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-ink-700" role="img" aria-label={`${value} / ${total}`}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-[4.5rem] shrink-0 text-right text-sm tabular-nums"><span className="text-fg">{value}</span><span className="text-slate-400"> / {total}</span></span>
    </div>
  );
}

/* ---------- KPI: bitta konteyner, 1px chiziqlar bilan bo'lingan ---------- */
const COLS = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' };
export function Kpis({ items }) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-[var(--rule)] ${COLS[items.length] || 'lg:grid-cols-4'} [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1`}>
      {items.map((k) => (
        <div key={k.label} className="bg-ink-800 p-5">
          <dt className="text-sm text-slate-300">{k.label}</dt>
          <dd className="mt-1 text-2xl font-semibold tabular-nums text-fg">{k.value}</dd>
          {k.caption && <dd className="mt-1 text-xs text-slate-400">{k.caption}</dd>}
        </div>
      ))}
    </dl>
  );
}

/* ---------- Tablar: to'liq kenglikdagi 1px chiziqda 2px ko'rsatkich ---------- */
export function Tabs({ items }) {
  return (
    <nav className="mb-6 flex gap-6 overflow-x-auto border-b border-[var(--rule)] [scrollbar-width:none]">
      {items.map(({ to, label, end }) => (
        <NavLink key={to} to={to} end={end} className="shrink-0">
          {({ isActive }) => (
            <span className={`relative block py-3 text-sm font-medium ${isActive ? 'text-fg' : 'text-slate-300 hover:text-fg'}`}>
              {label}
              {isActive && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

/* ---------- Sahifa sarlavhasi (ot, 24px) + "Qanday ishlaydi?" ---------- */
export function PageHead({ title, children, finding, actions, steps = [] }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-xl font-semibold text-fg sm:text-2xl">{title}</h1>
          {children && <p className="mt-1 text-sm leading-relaxed text-slate-300 sm:text-[15px]">{children}</p>}
          {finding && <p className="mt-1 text-sm font-medium leading-relaxed text-fg sm:text-[15px]">{finding}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {steps.length > 0 && (
        <details className="group mt-4">
          <summary className="inline-flex min-h-9 cursor-pointer select-none items-center gap-2 text-sm text-slate-300 transition hover:text-fg">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.5" /><path d="M10 9v4.5M10 6.5h.01" strokeLinecap="round" /></svg>
            Qanday ishlaydi?
            <svg className="h-3.5 w-3.5 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </summary>
          <ul className="mt-2 max-w-2xl space-y-2.5 rounded-[14px] bg-ink-800 p-4 text-[15px] leading-relaxed text-slate-200 sm:p-5">
            {steps.map((t, i) => (
              <li key={i} className="flex gap-3"><span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" /><span>{t}</span></li>
            ))}
          </ul>
        </details>
      )}
    </header>
  );
}

/* Kichik izoh tugmasi: bosilganda matn ochiladi (har bir funksiya yonida) */
export function Info({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block align-middle">
      <button
        type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Izoh"
        className="ml-1.5 grid h-5 w-5 place-items-center rounded-full border border-slate-400 text-xs leading-none text-slate-300 transition hover:border-fg hover:text-fg"
      >i</button>
      {open && <span className="mt-2 block max-w-md rounded-xl bg-ink-700 px-3 py-2 text-[13px] font-normal leading-snug text-fg">{children}</span>}
    </span>
  );
}

/* ---------- Modal / pastdan chiqadigan panel (telefonda bottom sheet) ---------- */
function useBodyLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

export function Modal({ title, onClose, children, wide }) {
  useBodyLock();
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center sm:p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-[var(--backdrop)]" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: 40, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 32, stiffness: 380 }}
        className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-ink-800 shadow-2xl sm:rounded-[20px] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4 sm:px-6">
          <h3 className="text-base font-semibold text-fg">{title}</h3>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-slate-300 transition hover:bg-ink-700 hover:text-fg" aria-label="Yopish">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 sm:px-6 sm:pb-6">{children}</div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/* ---------- Picker: native <select> o'rniga (telefonda muammosiz variant tanlash) ---------- */
export function Picker({ value, onChange, options, placeholder = 'Tanlang…', title, disabled, required, searchable }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 7;

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.label.toLowerCase().includes(s)) : options;
  }, [options, q]);

  const close = () => { setOpen(false); setQ(''); };

  return (
    <div className="relative">
      <button
        type="button" disabled={disabled} onClick={() => setOpen(true)}
        className={`${base} flex items-center justify-between gap-2 text-left ${current ? '' : 'text-slate-500'}`}
      >
        <span className="truncate">{current ? current.label : placeholder}</span>
        <svg className="h-4 w-4 shrink-0 text-slate-300" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {/* Brauzer "to'ldiring" xabarini ko'rsatishi uchun */}
      {required && <input tabIndex={-1} aria-hidden required value={value || ''} onChange={() => {}} className="pointer-events-none absolute inset-0 opacity-0" />}

      <AnimatePresence>
        {open && (
          <Modal title={title || placeholder} onClose={close}>
            {showSearch && (
              <div className="mb-3">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish…" />
              </div>
            )}
            <ul role="listbox" className="-mx-2 space-y-0.5">
              {shown.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button" role="option" aria-selected={active}
                      onClick={() => { onChange(o.value); close(); }}
                      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left transition ${active ? 'bg-ink-700 text-fg' : 'text-slate-200 hover:bg-ink-700/60'}`}
                    >
                      <span>
                        <span className="block text-[15px]">{o.label}</span>
                        {o.hint && <span className="block text-xs text-slate-400">{o.hint}</span>}
                      </span>
                      {active && <svg className="h-4 w-4 text-fg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10.5l4 4 8-9" /></svg>}
                    </button>
                  </li>
                );
              })}
              {!shown.length && <li className="px-3 py-8 text-center text-sm text-slate-400">Hech narsa topilmadi</li>}
            </ul>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Almashtirgich: yoqilgan holat ko'k emas, semantik yashil ---------- */
export function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? 'bg-positive' : 'bg-ink-600'}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}

/* ---------- Rang rejimi: Tizim / Yorug' / Qorong'i ---------- */

const MODES = [['system', 'Tizim', 'device'], ['light', 'Yorug‘', 'sun'], ['dark', 'Qorong‘i', 'moon']];
export function ThemeSwitch() {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Rang rejimi" className="grid grid-cols-3 gap-1 rounded-full bg-ink-700 p-1">
      {MODES.map(([key, label, icon]) => (
        <button
          key={key} type="button" role="radio" aria-checked={pref === key} onClick={() => setPref(key)}
          className="relative flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-medium"
        >
          {pref === key && <motion.span layoutId={`theme-pill-${MODES.length}`} className="absolute inset-0 rounded-full bg-ink-800" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <span className={`relative flex items-center gap-1.5 ${pref === key ? 'text-fg' : 'text-slate-300'}`}><Icon name={icon} size={15} />{label}</span>
        </button>
      ))}
    </div>
  );
}

// Ochiq/qorong'i orasida almashtiradigan kichik tugma (ommaviy sahifalar uchun)
export function ThemeButton() {
  const { theme, setPref } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button" onClick={() => setPref(next)} aria-label={next === 'dark' ? 'Qorong‘i rejimga o‘tish' : 'Yorug‘ rejimga o‘tish'}
      className="grid h-10 w-10 place-items-center rounded-full text-slate-300 transition hover:bg-ink-700 hover:text-fg"
    >
      <motion.span key={theme} initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.25 }} className="grid place-items-center">
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
      </motion.span>
    </button>
  );
}
