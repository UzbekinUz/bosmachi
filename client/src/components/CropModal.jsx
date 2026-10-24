import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal } from './ui.jsx';

const VIEW_W = 800; // ko'rinish kanvasining ichki o'lchami (4:3)
const VIEW_H = 600;
const MAX_ZOOM = 5;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Asl rasmning 4:3 qismini tanlash: bitta barmoq/sichqoncha bilan sudrash, ikki barmoq (yoki g'ildirak) bilan kattalashtirish.
// Natija — rasm o'lchamiga nisbatan ulushlar {x, y, w, h}; kesishni server asl rasmdan bajaradi.
export default function CropModal({ source, initial = null, title = 'Rasmni kesish', onCancel, onDone }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const [bmp, setBmp] = useState(null);
  const [error, setError] = useState('');
  const [view, setView] = useState({ cx: 0.5, cy: 0.5, z: 1 }); // markaz (ulush) va kattalashtirish
  const viewRef = useRef(view);
  const pointers = useRef(new Map());
  const last = useRef(null); // oldingi barmoq holati

  const apply = (next) => { viewRef.current = next; setView(next); };

  useEffect(() => {
    let alive = true;
    createImageBitmap(source, { imageOrientation: 'from-image' })
      .then((b) => {
        if (!alive) return;
        setBmp(b);
        // Avvalgi kesim bo'lsa, shundan boshlaymiz
        const baseW = b.width / b.height > 4 / 3 ? (b.height * 4) / 3 : b.width;
        if (initial?.w) {
          apply({ cx: initial.x + initial.w / 2, cy: initial.y + initial.h / 2, z: clamp((baseW / b.width) / initial.w, 1, MAX_ZOOM) });
        }
      })
      .catch(() => alive && setError('Rasmni ochib bo‘lmadi. Boshqa fayl tanlang.'));
    return () => { alive = false; };
  }, [source]); // eslint-disable-line react-hooks/exhaustive-deps

  // Joriy kesim (rasm pikselida)
  const regionOf = (v, b) => {
    const baseW = b.width / b.height > 4 / 3 ? (b.height * 4) / 3 : b.width;
    const cw = baseW / v.z;
    const ch = (cw * 3) / 4;
    return {
      cw, ch,
      sx: clamp(v.cx * b.width - cw / 2, 0, b.width - cw),
      sy: clamp(v.cy * b.height - ch / 2, 0, b.height - ch),
    };
  };
  // Markazni chegaradan chiqmaydigan qilib saqlaydi
  const normalize = (v, b) => {
    const { cw, ch, sx, sy } = regionOf(v, b);
    return { z: v.z, cx: (sx + cw / 2) / b.width, cy: (sy + ch / 2) / b.height };
  };

  useEffect(() => {
    if (!bmp || !canvas.current) return;
    const { cw, ch, sx, sy } = regionOf(view, bmp);
    const ctx = canvas.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(bmp, sx, sy, cw, ch, 0, 0, VIEW_W, VIEW_H);
  }, [bmp, view]); // eslint-disable-line react-hooks/exhaustive-deps

  const panBy = (dx, dy) => {
    const rect = canvas.current.getBoundingClientRect();
    const v = viewRef.current;
    const { cw, ch } = regionOf(v, bmp);
    apply(normalize({ ...v, cx: v.cx - (dx * (cw / rect.width)) / bmp.width, cy: v.cy - (dy * (ch / rect.height)) / bmp.height }, bmp));
  };
  const zoomBy = (factor) => {
    const v = viewRef.current;
    apply(normalize({ ...v, z: clamp(v.z * factor, 1, MAX_ZOOM) }, bmp));
  };

  /* ---- sichqoncha / barmoq ---- */
  const dist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const mid = () => {
    const [a, b] = [...pointers.current.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  const onPointerDown = (e) => {
    if (!bmp) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = pointers.current.size === 2 ? { d: dist(), m: mid() } : { m: { x: e.clientX, y: e.clientY } };
  };
  const onPointerMove = (e) => {
    if (!bmp || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      panBy(e.clientX - last.current.m.x, e.clientY - last.current.m.y);
      last.current = { m: { x: e.clientX, y: e.clientY } };
    } else if (pointers.current.size === 2) {
      const d = dist();
      const m = mid();
      zoomBy(d / last.current.d);
      panBy(m.x - last.current.m.x, m.y - last.current.m.y);
      last.current = { d, m };
    }
  };
  const onPointerEnd = (e) => {
    pointers.current.delete(e.pointerId);
    const rest = [...pointers.current.values()][0];
    last.current = rest ? { m: rest } : null;
  };

  // G'ildirak bilan kattalashtirish (sahifa aylanmasligi uchun passive: false)
  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (!bmp) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e) => {
    if (!bmp) return;
    const map = { ArrowLeft: [24, 0], ArrowRight: [-24, 0], ArrowUp: [0, 24], ArrowDown: [0, -24] };
    if (map[e.key]) { e.preventDefault(); panBy(map[e.key][0], map[e.key][1]); }
    if (e.key === '+' || e.key === '=') zoomBy(1.15);
    if (e.key === '-') zoomBy(1 / 1.15);
  };

  const save = () => {
    const { cw, ch, sx, sy } = regionOf(viewRef.current, bmp);
    onDone({ x: sx / bmp.width, y: sy / bmp.height, w: cw / bmp.width, h: ch / bmp.height });
  };

  const zoomPct = Math.round(view.z * 100);
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-3 text-[15px] leading-relaxed text-slate-300">
        Rasmni <b className="text-white">sudrab</b> kerakli joyini tanlang. <b className="text-white">Ikki barmoq</b> (yoki sichqoncha g‘ildiragi, slayder) bilan kattalashtiring. Asl rasm saqlanadi, istalgan payt qayta kesish mumkin.
      </p>
      <div ref={wrap} className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-ink-900">
        <canvas
          ref={canvas} width={VIEW_W} height={VIEW_H}
          tabIndex={0} aria-label="Kesish maydoni. Strelka tugmalari bilan suring, plyus va minus bilan kattalashtiring"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}
          onKeyDown={onKey}
          className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
        />
        {!bmp && !error && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Yuklanmoqda…</div>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => bmp && zoomBy(1 / 1.25)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-ink-600 text-xl text-slate-100 hover:bg-ink-700" aria-label="Kichraytirish">−</button>
        <input
          type="range" min="1" max={MAX_ZOOM} step="0.01" value={view.z}
          onChange={(e) => bmp && apply(normalize({ ...viewRef.current, z: Number(e.target.value) }, bmp))}
          aria-label="Kattalashtirish" className="h-2 w-full cursor-pointer accent-blue-500"
        />
        <button type="button" onClick={() => bmp && zoomBy(1.25)} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-ink-600 text-xl text-slate-100 hover:bg-ink-700" aria-label="Kattalashtirish">+</button>
      </div>
      <div className="mt-1 text-right text-[13px] text-slate-400">{zoomPct}%</div>

      <Alert>{error}</Alert>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="ghost" disabled={!bmp} onClick={() => apply({ cx: 0.5, cy: 0.5, z: 1 })}>Markazga qaytarish</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Bekor qilish</Button>
          <Button onClick={save} disabled={!bmp}>Saqlash</Button>
        </div>
      </div>
    </Modal>
  );
}
