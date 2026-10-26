// Ilova belgilarini qalqon logosidan yasaydi (bir marta ishga tushiriladi): node client/scripts/make-icons.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(new URL('../../server/', import.meta.url));
const sharp = require('sharp');

const shield = (x, y, w) => {
  const s = w / 48;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M24 2.5 44.5 9.5v18.2c0 12.4-8.4 21.5-20.5 26.3C11.9 49.2 3.5 40.1 3.5 27.7V9.5z" fill="#2563eb"/>
    <path d="M12.5 26 24 15.5 35.5 26" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17.5 26.5v14M30.5 26.5v14M17.5 33.5h13" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  </g>`;
};
const icon = (size, shieldW) => {
  const h = shieldW * (56 / 48);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#0c0d0f"/>${shield((size - shieldW) / 2, (size - h) / 2, shieldW)}</svg>`);
};
const out = new URL('../public/icons/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
const jobs = [['icon-192.png', 192, 192 * 0.62], ['icon-512.png', 512, 512 * 0.62], ['maskable-512.png', 512, 512 * 0.5], ['apple-touch-icon.png', 180, 180 * 0.62]];
for (const [name, size, w] of jobs) {
  await sharp(icon(size, w)).png().toFile(new URL(name, out).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  console.log('yaratildi', name);
}
