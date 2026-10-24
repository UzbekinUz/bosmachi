import { useEffect, useState } from 'react';
import { api } from './api.js';

// Rasmni brauzerda siqish: 4:3 ga kesish, eng ko'pi bilan 1600px, JPEG ~0.8
export async function compressImage(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width: w, height: h } = bmp;
  let cw = w;
  let ch = Math.round((w * 3) / 4);
  if (ch > h) { ch = h; cw = Math.round((h * 4) / 3); }
  const scale = Math.min(1, 1600 / cw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cw * scale);
  canvas.height = Math.round(ch * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, (w - cw) / 2, (h - ch) / 2, cw, ch, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Rasmni siqib bo‘lmadi'))), 'image/jpeg', 0.8);
  });
}

// Himoyalangan rasmni (JWT bilan) blob sifatida olib, URL qaytaradi
const cache = new Map();
export function useAuthImage(id, version, variant = 'thumb') {
  const key = `${id}:${version}:${variant}`;
  const [url, setUrl] = useState(cache.get(key) || '');
  useEffect(() => {
    if (!id) return undefined;
    if (cache.has(key)) { setUrl(cache.get(key)); return undefined; }
    let alive = true;
    api(`/admin/photos/${id}/file?v=${variant}`, { raw: true })
      .then((blob) => {
        const u = URL.createObjectURL(blob);
        cache.set(key, u);
        if (alive) setUrl(u);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [key, id, variant]);
  return id ? url : '';
}
