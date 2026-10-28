import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, HeightRule, ImageRun, LineRuleType, Packer, PageOrientation,
  Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, VerticalAlign, WidthType,
} from 'docx';
import { Group, Student, Submission, Photo, User } from './models.js';
import { photoPath } from './storage.js';
import { formatName } from './format.js';

const ASSETS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const FONT = 'Times New Roman';
const REGION = 'Toshkent shahar';

const tw = (cm) => Math.round(cm * 566.93); // sm -> twip
const px = (cm) => Math.round(cm * 37.8); // sm -> piksel (96 dpi)

// A4 albom, chetlari: tepa 0.75, past 1.5, chap 2, o'ng 1.25 sm
const PAGE = {
  size: { orientation: PageOrientation.LANDSCAPE, width: 11906, height: 16838 },
  margin: { top: tw(0.75), bottom: tw(1.5), left: tw(2), right: tw(1.25), header: 300, footer: 300 },
};

// Rasm 4:3, balandligi 7.8 sm; 2x2 jadval va sarlavha bitta sahifaga sig'adi
const IMG_W = px(10);
const IMG_H = px(7.5);
const COL = tw(10.8);
const ROW_H = tw(7.75);

const line = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const borders = { top: line, bottom: line, left: line, right: line };
const run = (text, o = {}) => new TextRun({ text, font: FONT, color: '000000', ...o });

const norm = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const lower = (v) => norm(v).toLowerCase();

// "Toshkent shahri," yozilmaydi; boshqa viloyat bo'lsa to'liq qoladi
export function addressOf(s) {
  if (!s) return '';
  return [
    s.region && s.region !== REGION && s.region,
    s.district && `${s.district} tumani`,
    s.mahalla && `${s.mahalla} MFY`,
    s.street && `${s.street} ko‘chasi`,
    s.house && `${s.house}-uy`,
    s.apartment && `${s.apartment}-xonadon`,
  ].filter(Boolean).map(norm).join(', ');
}

const addressKey = (s) => ['region', 'district', 'mahalla', 'street', 'house', 'apartment'].map((k) => lower(s[k])).join('|');

const joinNames = (list) => (list.length < 2 ? list[0] || '' : `${list.slice(0, -1).join(', ')} va ${list[list.length - 1]}`);

// Talabalarni yig'ib, sahifalarga ajratadi (bitta xonadondagi talabalar — bitta sahifa)
async function collect(groupIds) {
  const q = groupIds ? { group: { $in: groupIds } } : {};
  const [groups, students, subs, photos] = await Promise.all([
    Group.find(groupIds ? { _id: { $in: groupIds } } : {}).sort({ index: 1 }).lean(),
    Student.find(q).sort({ fullName: 1 }).lean(),
    Submission.find(q).lean(),
    Photo.find(q).sort({ slot: 1 }).lean(),
  ]);
  const groupBy = Object.fromEntries(groups.map((g) => [String(g._id), g]));
  const subBy = Object.fromEntries(subs.map((s) => [String(s.student), s]));
  const photosBy = {};
  for (const p of photos) (photosBy[String(p.student)] ||= []).push(p);

  // Faqat formani to'ldirgan (ijarada turadigan) talabalar
  const entries = students
    .filter((s) => subBy[String(s._id)])
    .map((s) => ({
      student: s,
      group: groupBy[String(s.group)],
      sub: subBy[String(s._id)],
      photos: photosBy[String(s._id)] || [],
    }))
    .sort((a, b) => (a.group?.index || '').localeCompare(b.group?.index || '') || a.student.fullName.localeCompare(b.student.fullName));

  const pages = [];
  const byAddress = {};
  for (const e of entries) {
    if (e.sub?.house) {
      const key = addressKey(e.sub);
      if (byAddress[key]) { byAddress[key].members.push(e); continue; }
      byAddress[key] = { address: addressOf(e.sub), members: [e] };
      pages.push(byAddress[key]);
    } else {
      pages.push({ address: addressOf(e.sub), members: [e] });
    }
  }
  for (const p of pages) {
    // Rasmlar eng ko'p rasmi bor a'zodan olinadi
    p.source = p.members.reduce((best, m) => (m.photos.length > best.photos.length ? m : best), p.members[0]);
  }
  return { groups, entries, pages, subs };
}

