import { useEffect, useMemo, useRef, useState } from 'react';
import { api, upload } from '../api.js';
import { compressImage, useAuthImage } from '../photoUtils.js';
import { Alert, Button, Card, Field, Input, Modal, Select } from '../components/ui.jsx';

const TOTAL = 4;

const statusOf = (count) => {
  if (count >= TOTAL) return { text: 'To‘liq', cls: 'bg-emerald-500/15 text-emerald-300' };
  if (count > 0) return { text: 'To‘liq emas', cls: 'bg-amber-500/15 text-amber-300' };
  return { text: 'Boshlanmagan', cls: 'bg-ink-700 text-slate-400' };
};

/* ---------- Bitta rasm joyi ---------- */
function Slot({ n, photo, busy, onPick, onRemove, onOpen }) {
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
        {photo && !src && <div className="absolute inset-0 grid place-items-center text-sm text-slate-500">Yuklanmoqda…</div>}
        {!photo && (
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="absolute inset-0 grid place-items-center text-slate-400 transition hover:bg-ink-800 disabled:opacity-50">
            <span className="text-center"><span className="block text-3xl leading-none">+</span><span className="text-sm">{n}-rasm</span></span>
          </button>
        )}
        <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 text-xs text-white">{n}</span>
        {busy && <div className="absolute inset-0 grid place-items-center bg-black/60 text-sm text-white">Yuklanmoqda…</div>}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPick(f); }} />
      {photo && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" className="!min-h-10 !px-2" disabled={busy} onClick={() => input.current?.click()}>Almashtirish</Button>
          <Button variant="danger" className="!min-h-10 !px-2" disabled={busy} onClick={onRemove}>O‘chirish</Button>
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

/* ---------- Talaba kartochkasi (4 ta joy) ---------- */
function StudentModal({ student, onClose, onChanged }) {
  const [busy, setBusy] = useState({});
  const [error, setError] = useState('');
  const [big, setBig] = useState(null);
  const multi = useRef(null);
  const bySlot = Object.fromEntries(student.photos.map((p) => [p.slot, p]));

  const send = async (slot, file) => {
    setBusy((b) => ({ ...b, [slot]: true }));
    try {
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append('photo', blob, `${slot}.jpg`);
      await upload(`/admin/students/${student._id}/photos/${slot}`, fd);
      setError('');
    } catch (e) { setError(e.message); }
    setBusy((b) => ({ ...b, [slot]: false }));
  };

  const pick = async (slot, file) => { await send(slot, file); onChanged(); };

  const remove = async (slot) => {
    if (!confirm(`${slot}-rasm o‘chirilsinmi?`)) return;
    setBusy((b) => ({ ...b, [slot]: true }));
    try { await api(`/admin/students/${student._id}/photos/${slot}`, { method: 'DELETE' }); } catch (e) { setError(e.message); }
    setBusy((b) => ({ ...b, [slot]: false }));
    onChanged();
  };

  // Ommaviy tanlash: bo'sh joylarga tartib bilan joylanadi
  const pickMany = async (files) => {
    const free = [1, 2, 3, 4].filter((n) => !bySlot[n]);
    const list = [...files];
    if (list.length > free.length) setError(`Bo‘sh joy ${free.length} ta, ortiqcha ${list.length - free.length} ta rasm olinmadi`);
    for (const [i, slot] of free.slice(0, list.length).entries()) await send(slot, list[i]); // eslint-disable-line no-await-in-loop
    onChanged();
  };

  const free = TOTAL - student.count;
  return (
    <Modal title={`${student.fullName} · ${student.groupIndex}`} onClose={onClose} wide>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full px-3 py-1 text-sm ${statusOf(student.count).cls}`}>{student.count}/{TOTAL} · {statusOf(student.count).text}</span>
        <Button variant="ghost" disabled={!free} onClick={() => multi.current?.click()}>Bir nechta rasm tanlash</Button>
        <input ref={multi} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = [...e.target.files]; e.target.value = ''; if (f.length) pickMany(f); }} />
      </div>
      <Alert>{error}</Alert>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((n) => (
          <Slot key={n} n={n} photo={bySlot[n]} busy={!!busy[n]} onPick={(f) => pick(n, f)} onRemove={() => remove(n)} onOpen={() => setBig(bySlot[n])} />
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-400">Rasm avtomatik 4:3 nisbatga keltiriladi va siqiladi. Eshik, oshxona kabi xonadon ichidan olingan rasmlarni yuklang.</p>
      {big && <BigImage photo={big} title={`${student.fullName}`} onClose={() => setBig(null)} />}
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
          <h3 className="font-semibold text-white">Word hisobot (.docx)</h3>
          <p className="text-sm text-slate-400">{groupLabel ? `Guruh: ${groupLabel}` : 'Barcha guruhlar'}</p>
        </div>
        <Button onClick={download} disabled={busy || !pre?.pages}>{busy ? 'Tayyorlanmoqda…' : '⬇ Hisobotni yuklab olish'}</Button>
      </div>
      {pre && (
        <div className="space-y-2 text-sm">
          <p className="text-slate-300">
            Ijarada turadigan <b className="text-white">{pre.students}</b> talabadan <b className="text-emerald-300">{pre.complete}</b> tasida 4 ta rasm bor,
            {' '}<b className={pre.incomplete.length ? 'text-amber-300' : 'text-emerald-300'}>{pre.incomplete.length}</b> tasida yetishmaydi. Hisobot {pre.pages} sahifa.
          </p>
          {pre.incomplete.length > 0 && (
            <>
              <button type="button" onClick={() => setShowList(!showList)} className="text-brand-400 hover:underline">{showList ? 'Yopish' : 'Kimlarda yo‘qligini ko‘rish'}</button>
              {showList && (
                <ul className="max-h-48 divide-y divide-ink-700/60 overflow-y-auto rounded-lg border border-ink-700">
                  {pre.incomplete.map((s, i) => (
                    <li key={i} className="flex justify-between gap-3 px-3 py-2"><span>{s.fullName} <span className="text-blue-300">{s.groupIndex}</span></span><span className="text-amber-300">{s.count}/{TOTAL}</span></li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-4 pt-1 text-slate-300">
                <label className="flex items-center gap-2"><input type="radio" name="missing" checked={mode === 'placeholder'} onChange={() => setMode('placeholder')} className="accent-blue-500" />Yetishmaganlarni "Rasm yo‘q" bilan chiqarish</label>
                <label className="flex items-center gap-2"><input type="radio" name="missing" checked={mode === 'skip'} onChange={() => setMode('skip')} className="accent-blue-500" />O‘tkazib yuborish</label>
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
    <div className="space-y-4">
      <p className="text-sm text-slate-400">Tyutor talaba xonadonida olgan 4 ta rasmni yuklang. Rasmlar <code className="text-brand-400">server/data/photos</code> papkasida, Excel fayli yonida saqlanadi.</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44"><Field label="Guruh"><Select value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Barchasi</option>{groups.map((g) => <option key={g._id} value={g._id}>{g.index}</option>)}</Select></Field></div>
        <div className="min-w-48 flex-1"><Field label="Talaba qidirish"><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism bo‘yicha…" /></Field></div>
      </div>
      <Alert>{error}</Alert>

      <ReportPanel group={group} groupLabel={groupLabel} version={version} />

      <Card className="divide-y divide-ink-700/60 !p-0">
        {shown.map((r) => {
          const st = statusOf(r.count);
          return (
            <button key={r._id} type="button" onClick={() => setOpenId(r._id)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left transition hover:bg-ink-700/30">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-white">{r.fullName}</span>
                <span className="text-sm text-blue-300">{r.groupIndex}</span>
              </span>
              <span className="flex items-center gap-1" aria-hidden>
                {[1, 2, 3, 4].map((n) => <span key={n} className={`h-2 w-5 rounded-full ${r.photos.some((p) => p.slot === n) ? 'bg-brand-500' : 'bg-ink-700'}`} />)}
              </span>
              <span className="w-10 text-right text-sm font-semibold text-slate-200">{r.count}/{TOTAL}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${st.cls}`}>{st.text}</span>
            </button>
          );
        })}
        {!shown.length && <p className="px-4 py-10 text-center text-slate-500">Talaba topilmadi</p>}
      </Card>

      {opened && <StudentModal student={opened} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}
