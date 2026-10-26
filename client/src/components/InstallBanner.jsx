import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { dismissInstall, installDismissed, useInstall } from '../pwa.js';
import { Button, Modal } from './ui.jsx';
import { Mark } from './ui.jsx';

// iPhone: o'rnatish tizim so'roviga ega emas, shuning uchun qadamlar ko'rsatiladi
export function IosHelp({ onClose }) {
  return (
    <Modal title="Ilovani o‘rnatish" onClose={onClose}>
      <ol className="space-y-3 text-[15px] leading-relaxed text-slate-200">
        <li>1. Safari brauzerida pastdagi <b className="font-semibold text-fg">Ulashish</b> tugmasini bosing.</li>
        <li>2. <b className="font-semibold text-fg">Bosh ekranga qo‘shish</b> ni tanlang.</li>
        <li>3. <b className="font-semibold text-fg">Qo‘shish</b> ni bosing. Hygge ilova sifatida ochiladi.</li>
      </ol>
      <div className="mt-5 flex justify-end"><Button onClick={onClose}>Tushunarli</Button></div>
    </Modal>
  );
}

// Saytga kirganda ilovani o'rnatishni taklif qiladi (o'rnatilgan bo'lsa yoki yaqinda rad etilgan bo'lsa ko'rinmaydi)
export default function InstallBanner({ lifted = false }) {
  const pwa = useInstall();
  const [shown, setShown] = useState(false);
  const [ios, setIos] = useState(false);
  const available = pwa.canInstall || pwa.needsIosHelp;

  useEffect(() => {
    if (!available || installDismissed()) return undefined;
    const t = setTimeout(() => setShown(true), 2500);
    return () => clearTimeout(t);
  }, [available]);

  const later = () => { dismissInstall(); setShown(false); };
  const go = async () => {
    if (pwa.needsIosHelp) { setShown(false); setIos(true); return; }
    const ok = await pwa.install();
    if (ok) setShown(false); else later();
  };

  return (
    <>
      <AnimatePresence>
        {shown && available && (
          <motion.aside
            role="complementary" aria-label="Ilovani o‘rnatish"
            initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 28, opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 340 }}
            className={`fixed inset-x-4 z-40 mx-auto max-w-md rounded-[20px] bg-ink-700 p-4 shadow-2xl ring-1 ring-[var(--rule)] sm:inset-x-auto sm:right-6 sm:mx-0 sm:w-[22rem] ${lifted ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-6' : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6'}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0"><Mark size={34} /></div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-fg">Hygge ilovasini o‘rnating</h2>
                <p className="mt-0.5 text-sm leading-snug text-slate-300">Telefon yoki kompyuter ekranidan bir bosishda oching: to‘liq ekranda, tezroq va aloqa uzilsa ham ochiladi.</p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" onClick={later}>Keyinroq</Button>
              <Button onClick={go}>{pwa.needsIosHelp ? 'Qanday o‘rnatiladi?' : 'Yuklab olish'}</Button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
      <AnimatePresence>{ios && <IosHelp onClose={() => setIos(false)} />}</AnimatePresence>
    </>
  );
}