export async function reportPreview(groupIds) {
  const { entries, pages } = await collect(groupIds);
  return {
    students: entries.length,
    pages: pages.length,
    complete: entries.filter((e) => e.photos.length === 4).length,
    incomplete: entries
      .filter((e) => e.photos.length < 4)
      .map((e) => ({ fullName: e.student.fullName, groupIndex: e.group?.index || '', count: e.photos.length })),
  };
}

const captionOf = (page) => {
  const names = page.members.map((m) => formatName(m.student.fullName));
  const groupsOf = [...new Set(page.members.map((m) => m.group?.index).filter(Boolean))].join(', ');
  const who = names.length > 1 ? `guruh talabalari ${joinNames(names)}` : `guruh talabasi ${names[0]}`;
  return norm([page.address, groupsOf, who].filter(Boolean).join(' '));
};

const emptyBelow = () => new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [run('', { size: 2 })] });

async function photoCell(photo) {
  const base = { width: { size: COL, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, borders, margins: { top: 40, bottom: 40, left: 60, right: 60 } };
  let data = null;
  if (photo) data = await fs.readFile(photoPath(photo.file, 'report')).catch(() => null);
  if (!data) {
    return new TableCell({
      ...base,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Rasm yo‘q', { size: 28, italics: true, color: '7F7F7F' })] })],
    });
  }
  return new TableCell({
    ...base,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new ImageRun({ type: 'jpg', data, transformation: { width: IMG_W, height: IMG_H } })],
    })],
  });
}

async function studentSection(page) {
  const slots = [1, 2, 3, 4].map((n) => page.source.photos.find((p) => p.slot === n));
  const rowOf = async (a, b) => new TableRow({
    cantSplit: true,
    height: { value: ROW_H, rule: HeightRule.EXACT },
    children: [await photoCell(a), await photoCell(b)],
  });

  const caption = captionOf(page);
  // Xonadondagi talabalardan birinchi lokatsiyasi borining havolasi (faqat http/https)
  const location = page.members.map((m) => m.sub?.location).find((l) => /^https?:\/\//i.test(l || ''));
  // Sarlavha 3 qatordan oshib ketmasligi uchun juda uzun matnda shrift biroz kichraytiriladi
  const size = caption.length > 250 ? 24 : caption.length > 200 ? 28 : 32;

  const table = new Table({
    width: { size: COL * 2, type: WidthType.DXA },
    columnWidths: [COL, COL],
    alignment: AlignmentType.CENTER,
    rows: [
      await rowOf(slots[0], slots[1]),
      await rowOf(slots[2], slots[3]),
      new TableRow({
        cantSplit: true,
        children: [new TableCell({
          columnSpan: 2,
          width: { size: COL * 2, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          borders,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, children: [run(caption, { bold: true, size })] }),
            // Talabaning lokatsiyasi: bosiladigan havola, bosma nusxada ham o'qiladigan matn bilan
            ...(location ? [new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40 },
              children: [
                run('Lokatsiya: ', { size: 20 }),
                new ExternalHyperlink({ link: location, children: [new TextRun({ text: location, font: FONT, size: 20, color: '0563C1', underline: { type: UnderlineType.SINGLE } })] }),
              ],
            })] : []),
          ],
        })],
      }),
    ],
  });
  // Har bir talaba alohida bo'lim — yangi sahifadan boshlanadi
  return { properties: { page: PAGE }, children: [table, emptyBelow()] };
}

