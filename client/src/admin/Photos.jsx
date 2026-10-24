import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { api, upload } from '../api.js';
import { compressImage, useAuthImage } from '../photoUtils.js';
import { Alert, Button, Card, Field, Info, Input, Modal, PageHead, Select } from '../components/ui.jsx';
import CropModal from '../components/CropModal.jsx';

const TOTAL = 4;

const statusOf = (count) => {
  if (count >= TOTAL) return { text: 'To‘liq', cls: 'bg-emerald-500/15 text-emerald-300' };
  if (count > 0) return { text: 'To‘liq emas', cls: 'bg-amber-500/15 text-amber-300' };
  return { text: 'Boshlanmagan', cls: 'bg-ink-700 text-slate-300' };
};

/* ---------- Bitta rasm joyi ---------- */
function Slot({ n, photo, busy, onPick, onRecrop, onRemove, onOpen }) {
  const src = useAuthImage(photo?.id, photo?.updatedAt, 'thumb');
  const input = useRef(null);
  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-ink-600 bg-ink-900">
        {photo && src && (
          <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={`${n}-rasmni kattalashtirish`}>
            <img src={src} alt={`${n}-rasm`} className="h-full w-full object-cover" />
          </button>
        )}
        {photo && !src && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Yuklanmoqda…</div>}
        {!photo && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="absolute inset-0 grid place-items-center text-slate-300 transition hover:bg-ink-800 disabled:opacity-50">
            <span className="text-center"><span className="block text-3xl leading-none">+</span><span className="mt-1 block text-sm">{n}-rasm qo‘shish</span></span>
          </button>
        )}
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/70 px-1.5 text-xs text-white">{n}</span>
        {photo && (
          <button type="button" onClick={onRemove} disabled={busy} title="Rasmni o‘chirish" aria-label={`${n}-rasmni o‘chirish`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded bg-black/70 text-sm text-red-300 transition hover:bg-red-600 hover:text-white">✕</button>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/70 text-sm text-white">Yuklanmoqda…</div>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
      {photo && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="!min-h-10 !px-2 text-[13px]" disabled={busy} onClick={onRecrop} title="Rasmning qaysi qismi ko‘rinishini o‘zgartirish">Kesish</Button>
          <Button variant="ghost" className="!min-h-10 !px-2 text-[13px]" disabled={busy} onClick={() => input.current?.click()} title="Boshqa rasm bilan almashtirish">Almashtirish</Button>
        </div>
      )}
    </div>
  );
}

function BigImage({ photo, onClose, title }) {
  const src = useAuthImage(photo.id, photo.updatedAt, 'full');
  return (
    <Modal title={title} onClose={onClose} wide>
      {src ? <img src={src} alt={title} className="w-full rounded-lg" /> : <p className="py-10 text-center text-slate-400">Yuklanmoqda…</p>}
    </Modal>
  );
}

/* ---------- Talaba ma'lumotlari: tyutor xonadonga borishi uchun ---------- */
function StudentInfo({ student }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(student.location); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* nusxalash qo'llab-quvvatlanmasa */ }
  };
  const rows = [
    ['Talaba', student.fullName],
    ['Guruh', student.groupIndex],
    ['Manzil', student.address || 'Kiritilmagan'],
    ['Telefon', student.phone || '—'],
  ];
  return (
    <dl className="mb-4 grid gap-x-6 gap-y-3 rounded-lg bg-ink-900 p-4 text-[15px] sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className={k === 'Manzil' ? 'sm:col-span-2' : ''}>
          <dt className="text-[13px] text-slate-400">{k}</dt>
          <dd className="font-medium text-white">{v}</dd>
        </div>
      ))}
      <div className="sm:col-span-2">
        <dt className="text-[13px] text-slate-400">Lokatsiya</dt>
        <dd className="mt-1 flex flex-wrap items-center gap-2">
          {student.location ? (
            <>
              <a href={student.location} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-500">Xaritada ochish ↗</a>
              <button type="button" onClick={copy} className="min-h-10 rounded-lg border border-ink-600 px-4 text-sm text-slate-100 hover:bg-ink-700">{copied ? 'Nusxalandi ✓' : 'Havolani nusxalash'}</button>
            </>
          ) : <span className="text-amber-300">Talaba lokatsiya kiritmagan</span>}
        </dd>
      </div>
    </dl>
  );
}

