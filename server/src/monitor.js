import { Group, Student, Submission } from './models.js';
import { isFullName } from './format.js';

const last9 = (p) => String(p || '').replace(/\D/g, '').slice(-9);
const digits9 = (p) => String(p || '').replace(/\D/g, '').replace(/^998/, '');
const addressKey = (s) => [s.district, s.mahalla, s.street, s.house, s.apartment].map((x) => String(x || '').toLowerCase().trim()).join('|');

function coords(link) {
  const m = String(link || '').match(/(-?\d{1,3}\.\d+)\s*(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
}
// Yandex havolasida tartib lng,lat bo'lishi mumkin — ikkala tartibni tekshiramiz
const inTashkent = ([a, b]) => [[a, b], [b, a]].some(([lat, lng]) => lat > 41.0 && lat < 41.6 && lng > 68.9 && lng < 69.7);

export async function buildReport() {
  const [groups, students, subs] = await Promise.all([
    Group.find().sort({ index: 1 }).lean(),
    Student.find().sort({ fullName: 1 }).lean(),
    Submission.find().lean(),
  ]);
  const done = new Set(subs.map((s) => String(s.student)));

  const byGroup = groups.map((g) => {
    const list = students.filter((s) => String(s.group) === String(g._id));
    const missing = list.filter((s) => !done.has(String(s._id))).map((s) => s.fullName);
    return { _id: g._id, index: g.index, tutor: g.tutor, total: list.length, submitted: list.length - missing.length, missing };
  });

  const phoneOwners = {};
  const addrOwners = {};
  for (const s of subs) {
    const p = last9(s.phone);
    if (p.length === 9) (phoneOwners[p] ||= []).push(s);
    const k = addressKey(s);
    if (s.house) (addrOwners[k] ||= []).push(s);
  }

  const issues = [];
  for (const s of subs) {
    const problems = [];
    const add = (level, text) => problems.push({ level, text });

    if (digits9(s.phone).length !== 9) add('warn', 'Telefon raqami noto‘g‘ri yoki to‘liq emas');
    const same = (phoneOwners[last9(s.phone)] || []).filter((x) => String(x._id) !== String(s._id));
    if (same.length) add('warn', `Telefon raqami boshqa talaba bilan bir xil: ${same.map((x) => x.fullName).join(', ')}`);
    if (s.landlordPhone && last9(s.landlordPhone) === last9(s.phone)) add('warn', 'Uy egasining telefoni talabaning o‘z raqami bilan bir xil');

    const missing = [['district', 'tuman'], ['mahalla', 'mahalla'], ['street', 'ko‘cha'], ['house', 'uy']].filter(([k]) => !s[k]).map(([, n]) => n);
    if (missing.length) add('warn', `Manzil to‘liq emas: ${missing.join(', ')} yo‘q`);
    if (s.house && !/\d/.test(s.house)) add('warn', `Uy raqami shubhali: "${s.house}"`);
    for (const [k, n] of [['mahalla', 'Mahalla'], ['street', 'Ko‘cha']]) {
      if (s[k] && s[k].length < 3) add('warn', `${n} nomi juda qisqa: "${s[k]}"`);
    }

    if (!s.location) add('warn', 'Geolokatsiya havolasi yo‘q');
    else if (!/^https?:\/\//i.test(s.location)) add('warn', 'Geolokatsiya havolasi noto‘g‘ri (http bilan boshlanmaydi)');
    else {
      const c = coords(s.location);
      if (c && !inTashkent(c)) add('warn', 'Geolokatsiya Toshkent shahridan tashqarida ko‘rinadi');
    }

    const fake = (p) => /^(\d)\1{8}$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p);
    if (digits9(s.phone).length === 9 && fake(digits9(s.phone))) add('warn', 'Telefon raqami soxta ko‘rinadi');

    if (s.landlordName && !isFullName(s.landlordName)) add('warn', `Uy egasining ismi to‘liq emas: "${s.landlordName}"`);
    if (s.landlordName && s.landlordName.toLowerCase() === String(s.fullName).toLowerCase()) add('warn', 'Uy egasining ismi talabaning o‘z ismi bilan bir xil');
    if (s.landlordName && !s.landlordPhone) add('warn', 'Uy egasining telefoni yo‘q');
    if (!s.landlordName && s.landlordPhone) add('warn', 'Uy egasining ismi yo‘q');
    if (s.landlordPhone && digits9(s.landlordPhone).length !== 9) add('warn', 'Uy egasining telefoni noto‘g‘ri');

    const seen = new Set();
    for (const c of s.cohabitants || []) {
      if (!isFullName(c.fullName)) add('warn', `Birga yashovchining ismi to‘liq emas: "${c.fullName || '—'}"`);
      if (!c.phone) add('info', `Birga yashovchi telefoni yo‘q: ${c.fullName}`);
      else if (digits9(c.phone).length !== 9) add('warn', `Birga yashovchi telefoni noto‘g‘ri: ${c.fullName}`);
      if (!c.info) add('info', `Birga yashovchi kim ekani yozilmagan: ${c.fullName}`);
      const key = String(c.fullName).toLowerCase();
      if (seen.has(key)) add('info', `Birga yashovchi ikki marta yozilgan: ${c.fullName}`);
      seen.add(key);
    }

    if (!s.landlordName && !s.landlordPhone) add('info', 'Uy egasi ma’lumoti yo‘q');
    if (!s.rentStatus) add('info', 'Ijara holati hali belgilanmagan');
    const at = (addrOwners[addressKey(s)] || []).filter((x) => String(x._id) !== String(s._id));
    if (at.length) add('info', `Shu manzilda yana ${at.length} talaba: ${at.map((x) => x.fullName).join(', ')}`);

    if (problems.length) {
      issues.push({ id: s._id, fullName: s.fullName, groupIndex: s.groupIndex, problems });
    }
  }
  issues.sort((a, b) => b.problems.filter((p) => p.level === 'warn').length - a.problems.filter((p) => p.level === 'warn').length);

  return {
    summary: {
      students: students.length,
      submitted: subs.length,
      missing: students.length - subs.length,
      warnings: issues.filter((i) => i.problems.some((p) => p.level === 'warn')).length,
    },
    groups: byGroup,
    issues,
  };
}