async function titleSection(tutors, year) {
  const children = [];
  const logoFile = ['tdiu-logo.png', 'tdiu-logo.jpg'].map((f) => path.join(ASSETS, f));
  for (const f of logoFile) {
    const data = await fs.readFile(f).catch(() => null);
    if (!data) continue;
    const meta = await sharp(data).metadata();
    const w = px(4.2);
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new ImageRun({ type: f.endsWith('.png') ? 'png' : 'jpg', data, transformation: { width: w, height: Math.round(w * meta.height / meta.width) } })],
    }));
    break;
  }
  const tutor = tutors.length ? tutors.join(', ') : '____________________';
  const title = `TOSHKENT DAVLAT IQTISODIYOT UNIVERSITETI TYUTORLAR FAOLIYATINI MUVOFIQLASHTIRISH VA TALABALAR BILAN MANZILLI ISHLASH BO‘LIMI TYUTORI ${tutor} NING IJARA XONADONLARIDA AMALGA OSHIRGAN ISHLAR`;
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 360, line: 360 }, children: [run(title.toLocaleUpperCase('uz'), { bold: true, size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [run('HISOBOTI', { bold: true, size: 56 })] }),
  );
  return {
    properties: { page: PAGE },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`Toshkent - ${year}`, { bold: true, size: 28 })] })] }) },
    children,
  };
}

function summarySection(subs, people) {
  const count = (name) => subs.filter((s) => lower(s.rentStatus) === name).length;
  const widths = [tw(11), tw(4.5), tw(4.5), tw(4.5)];
  const cell = (text, i, bold) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(String(text), { bold, size: 28 })] })],
  });
  const table = new Table({
    width: { size: widths.reduce((a, b) => a + b), type: WidthType.DXA },
    columnWidths: widths,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ cantSplit: true, children: ['UMUMIY IJARADA TURADIGAN TALABALAR SONI', 'YASHIL', 'SARIQ', 'QIZIL'].map((t, i) => cell(t, i, true)) }),
      new TableRow({ cantSplit: true, children: [subs.length, count('yashil'), count('sariq'), count('qizil')].map((t, i) => cell(t, i, true)) }),
    ],
  });
  const tutor = people.length ? people.map((p) => (p.phone ? `${p.name}, tel: ${p.phone}` : p.name)).join('; ') : '____________________';
  return {
    properties: { page: PAGE },
    children: [
      table,
      new Paragraph({
        spacing: { before: 600 },
        alignment: AlignmentType.CENTER,
        children: [run(`Tyutorlar faoliyatini muvofiqlashtirish va talabalar bilan manzilli ishlash bo‘limi tyutori — ${tutor}`, { bold: true, size: 28 })],
      }),
    ],
  };
}

export async function buildReportDoc({ groupIds, missing = 'placeholder' }) {
  const { groups, pages, subs } = await collect(groupIds);
  // Tyutor: guruhdagi ma'lumot, bo'sh bo'lsa — guruh biriktirilgan kuratorning profili (ism va telefon)
  const curators = await User.find({ role: 'curator', groups: { $in: groups.map((g) => g._id) } }).lean();
  const people = [];
  for (const g of groups) {
    const c = curators.find((u) => u.groups.some((id) => String(id) === String(g._id)));
    const name = formatName(g.tutor || c?.fullName || '');
    if (name && !people.some((p) => p.name === name)) people.push({ name, phone: g.tutorPhone || c?.phone || '' });
  }
  const tutors = people.map((p) => p.name);
  const use = missing === 'skip' ? pages.filter((p) => p.source.photos.length === 4) : pages;

  const sections = [await titleSection(tutors, new Date().getFullYear())];
  for (const p of use) sections.push(await studentSection(p));
  sections.push(summarySection(subs, people));

  const doc = new Document({
    creator: 'Hygge',
    title: 'Ijara xonadonlari hisoboti',
    styles: { default: { document: { run: { font: FONT, size: 28 } } } },
    sections,
  });
  const label = groups.length === 1 ? groups[0].index : 'hammasi';
  return { buffer: await Packer.toBuffer(doc), name: `hisobot-${label.replace(/[^\w-]+/g, '-')}.docx` };
}