/* ---------- Talaba kartochkasi (4 ta joy) ---------- */
function StudentModal({ student, onClose, onChanged }) {
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [big, setBig] = useState(null);
  const [crop, setCrop] = useState(null); // { slot, source }
  const multi = useRef(null);
  const bySlot = Object.fromEntries(student.photos.map((p) => [p.slot, p]));
  const setBusyFor = (slot, v) => setBusy((b) => ({ ...b, [slot]: v }));

  // Tayyor (kesilgan) rasmni yuboradi
  const put = async (slot, blob) => {
    setBusyFor(slot, true);
    try {
      const fd = new FormData();
      fd.append('photo', blob, `${slot}.jpg`);
      await upload(`/admin/students/${student._id}/photos/${slot}`, fd);
      setError('');
    } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
    onChanged();
  };

  // Yangi fayl tanlanganda avval kesish oynasi ochiladi
  const startCrop = (slot, source) => { setError(''); setCrop({ slot, source }); };

  // Mavjud rasmni qayta kesish: to'liq nusxani olib kesish oynasiga beramiz
  const recrop = async (slot) => {
    setBusyFor(slot, true);
    try {
      const blob = await api(`/admin/photos/${bySlot[slot].id}/file?v=full`, { raw: true });
      setCrop({ slot, source: blob });
    } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
  };

  const remove = async (slot) => {
    if (!confirm(`${slot}-rasm o‘chirilsinmi?`)) return;
    setBusyFor(slot, true);
    try { await api(`/admin/students/${student._id}/photos/${slot}`, { method: 'DELETE' }); } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
    onChanged();
  };

  // Ommaviy tanlash: bo'sh joylarga tartib bilan joylanadi, rasm markazidan avtomatik kesiladi (keyin "Kesish" bilan to'g'rilash mumkin)
  const pickMany = async (files) => {
    const free = [1, 2, 3, 4].filter((n) => !bySlot[n]);
    const list = [...files];
    if (list.length > free.length) setError(`Bo‘sh joy ${free.length} ta, ortiqcha ${list.length - free.length} ta rasm olinmadi`);
    for (const [i, slot] of free.slice(0, list.length).entries()) {
      try { await put(slot, await compressImage(list[i])); } catch (e) { setError(e.message); } // eslint-disable-line no-await-in-loop
    }
  };

  const free = TOTAL - student.count;
  return (
    <Modal title={`${student.fullName} · ${student.groupIndex}`} onClose={onClose} wide>
      <StudentInfo student={student} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-sm ${statusOf(student.count).cls}`}>{student.count}/{TOTAL} · {statusOf(student.count).text}</span>
        <Button variant="ghost" disabled={!free} onClick={() => multi.current?.click()} title="Bir vaqtda bir nechta rasm tanlash: bo‘sh joylarga ketma-ket joylanadi">Bir nechta rasm tanlash</Button>
        <input ref={multi} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) pickMany(f); }} />
      </div>
      <Alert>{error}</Alert>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((n) => (
          <Slot
            key={n} n={n} photo={bySlot[n]} busy={!!busy[n]}
            onPick={(f) => startCrop(n, f)} onRecrop={() => recrop(n)} onRemove={() => remove(n)} onOpen={() => setBig(bySlot[n])}
          />
        ))}
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-slate-400">
        Eshik, oshxona kabi xonadon ichidan olingan 4 ta rasmni yuklang. Yuklashda rasmning qaysi qismi qolishini o‘zingiz tanlaysiz; keyin ham <b className="text-slate-200">Kesish</b> tugmasi bilan o‘zgartirish mumkin.
      </p>

      {big && <BigImage photo={big} title={student.fullName} onClose={() => setBig(null)} />}
      <AnimatePresence>
        {crop && (
          <CropModal
            key={crop.slot} source={crop.source} title={`${crop.slot}-rasmni kesish`}
            onCancel={() => setCrop(null)}
            onDone={(blob) => { const slot = crop.slot; setCrop(null); put(slot, blob); }}
          />
        )}
      </AnimatePresence>
    </Modal>
  );
}

/* ---------- Word hisobot paneli ---------- */
function ReportPanel({ group, groupLabel, version }) {
  const [pre, setPre] = useState(null);
  const [mode, setMode] = useState('placeholder');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    let alive = true;
    api(`/admin/report/preview${group ? `?group=${group}` : ''}`).then((r) => alive && setPre(r)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [group, version]);

  const download = async () => {
    setBusy(true); setError('');
    try {
      const blob = await api(`/admin/report?missing=${mode}${group ? `&group=${group}` : ''}`, { raw: true });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `hisobot-${groupLabel || 'hammasi'}.docx` });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Word hisobot <Info>Titul sahifa, har talaba uchun bitta sahifa (2×2 rasm va manzil) va oxirida Yashil/Sariq/Qizil jadvali bilan .docx fayl yig‘iladi. Guruh tanlangan bo‘lsa, faqat shu guruh uchun.</Info></h2>
          <p className="text-sm text-slate-300">{groupLabel ? `Guruh: ${groupLabel}` : 'Barcha guruhlar'}</p>
        </div>
        <Button onClick={download} disabled={busy || !pre?.pages}>{busy ? 'Tayyorlanmoqda…' : '⬇ Hisobotni yuklab olish'}</Button>
      </div>
      {pre && (
        <div className="space-y-2 text-[15px]">
          <p className="text-slate-200">
            Ijarada turadigan <b className="text-white">{pre.students}</b> talabadan <b className="text-emerald-300">{pre.complete}</b> tasida 4 ta rasm bor,
            {' '}<b className={pre.incomplete.length ? 'text-amber-300' : 'text-emerald-300'}>{pre.incomplete.length}</b> tasida yetishmaydi. Hisobot {pre.pages} sahifa.
          </p>
          {pre.incomplete.length > 0 && (
            <>
              <button type="button" onClick={() => setShowList(!showList)} className="text-brand-400 hover:underline">{showList ? 'Yopish' : 'Kimlarda yo‘qligini ko‘rish'}</button>
              {showList && (
                <ul className="max-h-48 divide-y divide-ink-700 overflow-y-auto rounded-lg border border-ink-700">
                  {pre.incomplete.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3 px-3 py-2"><span>{s.fullName} <span className="text-blue-300">{s.groupIndex}</span></span><span className="text-amber-300">{s.count}/{TOTAL}</span></li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-slate-200">
                <label className="flex min-h-9 items-center gap-2"><input type="radio" name="missing" checked={mode === 'placeholder'} onChange={() => setMode('placeholder')} className="accent-blue-500" />Yetishmaganlarni "Rasm yo‘q" bilan chiqarish</label>
                <label className="flex min-h-9 items-center gap-2"><input type="radio" name="missing" checked={mode === 'skip'} onChange={() => setMode('skip')} className="accent-blue-500" />O‘tkazib yuborish</label>
              </div>
            </>
          )}
        </div>
      )}
      <Alert>{error}</Alert>
    </Card>
  );
}

/* ---------- Sahifa ---------- */
export default function Photos() {
  const [groups, setGroups] = useState([]);
  const [group, setGroup] = useState('');
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');

  const load = () => api(`/admin/photos/summary${group ? `?group=${group}` : ''}`)
    .then((r) => { setRows(r); setVersion((v) => v + 1); })
    .catch((e) => setError(e.message));
  useEffect(() => { load(); }, [group]); // eslint-disable-line
  useEffect(() => { api('/admin/groups').then(setGroups).catch(() => {}); }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => r.fullName.toLowerCase().includes(s)) : rows;
  }, [rows, q]);
  const opened = rows.find((r) => r._id === openId);
  const groupLabel = groups.find((g) => g._id === group)?.index || '';

  return (
    <div className="space-y-5">
      <PageHead
        title="Rasmlar"
        steps={[
          'Ro‘yxatda faqat formani to‘ldirgan talabalar ko‘rinadi. Qatorga bossangiz, talabaning manzili, lokatsiyasi va 4 ta rasm joyi ochiladi.',
          'Har bir joyga rasm tanlang: avval kesish oynasi ochiladi, rasmni sudrab va kattalashtirib kerakli qismini belgilang, so‘ng "Saqlash".',
          'Yuklangan rasmni "Kesish" tugmasi bilan qayta kesish, "Almashtirish" bilan boshqasiga o‘zgartirish, ✕ bilan o‘chirish mumkin.',
          'Bir nechta rasmni birdan yuklash uchun "Bir nechta rasm tanlash"ni bosing: ular bo‘sh joylarga markazdan kesilib joylanadi.',
          'Pastdagi "Word hisobot" bo‘limi barcha rasmlarni tayyor .docx hisobotga yig‘adi.',
        ]}
      >
        Tyutor talaba xonadonida olgan 4 ta rasmni shu yerda yuklaydi. Rasmlar serverdagi <code className="text-brand-400">server/data/photos</code> papkasida, Excel fayli yonida saqlanadi.
      </PageHead>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44"><Field label="Guruh"><Select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barchasi</option>{groups.map((g) => <option key={g._id} value={g._id}>{g.index}</option>)}</Select></Field></div>
        <div className="min-w-48 flex-1"><Field label="Talaba qidirish"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism bo‘yicha…" /></Field></div>
      </div>
      <Alert>{error}</Alert>

      <Card className="divide-y divide-ink-700 !p-0">
        {shown.map((r) => {
          const st = statusOf(r.count);
          return (
            <button key={r._id} type="button" onClick={() => setOpenId(r._id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left transition hover:bg-ink-700/60">
              <span className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <span className="block font-medium text-white sm:truncate">{r.fullName}</span>
                <span className="block text-sm text-slate-300 sm:truncate"><span className="text-blue-300">{r.groupIndex}</span>{r.address ? ` · ${r.address}` : ''}</span>
              </span>
              <span className="flex items-center gap-1" aria-hidden>
                {[1, 2, 3, 4].map((n) => <span key={n} className={`h-2 w-5 rounded-full ${r.photos.some((p) => p.slot === n) ? 'bg-brand-500' : 'bg-ink-700'}`} />)}
              </span>
              <span className="w-10 text-right text-sm font-semibold text-slate-100">{r.count}/{TOTAL}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${st.cls}`}>{st.text}</span>
            </button>
          );
        })}
        {!shown.length && <p className="px-4 py-10 text-center text-slate-400">Formani to‘ldirgan talaba topilmadi</p>}
      </Card>

      <ReportPanel group={group} groupLabel={groupLabel} version={version} />

      {opened && <StudentModal student={opened} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
