import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
// Rasmlar submissions.xlsx yonidagi data papkasida turadi
export const PHOTO_DIR = process.env.PHOTO_DIR || path.join(dataDir, 'photos');

const SUFFIX = { full: '.jpg', thumb: '_t.jpg', report: '_r.jpg' };
export const photoPath = (file, variant = 'full') => path.join(PHOTO_DIR, `${file}${SUFFIX[variant]}`);

const LIMIT_PIXELS = 40e6;
export const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

// Yuklangan rasmni 4:3 ga kesib, 3 xil o'lchamda saqlaydi: to'liq (<=1600px), kichik (400px), hisobot uchun (800px)
export async function saveVariants(buffer, file) {
  const meta = await sharp(buffer, { limitInputPixels: LIMIT_PIXELS }).metadata();
  if (!ALLOWED_FORMATS.includes(meta.format)) {
    throw Object.assign(new Error('Faqat JPEG, PNG yoki WebP rasm yuklash mumkin'), { status: 400 });
  }
  // EXIF aylantirishni qo'llab, shaffoflikni oq fonga o'tkazamiz
  const { data, info } = await sharp(buffer, { limitInputPixels: LIMIT_PIXELS })
    .rotate().flatten({ background: '#ffffff' }).jpeg({ quality: 95 }).toBuffer({ resolveWithObject: true });

  let cw = info.width;
  let ch = Math.round(info.width * 3 / 4);
  if (ch > info.height) { ch = info.height; cw = Math.round(info.height * 4 / 3); }
  const base = sharp(data).extract({
    left: Math.floor((info.width - cw) / 2), top: Math.floor((info.height - ch) / 2), width: cw, height: ch,
  });

  const [full, thumb, report] = await Promise.all([
    base.clone().resize({ width: Math.min(1600, cw) }).jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    base.clone().resize({ width: Math.min(400, cw) }).jpeg({ quality: 75 }).toBuffer(),
    base.clone().resize({ width: Math.min(800, cw) }).jpeg({ quality: 76 }).toBuffer(),
  ]);

  await fs.mkdir(path.dirname(photoPath(file)), { recursive: true });
  await Promise.all([
    fs.writeFile(photoPath(file, 'full'), full),
    fs.writeFile(photoPath(file, 'thumb'), thumb),
    fs.writeFile(photoPath(file, 'report'), report),
  ]);
  return full.length;
}

export async function removeFiles(file) {
  await Promise.all(Object.keys(SUFFIX).map((v) => fs.rm(photoPath(file, v), { force: true })));
}

// Talaba yoki guruh o'chirilganda rasmlarini ham tozalaymiz
export async function removeStudentPhotos(studentIds) {
  await Promise.all(studentIds.map((id) => fs.rm(path.join(PHOTO_DIR, String(id)), { recursive: true, force: true })));
}
