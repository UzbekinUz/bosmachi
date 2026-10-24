import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal } from './ui.jsx';

const OUT_W = 1600; // chiqish eni (balandligi 4:3)
const VIEW_W = 800; // ko'rinish kanvasining ichki o'lchami
const VIEW_H = 600;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Rasmning 4:3 qismini tanlash: sudrab joylashtirish va kattalashtirish. Natija — JPEG blob.
export default function CropModal({ source, title = 'Rasmni kesish', onCancel, onDone }) {
  const canvas = useRef(null);
  const [bmp, setBmp] = useState(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 }); // kesim markazi (rasm o'lchamining ulushi)
  const drag = useRef(null);

  useEffect(() => {
    let alive = true;
    createImageBitmap(source, { imageOrientation: 'from-image' })
      .then((b) => { if (alive) setBmp(b); })
      .catch(() => alive && setError('Rasmni ochib bo‘lmadi. Boshqa fayl tanlang.'));
    return () => { alive = false; };
  }, [source]);

  // Zoom=1 da kesim — rasmga sig'adigan eng katta 4:3 to'rtburchak
  const base = bmp ? (bmp.width / bmp.height > 4 / 3
    ? { w: (bmp.height * 4) / 3, h: bmp.height }
    : { w: bmp.width, h: (bmp.width * 3) / 4 }) : null;

  const region = useCallback(() => {
    const cw = base.w / zoom;
    const ch = base.h / zoom;
    return {
      cw, ch,
      sx: clamp(pos.x * bmp.width - cw / 2, 0, bmp.width - cw),
      sy: clamp(pos.y * bmp.height - ch / 2, 0, bmp.height - ch),
    };
  }, [base, bmp, pos, zoom]);

  useEffect(() => {
    if (!bmp || !canvas.current) return;
    const { cw, ch, sx, sy } = region();
    const ctx = canvas.current.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(bmp, sx, sy, cw, ch, 0, 0, VIEW_W, VIEW_H);
  }, [bmp, region]);

  const move = (dxPx, dyPx, rect) => {
    const { cw, ch, sx, sy } = region();
    const nx = sx - dxPx * (cw / rect.width);
    const ny = sy - dyPx * (ch / rect.height);
    setPos({ x: clamp(nx + cw / 2, cw / 2, bmp.width - cw / 2) / bmp.width, y: clamp(ny + ch / 2, ch / 2, bmp.height - ch / 2) / bmp.height });
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e) => {
    if (!drag.current || !bmp) return;
    const rect = e.currentTarget.getBoundingClientRect();
    move(e.clientX - drag.current.x, e.clientY - drag.current.y, rect);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onKey = (e) => {
    if (!bmp) return;
    const step = 20;
    const rect = e.currentTarget.getBoundingClientRect();
    const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (map[e.key]) { e.preventDefault(); move(map[e.key][0], map[e.key][1], rect); }
  };

  const save = async () => {
    const { cw, ch, sx, sy } = region();
    const w = Math.round(Math.min(OUT_W, cw));
    const out = document.createElement('canvas');
    out.width = w;
    out.height = Math.round((w * 3) / 4);
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(bmp, sx, sy, cw, ch, 0, 0, out.width, out.height);
    out.toBlob((b) => (b ? onDone(b) : setError('Rasmni saqlab bo‘lmadi')), 'image/jpeg', 0.8);
  };

  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-3 text-[15px] leading-relaxed text-slate-300">
        Rasmni barmoq yoki sichqoncha bilan <b className="text-white">sudrab</b> kerakli joyini tanlang, slayder bilan <b className="text-white">kattalashtiring</b>. Rasm 4:3 shaklda saqlanadi.
      </p>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-ink-600 bg-ink-900">
        <canvas
          ref={canvas} width={VIEW_W} height={VIEW_H}
          tabIndex={0} aria-label="Kesish maydoni. Strelka tugmalari bilan suring"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
          onKeyDown={onKey}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        />
        {!bmp && !error && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Yuklanmoqda…</div>}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={() => setZoom((z) => clamp(+(z - 0.25).toFixed(2), 1, 4))} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-ink-600 text-xl text-slate-100 hover:bg-ink-700" aria-label="Kichraytirish">−</button>
        <input
          type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Kattalashtirish" className="h-2 w-full cursor-pointer accent-blue-500"
        />
        <button type="button" onClick={() => setZoom((z) => clamp(+(z + 0.25).toFixed(2), 1, 4))} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-ink-600 text-xl text-slate-100 hover:bg-ink-700" aria-label="Kattalashtirish">+</button>
      </div>
      <div className="mt-1 text-right text-[13px] text-slate-400">{Math.round(zoom * 100)}%</div>

      <Alert>{error}</Alert>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={() => { setZoom(1); setPos({ x: 0.5, y: 0.5 }); }}>Markazga qaytarish</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel}>Bekor qilish</Button>
          <Button onClick={save} disabled={!bmp}>Saqlash</Button>
        </div>
      </div>
    </Modal>
  );
}
