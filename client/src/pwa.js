import { useCallback, useEffect, useState } from 'react';

// Xizmat ishchisini ro'yxatdan o'tkazadi (faqat production'da). Yangi versiya chiqsa, ilova buni xabar qiladi.
export function registerSW() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const notify = (worker) => window.dispatchEvent(new CustomEvent('sw-update', { detail: worker }));
      if (reg.waiting && navigator.serviceWorker.controller) notify(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) notify(w);
        });
      });
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  });
}

export function useUpdate() {
  const [worker, setWorker] = useState(null);
  useEffect(() => {
    const on = (e) => setWorker(e.detail);
    window.addEventListener('sw-update', on);
    return () => window.removeEventListener('sw-update', on);
  }, []);
  return { ready: !!worker, apply: () => worker?.postMessage('SKIP_WAITING') };
}

// Internet bor-yo'qligi
export function useOnline() {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);
  return online;
}

// Ilovani o'rnatish: hodisa sahifa yuklanishi bilanoq ushlab qo'yiladi (komponent hali yo'q bo'lishi mumkin)
let deferred = null;
const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener('appinstalled', () => { deferred = null; emit(); });
}
const standalone = () => matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    subs.add(fn);
    return () => subs.delete(fn);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return false;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    emit();
    return outcome === 'accepted';
  }, []);

  const installed = standalone();
  return { canInstall: !installed && !!deferred, needsIosHelp: !installed && isIos() && !deferred, installed, install };
}

// "Keyinroq" bosilsa, 7 kun taklif qilinmaydi
const DISMISS_KEY = 'hygge_install_dismissed';
const WEEK = 7 * 24 * 3600 * 1000;
export const installDismissed = () => { try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < WEEK; } catch { return false; } };
export const dismissInstall = () => { try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* xotira yopiq */ } };
