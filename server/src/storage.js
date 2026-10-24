import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
// Rasmlar submissions.xlsx yonidagi data papkasida turadi
export const PHOTO_DIR = process.env.PHOTO_DIR || path.join(dataDir, 'photos');

// original — kesilmagan asl rasm (qayta kesish uchun), qolganlari kesilgan nusxalar
const SUFFIX = { original: '_o.jpg', full: '.jpg', thumb: '_t.jpg', report: '_r.jpg' };
export const photoPath = (file, variant = 'full') => path.join(PHOTO_DIR, `${file}${SUFFIX[variant]}`);

const LIMIT_PIXELS = 40e6;
export const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const exists = (p) => fs.access(p).then(() => true, () => false);

// Asl rasmni saqlaydi: EXIF aylantirilgan, oq fonda, uzun tomoni <= 2400px
export async function storeOriginal(buffer, file) {
  const meta = await sharp(buffer, { limitInputPixels: LIMIT_PIXELS }).metadata();
  if (!ALLOWED_FORMATS.includes(meta.format)) throw badRequest('Faqat JPEG, PNG yoki WebP rasm yuklash mumkin');
  const out = await sharp(buffer, { limitInputPixels: LIMIT_PIXELS })
    .rotate().flatten({ background: '#ffffff' })
    .resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  await fs.mkdir(path.dirname(photoPath(file)), { recursive: true });
  await fs.writeFile(photoPath(file, 'original'), out);
}

// Kesim to'rtburchagi (ulushlarda): 4:3 nisbatda bo'lishi shart
export function parseCrop(raw) {
  if (!raw) return null;
  let c = raw;
  if (typeof raw === 'string') {
    try { c = JSON.parse(raw); } catch { throw badRequest('Kesim ma’lumoti noto‘g‘ri'); }
  }
  const { x, y, w, h } = c || {};
  if (![x, y, w, h].every((v) => Number.isFinite(v))) throw badRequest('Kesim ma’lumoti noto‘g‘ri');
  const eps = 1e-3;
  if (x < -eps || y < -eps || w <= 0 || h <= 0 || x + w > 1 + eps || y + h > 1 + eps) throw badRequest('Kesim rasm chegarasidan chiqib ketgan');
  return { x: Math.max(0, x), y: Math.max(0, y), w: Math.min(w, 1), h: Math.min(h, 1) };
}

// Asldan (yoki eski rasmlar uchun kesilgan nusxadan) kesilgan 3 o'lchamni yasaydi.
// rect berilmasa — markazdan eng katta 4:3 qism. Ishlatilgan kesimni qaytaradi.
export async function renderVariants(file, rect = null) {
  let src = photoPath(file, 'original');
  if (!(await exists(src))) {
    // Eski rasm: kesilgan nusxani asl sifatida saqlab qo'yamiz (undan keyin ham kesish mumkin)
    src = photoPath(file, 'full');
    await fs.copyFile(src, photoPath(file, 'original'));
    src = photoPath(file, 'original');
  }
  const input = await fs.readFile(src);
  const { width: W, height: H } = await sharp(input).metadata();

  let left; let top; let cw; let ch;
  if (rect) {
    cw = Math.round(rect.w * W);
    ch = Math.round(rect.h * H);
    // 4:3 dan chetga chiqsa, balandlik kenglikka moslanadi
    if (Math.abs(cw / ch - 4 / 3) > 0.04) throw badRequest('Kesim 4:3 nisbatda bo‘lishi kerak');
    ch = Math.round((cw * 3) / 4);
    left = Math.round(rect.x * W);
    top = Math.round(rect.y * H);
  } else {
    cw = W;
    ch = Math.round((W * 3) / 4);
    if (ch > H) { ch = H; cw = Math.round((H * 4) / 3); }
    left = Math.floor((W - cw) / 2);
    top = Math.floor((H - ch) / 2);
  }
  cw = Math.min(cw, W);
  ch = Math.min(ch, H);
  left = Math.min(Math.max(left, 0), W - cw);
  top = Math.min(Math.max(top, 0), H - ch);
  if (cw < 160) throw badRequest('Kesim juda kichik');

  const base = sharp(input).extract({ left, top, width: cw, height: ch });
  const [full, thumb, report] = await Promise.all([
    base.clone().resize({ width: Math.min(1600, cw) }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    base.clone().resize({ width: Math.min(400, cw) }).jpeg({ quality: 75 }).toBuffer(),
    base.clone().resize({ width: Math.min(800, cw) }).jpeg({ quality: 76 }).toBuffer(),
  ]);
  await Promise.all([
    fs.writeFile(photoPath(file, 'full'), full),
    fs.writeFile(photoPath(file, 'thumb'), thumb),
    fs.writeFile(photoPath(file, 'report'), report),
  ]);
  return { size: full.length, crop: { x: left / W, y: top / H, w: cw / W, h: ch / H } };
}

export async function removeFiles(file) {
  await Promise.all(Object.keys(SUFFIX).map((v) => fs.rm(photoPath(file, v), { force: true })));
}

// Talaba yoki guruh o'chirilganda rasmlarini ham tozalaymiz
export async function removeStudentPhotos(studentIds) {
  await Promise.all(studentIds.map((id) => fs.rm(path.join(PHOTO_DIR, String(id)), { recursive: true, force: true })));
}
