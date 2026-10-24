import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { api, upload } from '../api.js';
import { prepareOriginal, useAuthImage } from '../photoUtils.js';
import { Alert, Avatar, Button, Card, Field, Info, Input, LinkButton, Modal, PageHead, Pill, Select } from '../components/ui.jsx';
import CropModal from '../components/CropModal.jsx';

const TOTAL = 4;

const statusOf = (count) => {
  if (count >= TOTAL) return { text: 'To‘liq', tone: 'positive' };
  if (count > 0) return { text: 'To‘liq emas', tone: 'warning' };
  return { text: 'Boshlanmagan', tone: 'neutral' };
};

/* ---------- Bitta rasm joyi ---------- */
function Slot({ n, photo, busy, onPick, onRecrop, onRemove, onOpen }) {
  const src = useAuthImage(photo?.id, photo?.updatedAt, 'thumb');
  const input = useRef(null);
  return (
    <div className="space-y-2">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-[14px] ${photo ? 'bg-ink-900' : 'border border-dashed border-ink-600'}`}>
        {photo && src && (
          <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={`${n}-rasmni kattalashtirish`}>
            <img src={src} alt={`${n}-rasm`} className="h-full w-full object-cover" />
          </button>
        )}
        {photo && !src && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Yuklanmoqda…</div>}
        {!photo && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="absolute inset-0 grid place-items-center text-slate-300 transition hover:bg-ink-700/50 disabled:opacity-50">
            <span className="text-center"><span className="block text-2xl leading-none">+</span><span className="mt-1 block text-sm">{n}-rasm qo‘shish</span></span>
          </button>
        )}
        <span className="pointer-events-none absolute left-2 top-2 grid h-6 min-w-6 place-items-center rounded-full bg-black/75 px-1.5 text-xs text-white">{n}</span>
        {photo && (
          <button type="button" onClick={onRemove} disabled={busy} title="Rasmni o‘chirish" aria-label={`${n}-rasmni o‘chirish`} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/75 text-white transition hover:bg-negative">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 5l10 10M15 5L5 15" /></svg>
          </button>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/75 text-sm text-white">Yuklanmoqda…</div>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
      {photo && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="!px-2 text-[13px]" disabled={busy} onClick={onRecrop} title="Asl rasmdan qaysi qismi ko‘rinishini o‘zgartirish">Kesish</Button>
          <Button variant="ghost" className="!px-2 text-[13px]" disabled={busy} onClick={() => input.current?.click()} title="Boshqa rasm bilan almashtirish">Almashtirish</Button>
        </div>
      )}
    </div>
  );
}

function BigImage({ photo, onClose, title }) {
  const src = useAuthImage(photo.id, photo.updatedAt, 'full');
  return (
    <Modal title={title} onClose={onClose} wide>
      {src ? <img src={src} alt={title} className="w-full rounded-[14px]" /> : <p className="py-10 text-center text-slate-400">Yuklanmoqda…</p>}
    </Modal>
  );
}

/* ---------- Talaba ma'lumotlari: tyutor xonadonga borishi uchun ---------- */
function StudentInfo({ student }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(student.location); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* nusxalash qo'llab-quvvatlanmasa */ }
  };
  return (
    <div className="mb-5 rounded-[14px] bg-ink-700 p-4">
      <div className="flex items-center gap-3">
        <Avatar name={student.fullName} size={44} />
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold text-white">{student.fullName}</div>
          <div className="text-sm text-slate-300">{student.groupIndex}{student.phone ? ` · ${student.phone}` : ''}</div>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 text-[15px]">
        <div><dt className="text-[13px] text-slate-300">Manzil</dt><dd className="text-white">{student.address || 'Kiritilmagan'}</dd></div>
        <div>
          <dt className="text-[13px] text-slate-300">Lokatsiya</dt>
          <dd className="mt-1.5 flex flex-wrap items-center gap-2">
            {student.location ? (
              <>
                <LinkButton href={student.location} target="_blank" rel="noreferrer">Xaritada ochish</LinkButton>
                <Button variant="ghost" onClick={copy}>{copied ? 'Nusxalandi' : 'Havolani nusxalash'}</Button>
              </>
            ) : <span className="text-warning">Talaba lokatsiya kiritmagan</span>}
          </dd>
        </div>
      </dl>
    </div>
  );
}

/* ---------- Talaba kartochkasi (4 ta joy) ---------- */
function StudentModal({ student, onClose, onChanged }) {
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [big, setBig] = useState(null);
  const [crop, setCrop] = useState(null); // { slot, source, initial, mode }
  const multi = useRef(null);
  const bySlot = Object.fromEntries(student.photos.map((p) => [p.slot, p]));
  const setBusyFor = (slot, v) => setBusy((b) => ({ ...b, [slot]: v }));

  // Asl rasmni (va ixtiyoriy kesim to'rtburchagini) yuboradi; kesimni server asl rasmdan bajaradi
  const put = async (slot, blob, rect) => {
    setBusyFor(slot, true);
    try {
      const fd = new FormData();
      if (rect) fd.append('crop', JSON.stringify(rect));
      fd.append('photo', blob, `${slot}.jpg`);
      await upload(`/admin/students/${student._id}/photos/${slot}`, fd);
      setError('');
    } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
    onChanged();
  };

  // Yangi fayl tanlanganda avval kesish oynasi ochiladi
  const startCrop = async (slot, file) => {
    setError('');
    setBusyFor(slot, true);
    try { setCrop({ slot, source: await prepareOriginal(file), initial: null, mode: 'upload' }); } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
  };

  // Mavjud rasmni qayta kesish: ASL rasm va avvalgi kesim
  const recrop = async (slot) => {
    setBusyFor(slot, true);
    try {
      const blob = await api(`/admin/photos/${bySlot[slot].id}/file?v=original&t=${encodeURIComponent(bySlot[slot].updatedAt)}`, { raw: true });
      setCrop({ slot, source: blob, initial: bySlot[slot].crop, mode: 'recrop' });
    } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
  };

  // Faqat kesimni saqlash (asl rasm qayta yuborilmaydi)
  const saveCrop = async (slot, rect) => {
    setBusyFor(slot, true);
    try {
      await api(`/admin/students/${student._id}/photos/${slot}/crop`, { method: 'PUT', body: rect });
      setError('');
    } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
    onChanged();
  };

  const remove = async (slot) => {
    if (!confirm(`${slot}-rasm o‘chirilsinmi?`)) return;
    setBusyFor(slot, true);
    try { await api(`/admin/students/${student._id}/photos/${slot}`, { method: 'DELETE' }); } catch (e) { setError(e.message); }
    setBusyFor(slot, false);
    onChanged();
  };

  // Ommaviy tanlash: bo'sh joylarga tartib bilan joylanadi, rasm markazdan avtomatik kesiladi (keyin "Kesish" bilan to'g'rilash mumkin)
  const pickMany = async (files) => {
    const free = [1, 2, 3, 4].filter((n) => !bySlot[n]);
    const list = [...files];
    if (list.length > free.length) setError(`Bo‘sh joy ${free.length} ta, ortiqcha ${list.length - free.length} ta rasm olinmadi`);
    for (const [i, slot] of free.slice(0, list.length).entries()) {
      try { await put(slot, await prepareOriginal(list[i])); } catch (e) { setError(e.message); } // eslint-disable-line no-await-in-loop
    }
  };

  const free = TOTAL - student.count;
  const st = statusOf(student.count);
  return (
    <Modal title="Xonadon rasmlari" onClose={onClose} wide>
      <StudentInfo student={student} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-3 text-sm text-slate-200"><span className="tabular-nums text-white">{student.count} / {TOTAL}</span><Pill tone={st.tone}>{st.text}</Pill></span>
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
      <p className="mt-4 text-[13px] leading-relaxed text-slate-300">
        Eshik, oshxona kabi xonadon ichidan olingan 4 ta rasmni yuklang. Yuklashda rasmning qaysi qismi qolishini o‘zingiz tanlaysiz; keyin ham <b className="font-medium text-white">Kesish</b> tugmasi bilan o‘zgartirish mumkin: asl rasm saqlanadi, qirqib tashlangan qismlar ham qaytadi.
      </p>

      {big && <BigImage photo={big} title={student.fullName} onClose={() => setBig(null)} />}
      <AnimatePresence>
        {crop && (
          <CropModal
            key={crop.slot} source={crop.source} initial={crop.initial} title={`${crop.slot}-rasmni kesish`}
            onCancel={() => setCrop(null)}
            onDone={(rect) => {
              const { slot, source, mode } = crop;
              setCrop(null);
              if (mode === 'upload') put(slot, source, rect);
              else saveCrop(slot, rect);
            }}
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
    <Card className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Word hisobot <Info>Titul sahifa, har talaba uchun bitta sahifa (2×2 rasm va manzil) va oxirida Yashil/Sariq/Qizil jadvali bilan .docx fayl yig‘iladi. Guruh tanlangan bo‘lsa, faqat shu guruh uchun.</Info></h2>
          <p className="text-sm text-slate-300">{groupLabel ? `Guruh: ${groupLabel}` : 'Barcha guruhlar'}</p>
        </div>
        <Button onClick={download} disabled={busy || !pre?.pages}>{busy ? 'Tayyorlanmoqda…' : 'Hisobotni yuklab olish'}</Button>
      </div>
      {pre && (
        <div className="mt-3 space-y-2 text-[15px]">
          <p className="text-slate-200">
            Ijarada turadigan <b className="font-medium text-white">{pre.students}</b> talabadan <b className="font-medium text-positive">{pre.complete}</b> tasida 4 ta rasm bor,
            {' '}<b className={`font-medium ${pre.incomplete.length ? 'text-warning' : 'text-positive'}`}>{pre.incomplete.length}</b> tasida yetishmaydi. Hisobot {pre.pages} sahifa.
          </p>
          {pre.incomplete.length > 0 && (
            <>
              <button type="button" onClick={() => setShowList(!showList)} className="min-h-9 text-sm text-slate-200 underline underline-offset-4 hover:text-white">{showList ? 'Yopish' : 'Kimlarda yo‘qligini ko‘rish'}</button>
              {showList && (
                <ul className="max-h-48 overflow-y-auto rounded-[14px] bg-ink-700 px-4 py-1">
                  {pre.incomplete.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3 border-b border-[var(--rule)] py-2 text-sm last:border-0"><span className="text-white">{s.fullName} <span className="text-slate-400">{s.groupIndex}</span></span><span className="tabular-nums text-warning">{s.count} / {TOTAL}</span></li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-sm text-slate-200">
                <label className="flex min-h-9 items-center gap-2"><input type="radio" name="missing" checked={mode === 'placeholder'} onChange={() => setMode('placeholder')} className="accent-white" />Yetishmaganlarni "Rasm yo‘q" bilan chiqarish</label>
                <label className="flex min-h-9 items-center gap-2"><input type="radio" name="missing" checked={mode === 'skip'} onChange={() => setMode('skip')} className="accent-white" />O‘tkazib yuborish</label>
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
  const lacking = rows.filter((r) => r.count < TOTAL).length;

  return (
    <div>
      <PageHead
        title="Rasmlar"
        finding={rows.length ? (lacking ? `${lacking} ta talabaning xonadon rasmlari hali to‘liq emas.` : 'Hamma talabaning 4 ta rasmi bor.') : undefined}
        steps={[
          'Ro‘yxatda faqat formani to‘ldirgan talabalar ko‘rinadi. Qatorga bossangiz, talabaning manzili, lokatsiyasi va 4 ta rasm joyi ochiladi.',
          'Har bir joyga rasm tanlang: avval kesish oynasi ochiladi, rasmni sudrab va kattalashtirib kerakli qismini belgilang, so‘ng "Saqlash".',
          'Yuklangan rasmni "Kesish" tugmasi bilan qayta kesish (asl rasm saqlanadi), "Almashtirish" bilan boshqasiga o‘zgartirish, × bilan o‘chirish mumkin.',
          'Bir nechta rasmni birdan yuklash uchun "Bir nechta rasm tanlash"ni bosing: ular bo‘sh joylarga markazdan kesilib joylanadi.',
          'Pastdagi "Word hisobot" bo‘limi barcha rasmlarni tayyor .docx hisobotga yig‘adi.',
        ]}
      >
        Tyutor talaba xonadonida olgan 4 ta rasmni shu yerda yuklaydi.
      </PageHead>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44"><Field label="Guruh"><Select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barchasi</option>{groups.map((g) => <option key={g._id} value={g._id}>{g.index}</option>)}</Select></Field></div>
        <div className="min-w-48 max-w-sm flex-1"><Field label="Talaba qidirish"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism bo‘yicha…" /></Field></div>
        <p className="ml-auto pb-2.5 text-sm text-slate-300">{shown.length} ta talaba</p>
      </div>
      <Alert>{error}</Alert>

      <div>
        {shown.map((r) => {
          const st = statusOf(r.count);
          return (
            <button key={r._id} type="button" onClick={() => setOpenId(r._id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--rule)] py-3 text-left transition hover:bg-ink-800 md:min-h-[72px] md:flex-nowrap">
              <Avatar name={r.fullName} size={40} />
              <span className="min-w-0 basis-[calc(100%-3.5rem)] md:flex-1 md:basis-0">
                <span className="block font-medium text-white md:truncate">{r.fullName}</span>
                <span className="block text-[13px] text-slate-300 md:truncate">{r.groupIndex}{r.address ? ` · ${r.address}` : ''}</span>
              </span>
              <span className="ml-14 flex items-center gap-1 md:ml-0" aria-hidden>
                {[1, 2, 3, 4].map((n) => <span key={n} className={`h-1.5 w-6 rounded-full ${r.photos.some((p) => p.slot === n) ? 'bg-accent' : 'bg-ink-700'}`} />)}
              </span>
              <span className="w-12 text-right text-sm tabular-nums text-slate-200">{r.count} / {TOTAL}</span>
              <span className="md:w-28 md:text-right"><Pill tone={st.tone}>{st.text}</Pill></span>
            </button>
          );
        })}
        {!shown.length && <p className="rounded-[14px] border border-dashed border-ink-600 px-4 py-8 text-center text-sm text-slate-400">Formani to‘ldirgan talaba topilmadi.</p>}
      </div>

      <ReportPanel group={group} groupLabel={groupLabel} version={version} />

      {opened && <StudentModal student={opened} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
