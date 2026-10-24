import { useEffect, useState } from 'react';
import { api } from './api.js';

// Yuklashdan oldin asl rasmni yengillashtiramiz: EXIF yo'nalishi qo'llanadi, uzun tomoni <= 2400px, JPEG 0.85.
// Kesilmaydi: qaysi qismini olish alohida ko'rsatiladi, asl rasm serverda saqlanadi.
export async function prepareOriginal(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Rasmni tayyorlab bo‘lmadi'))), 'image/jpeg', 0.85);
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
    api(`/admin/photos/${id}/file?v=${variant}&t=${encodeURIComponent(version || 0)}`, { raw: true })
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
