import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

/* ---------- Motion yordamchilari ---------- */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } };

export const Stagger = ({ as = 'div', ...props }) => {
  const Tag = motion[as];
  return <Tag variants={container} initial="hidden" animate="show" {...props} />;
};
export const Item = ({ as = 'div', ...props }) => {
  const Tag = motion[as];
  return <Tag variants={item} {...props} />;
};

/* ---------- Maydonlar ---------- */
const base = 'h-12 w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 text-base text-slate-100 placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 sm:h-11 sm:text-sm';

export function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}{required && <span className="ml-0.5 text-brand-400">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] leading-snug text-slate-400">{hint}</span>}
    </label>
  );
}

export const Input = (props) => <input {...props} className={`${base} ${props.className || ''}`} />;

// Oddiy (native) select — admin jadvallarida ishlatiladi
export function Select({ children, ...props }) {
  return <select {...props} className={`${base} ${props.className || ''}`}>{children}</select>;
}

export function Button({ variant = 'primary', className = '', disabled, ...props }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-500',
    ghost: 'border border-ink-600 text-slate-100 hover:bg-ink-700',
    danger: 'border border-red-500/40 text-red-300 hover:bg-red-500/10',
  };
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.97 }}
      disabled={disabled}
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    />
  );
}

export const Card = ({ className = '', ...props }) => (
  <div {...props} className={`rounded-lg bg-ink-800 p-4 sm:p-6 ${className}`} />
);

export function Alert({ type = 'error', children }) {
  return (
    <AnimatePresence initial={false}>
      {children && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${type === 'error' ? 'border-red-500/40 bg-red-500/10 text-red-200' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'}`}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Logo({ size = 'text-2xl', inverse = false }) {
  return (
    <div className={`flex items-center gap-2.5 font-serif font-semibold tracking-tight text-white ${size}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-lg font-sans text-base font-bold ${inverse ? 'bg-white text-brand-600' : 'bg-brand-600 text-white'}`}>B</span>
      Bosmachi
    </div>
  );
}

/* Ijara holati: Yashil / Sariq / Qizil rangli nuqta */
export function StatusDot({ value }) {
  const color = { yashil: 'bg-emerald-400', sariq: 'bg-amber-400', qizil: 'bg-red-400' }[String(value || '').toLowerCase()] || 'bg-slate-600';
  return <span title={value || 'Belgilanmagan'} className={`h-3 w-3 shrink-0 rounded-full ${color}`} />;
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
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
    >
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        initial={{ y: 60, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className={`relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-ink-600 bg-ink-900 shadow-2xl sm:rounded-xl ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
      >
        <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3.5">
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-ink-700 hover:text-white" aria-label="Yopish">✕</button>
        </div>
        <div className="overflow-y-auto overscroll-contain p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
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
        <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {/* Brauzer "to'ldiring" xabarini ko'rsatishi uchun */}
      {required && <input tabIndex={-1} aria-hidden required value={value || ''} onChange={() => {}} className="pointer-events-none absolute inset-0 opacity-0" />}

      <AnimatePresence>
        {open && (
          <Modal title={title || placeholder} onClose={close}>
            {showSearch && (
              <div className="-mt-1 mb-3">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish…" />
              </div>
            )}
            <ul role="listbox" className="-mx-1 space-y-0.5">
              {shown.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button" role="option" aria-selected={active}
                      onClick={() => { onChange(o.value); close(); }}
                      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition ${active ? 'bg-brand-600/20 text-white' : 'text-slate-200 hover:bg-ink-700/70 active:bg-ink-700'}`}
                    >
                      <span>
                        <span className="block text-[15px]">{o.label}</span>
                        {o.hint && <span className="block text-xs text-slate-400">{o.hint}</span>}
                      </span>
                      {active && <span className="text-brand-400">✓</span>}
                    </button>
                  </li>
                );
              })}
              {!shown.length && <li className="px-3 py-8 text-center text-sm text-slate-500">Hech narsa topilmadi</li>}
            </ul>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Sahifa sarlavhasi + "Qanday ishlaydi?" yordami ---------- */
export function PageHead({ title, children, steps = [] }) {
  return (
    <header className="mb-6 max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
      {children && <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">{children}</p>}
      {steps.length > 0 && (
        <details className="group mt-3">
          <summary className="inline-flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-lg bg-ink-800 px-3 text-sm text-slate-100 transition hover:bg-ink-700">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-ink-600 text-xs leading-none text-white">i</span>
            Qanday ishlaydi?
            <svg className="h-3.5 w-3.5 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </summary>
          <ul className="mt-3 space-y-2.5 rounded-lg bg-ink-800 p-4 text-[15px] leading-relaxed text-slate-100 sm:p-5">
            {steps.map((t, i) => (
              <li key={i} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" /><span>{t}</span></li>
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
        className="ml-1.5 grid h-5 w-5 place-items-center rounded-full border border-slate-500 text-xs leading-none text-slate-300 transition hover:border-brand-400 hover:text-brand-400"
      >i</button>
      {open && <span className="mt-1.5 block max-w-md rounded-lg bg-ink-700 px-3 py-2 text-[13px] font-normal leading-snug text-slate-100">{children}</span>}
    </span>
  );
}
