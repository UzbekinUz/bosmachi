import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Submission, Group } from './models.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
export const EXCEL_PATH = process.env.EXCEL_PATH || path.join(dir, 'submissions.xlsx');

const TITLE = 'Toshkent davlat iqtisodiyot universiteti talabalarining ijara xonadonlariga joylashishi yuzasidan';
const HEADERS = [
  ['T/r', 5], ['Talabala F.I.Sh.', 28], ['Fakulteti', 16], ['Kursi', 10], ['Guruhi', 12],
  ['Talabaning telefon raqami', 17], ['Ijara holati', 14], ["Ijara xonadoni egasining ma'lumoti", 24],
  ["Kimlar bilan istiqomat qiladi", 46], ['Manzili', 30],
  ['Joylashuv geolokatsiyasi xavolasi (ssilkasi)', 32], 'Guruh tyutori F.I.Sh. Telefon raqami',
].map((h) => (Array.isArray(h) ? h : [h, 24]));

const STATUS_COLOR = { yashil: 'FF00B050', sariq: 'FFFFC000', qizil: 'FFFF0000' };
const FONT = { name: 'Times New Roman', size: 11 };
const border = Object.fromEntries(['top', 'left', 'bottom', 'right'].map((k) => [k, { style: 'thin' }]));

// "+998 91 234 56 78" -> "91 234 56 78"
const short = (p) => String(p || '').replace(/^\+?998\s*/, '').trim();

const addressOf = (s) => {
  const cityOnly = s.region && s.region !== 'Toshkent shahar' ? `${s.region}, ` : '';
  return cityOnly + [
    s.district && `${s.district} tumani`,
    s.mahalla && `${s.mahalla} MFY`,
    s.street && `${s.street} ko‘chasi`,
    s.house && `${s.house}-uy`,
    s.apartment && `${s.apartment}-xonadon`,
  ].filter(Boolean).join(' ');
};

const sheetName = (index, used) => {
  const base = String(index).replace(/[\\/*?:[\]]/g, '-').slice(0, 31) || 'Guruh';
  let name = base;
  for (let i = 2; used.has(name.toLowerCase()); i++) name = `${base.slice(0, 28)}(${i})`;
  used.add(name.toLowerCase());
  return name;
};

function fillSheet(ws, subs) {
  ws.columns = HEADERS.map(([, width]) => ({ width }));
  const n = HEADERS.length;

  const band = (rowNo, text, vertical) => {
    ws.mergeCells(rowNo, 1, rowNo, n);
    const c = ws.getCell(rowNo, 1);
    c.value = text;
    c.font = { ...FONT, size: 14, bold: true };
    c.alignment = { horizontal: 'center', vertical, wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
    for (let i = 1; i <= n; i++) ws.getCell(rowNo, i).border = border;
  };
  band(1, TITLE, 'middle'); ws.getRow(1).height = 22;
  band(2, 'AXBOROT', 'top');

  const head = ws.getRow(3);
  HEADERS.forEach(([h], i) => {
    const c = head.getCell(i + 1);
    c.value = h;
    c.font = { ...FONT, size: 12, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = border;
  });
  head.height = 48;

  subs.forEach((s, i) => {
    const people = (s.cohabitants || [])
      .map((c, k) => `${k + 1}. ${[c.info, c.fullName, short(c.phone)].filter(Boolean).join(' ')}`)
      .join('\n');
    const row = ws.addRow([
      i + 1,
      s.fullName,
      s.faculty,
      s.course,
      s.groupIndex,
      short(s.phone),
      s.rentStatus || '',
      [s.landlordName, short(s.landlordPhone)].filter(Boolean).join('   '),
      people,
      addressOf(s),
      s.location ? { text: s.location, hyperlink: s.location } : '',
      [s.tutor, short(s.tutorPhone)].filter(Boolean).join('\n'),
    ]);
    row.eachCell({ includeEmpty: true }, (c) => {
      c.font = FONT;
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = border;
    });
    if (s.location) row.getCell(11).font = { name: 'Calibri', size: 11, underline: true, color: { argb: 'FF0563C1' } };
    const color = STATUS_COLOR[String(s.rentStatus || '').toLowerCase()];
    if (color) row.getCell(7).font = { ...FONT, bold: true, color: { argb: color } };
  });
}

// Har bir guruh uchun alohida list (guruh nomi bilan)
export async function buildWorkbook() {
  const [groups, subs] = await Promise.all([
    Group.find().sort({ index: 1 }).lean(),
    Submission.find().sort({ fullName: 1 }).lean(),
  ]);
  const wb = new ExcelJS.Workbook();
  const used = new Set();
  for (const g of groups) {
    fillSheet(wb.addWorksheet(sheetName(g.index, used)), subs.filter((s) => String(s.group) === String(g._id)));
  }
  if (!groups.length) fillSheet(wb.addWorksheet('Лист1'), []);
  return wb;
}

// Har bir o'zgarishdan keyin fayl yangilanadi (xatolik so'rovni to'xtatmaydi)
let chain = Promise.resolve();
export function syncExcel() {
  chain = chain.then(async () => {
    fs.mkdirSync(dir, { recursive: true });
    const wb = await buildWorkbook();
    await wb.xlsx.writeFile(EXCEL_PATH);
  }).catch((e) => console.error('Excel yozishda xato:', e.message));
  return chain;
}
