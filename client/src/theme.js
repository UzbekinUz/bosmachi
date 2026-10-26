import { useCallback, useEffect, useState } from 'react';

const KEY = 'hygge_theme';
const GROUND = { light: '#f2f4f7', dark: '#0c0d0f' };

const read = () => { try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; } };
const systemDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
export const resolveTheme = (pref) => (pref === 'dark' || (pref === 'system' && systemDark()) ? 'dark' : 'light');

// Rejimni sahifaga qo'llaydi; almashganda yumshoq o'tish yoqiladi
export function applyTheme(pref, animate = true) {
  const root = document.documentElement;
  const theme = resolveTheme(pref);
  if (animate) {
    root.classList.add('theme-anim');
    setTimeout(() => root.classList.remove('theme-anim'), 300);
  }
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-pref', pref);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', GROUND[theme]);
}

// pref: 'system' | 'light' | 'dark'
export function useTheme() {
  const [pref, setPrefState] = useState(read);
  const [theme, setTheme] = useState(() => resolveTheme(read()));

  const setPref = useCallback((p) => {
    try { localStorage.setItem(KEY, p); } catch { /* xotira yopiq */ }
    setPrefState(p);
    applyTheme(p);
    setTheme(resolveTheme(p));
  }, []);

  // "Tizim" tanlangan bo'lsa, qurilma rejimi o'zgarganda ergashadi
  useEffect(() => {
    if (pref !== 'system' || typeof matchMedia !== 'function') return undefined;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => { applyTheme('system'); setTheme(resolveTheme('system')); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [pref]);

  return { pref, theme, setPref };
}
