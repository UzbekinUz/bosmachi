import './env.js';
import express from 'express';
import mongoose from 'mongoose';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Group, Student, Option, FieldConfig, Submission, Photo, User } from './models.js';
import { seed } from './seed.js';
import { syncExcel, buildWorkbook } from './excel.js';
import { formatName, isFullName } from './format.js';
import { buildReport } from './monitor.js';
import { photosRouter } from './photos.js';
import { removeStudentPhotos } from './storage.js';
import { audit } from './audit.js';
import {
  auth, ownerOnly, scopeIds, resolveScope, assertGroup, inScope, login, ensureOwner, accountRouter, usersRouter,
} from './users.js';

const isProd = process.env.NODE_ENV === 'production';
if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change-this') || !process.env.ADMIN_PASS || process.env.ADMIN_PASS === 'admin123')) {
  console.error('Production uchun JWT_SECRET va ADMIN_PASS ni o‘zgartiring!');
  process.exit(1);
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
// Ilova va API bitta manzildan beriladi, shuning uchun CORS yoqilmagan (boshqa saytlar API'ga murojaat qila olmaydi)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Content-Security-Policy', CSP);
  if (isProd) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
});

// Oddiy IP bo'yicha cheklov (xotirada): soniyalar oynasida max so'rov
const hits = new Map();
const limit = (max, windowMs) => (req, res, next) => {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  const rec = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (rec.length >= max) return res.status(429).json({ message: 'Juda ko‘p urinish. Birozdan so‘ng qayta urinib ko‘ring' });
  rec.push(now);
  hits.set(key, rec);
  next();
};
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 600000)) hits.delete(k); }, 600000).unref();
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use(express.json({ limit: '1mb' }));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const clean = (v) => (typeof v === 'string' ? v.trim().slice(0, 300) : '');
const digits = (v) => String(v || '').replace(/\D/g, '');
const validPhone = (v) => digits(v).length >= 9;

/* ---------------- Auth ---------------- */
app.post('/api/auth/login', limit(10, 10 * 60 * 1000), wrap(async (req, res) => {
  const { username, password } = req.body || {};
  const result = await login(username, password); // 429: urinishlar chegarasidan oshsa xato tashlaydi
  if (!result) return res.status(401).json({ message: 'Login yoki parol noto‘g‘ri' });
  res.json(result);
}));

/* ---------------- Public (client) ---------------- */
app.get('/api/public/config', limit(120, 10 * 60 * 1000), wrap(async (req, res) => {
  const [groups, fields, options] = await Promise.all([
    Group.find().sort({ index: 1 }).lean(),
    FieldConfig.find().sort({ order: 1 }).lean(),
    Option.find({ type: { $in: ['region', 'district'] } }).sort({ value: 1 }).lean(),
  ]);
  res.json({
    groups,
    fields,
    regions: options.filter((o) => o.type === 'region').map((o) => o.value),
    districts: options.filter((o) => o.type === 'district').map((o) => ({ value: o.value, region: o.parent })),
  });
}));

app.get('/api/public/groups/:id/students', limit(60, 10 * 60 * 1000), wrap(async (req, res) => {
  const students = await Student.find({ group: req.params.id }).sort({ fullName: 1 }).lean();
  const done = new Set((await Submission.find({ group: req.params.id }).select('student').lean()).map((s) => String(s.student)));
  // To'ldirib bo'lgan talabalar ro'yxatda ko'rinmaydi
  res.json(students.filter((s) => !done.has(String(s._id))).map((s) => ({ _id: s._id, fullName: s.fullName })));
}));

app.post('/api/public/submissions', limit(30, 10 * 60 * 1000), wrap(async (req, res) => {
  const b = req.body || {};
  const student = await Student.findById(b.student).populate('group');
  if (!student) return res.status(400).json({ message: 'Talaba tanlanmagan' });
  const g = student.group;

  const fields = await FieldConfig.find().lean();
  const doc = {};
  const errors = [];

  for (const f of fields) {
    if (!f.enabled) continue;
    if (f.key === 'cohabitants') {
      doc.cohabitants = (Array.isArray(b.cohabitants) ? b.cohabitants : []).slice(0, 15)
        .map((c) => ({ info: clean(c.info), fullName: formatName(c.fullName), phone: clean(c.phone) }))
        .filter((c) => c.fullName || c.phone || c.info);
      if (f.required && !doc.cohabitants.length) errors.push(f.label);
      for (const c of doc.cohabitants) {
        if (!isFullName(c.fullName)) errors.push(`birga yashovchining to‘liq ismi (familiya, ism, otasining ismi): "${c.fullName || '—'}"`);
        if (c.phone && !validPhone(c.phone)) errors.push(`birga yashovchi telefoni noto‘g‘ri: ${c.fullName}`);
      }
      continue;
    }
    if (f.key === 'region') { doc.region = 'Toshkent shahar'; continue; }
    doc[f.key] = f.key === 'landlordName' ? formatName(b[f.key]) : clean(b[f.key]);
    if (f.required && !doc[f.key]) errors.push(f.label);
    if (f.key === 'landlordName' && doc.landlordName && !isFullName(doc.landlordName)) {
      errors.push('uy egasining to‘liq ismi (familiya, ism, otasining ismi)');
    }
    if ((f.key === 'phone' || f.key === 'landlordPhone') && doc[f.key] && !validPhone(doc[f.key])) {
      errors.push(`${f.label} noto‘g‘ri`);
    }
  }
  if (errors.length) return res.status(400).json({ message: `Tekshiring: ${errors.join('; ')}` });

  const snapshot = {
    group: g._id, groupIndex: g.index, faculty: g.faculty, direction: g.direction,
    course: g.course, tutor: g.tutor, tutorPhone: g.tutorPhone, fullName: student.fullName,
  };
  if (await Submission.exists({ student: student._id })) {
    return res.status(409).json({ message: 'Bu talaba ma’lumotni allaqachon topshirgan' });
  }
  await Submission.create({ ...snapshot, ...doc, student: student._id });
  syncExcel();
  res.status(201).json({ ok: true });
}));

/* ---------------- Admin ---------------- */
const admin = express.Router();
admin.use(auth);
admin.use(accountRouter);
admin.use(usersRouter);

admin.get('/stats', wrap(async (req, res) => {
  const ids = scopeIds(req);
  const [groups, students, submissions] = await Promise.all([
    Group.countDocuments(inScope(ids, '_id')), Student.countDocuments(inScope(ids)), Submission.countDocuments(inScope(ids)),
  ]);
  res.json({ groups, students, submissions });
}));

// Guruhlar
admin.get('/groups', wrap(async (req, res) => {
  const ids = scopeIds(req);
  const match = ids ? [{ $match: { group: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } }] : [];
  const [groups, counts, subs] = await Promise.all([
    Group.find(inScope(ids, '_id')).sort({ index: 1 }).lean(),
    Student.aggregate([...match, { $group: { _id: '$group', n: { $sum: 1 } } }]),
    Submission.aggregate([...match, { $group: { _id: '$group', n: { $sum: 1 } } }]),
  ]);
  const c = Object.fromEntries(counts.map((x) => [String(x._id), x.n]));
  const s = Object.fromEntries(subs.map((x) => [String(x._id), x.n]));
  res.json(groups.map((g) => ({ ...g, students: c[String(g._id)] || 0, submissions: s[String(g._id)] || 0 })));
}));
const groupBody = (b) => ({
  index: clean(b.index), faculty: clean(b.faculty), direction: clean(b.direction),
  course: clean(b.course), tutor: formatName(b.tutor), tutorPhone: clean(b.tutorPhone),
});
admin.post('/groups', wrap(async (req, res) => {
  const body = groupBody(req.body);
  const me = req.user;
  // Kurator yaratgan guruh avtomatik unga biriktiriladi; tyutor bo'sh bo'lsa — kuratorning o'zi
  if (me.role === 'curator') {
    body.tutor = body.tutor || me.fullName;
    body.tutorPhone = body.tutorPhone || me.phone;
  }
  const g = await Group.create({ ...body, createdBy: me._id });
  if (me.role === 'curator') await User.updateOne({ _id: me._id }, { $addToSet: { groups: g._id } });
  audit(req, 'group.create', `Guruh yaratdi: ${g.index}`, g._id);
  res.status(201).json(g);
}));
admin.put('/groups/:id', wrap(async (req, res) => {
  assertGroup(req, req.params.id);
  const g = await Group.findByIdAndUpdate(req.params.id, groupBody(req.body), { new: true, runValidators: true });
  // Mavjud yozuvlardagi tyutor/fakultet ma'lumotlarini ham yangilab qo'yamiz
  await Submission.updateMany({ group: g._id }, {
    groupIndex: g.index, faculty: g.faculty, direction: g.direction, course: g.course, tutor: g.tutor, tutorPhone: g.tutorPhone,
  });
  syncExcel();
  audit(req, 'group.update', `Guruhni yangiladi: ${g.index}`, g._id);
  res.json(g);
}));
admin.delete('/groups/:id', wrap(async (req, res) => {
  assertGroup(req, req.params.id);
  // Ma'lumotli guruhni faqat egasi o'chira oladi (tasodifiy yo'qotishdan himoya)
  if (req.user.role !== 'owner' && (await Submission.exists({ group: req.params.id }))) {
    return res.status(409).json({ message: 'Yozuvlari bor guruhni faqat egasi o‘chira oladi' });
  }
  const gone = await Group.findById(req.params.id).select('index').lean();
  const ids = (await Student.find({ group: req.params.id }).select('_id').lean()).map((s) => s._id);
  await Promise.all([
    Photo.deleteMany({ group: req.params.id }),
    removeStudentPhotos(ids),
    Group.findByIdAndDelete(req.params.id),
    User.updateMany({}, { $pull: { groups: req.params.id } }),
    Student.deleteMany({ group: req.params.id }),
    Submission.deleteMany({ group: req.params.id }),
  ]);
  syncExcel();
  audit(req, 'group.delete', `Guruhni o‘chirdi: ${gone?.index || ''}`);
  res.json({ ok: true });
}));

// Talabalar
admin.get('/groups/:id/students', wrap(async (req, res) => {
  assertGroup(req, req.params.id);
  res.json(await Student.find({ group: req.params.id }).sort({ fullName: 1 }).lean());
}));
admin.post('/groups/:id/students', wrap(async (req, res) => {
  assertGroup(req, req.params.id);
  const names = (Array.isArray(req.body.names) ? req.body.names : String(req.body.names || '').split('\n'))
    .map(formatName).filter(Boolean);
  const docs = await Student.insertMany(names.slice(0, 300).map((fullName) => ({ fullName, group: req.params.id })));
  audit(req, 'student.add', `${docs.length} ta talaba qo‘shdi`, req.params.id);
  res.status(201).json(docs);
}));
admin.put('/students/:id', wrap(async (req, res) => {
  const found = await Student.findById(req.params.id).select('group').lean();
  if (!found) return res.status(404).json({ message: 'Talaba topilmadi' });
  assertGroup(req, found.group);
  const s = await Student.findByIdAndUpdate(req.params.id, { fullName: formatName(req.body.fullName) }, { new: true });
  await Submission.updateOne({ student: s._id }, { fullName: s.fullName });
  syncExcel();
  audit(req, 'student.update', `Talaba ismini yangiladi: ${s.fullName}`, s.group);
  res.json(s);
}));
admin.delete('/students/:id', wrap(async (req, res) => {
  const found = await Student.findById(req.params.id).select('group fullName').lean();
  if (!found) return res.json({ ok: true });
  assertGroup(req, found.group);
  // Formani to'ldirgan talabani faqat egasi o'chira oladi
  if (req.user.role !== 'owner' && (await Submission.exists({ student: found._id }))) {
    return res.status(409).json({ message: 'Formani to‘ldirgan talabani faqat egasi o‘chira oladi' });
  }
  await Promise.all([
    Student.findByIdAndDelete(req.params.id),
    Submission.deleteOne({ student: req.params.id }),
    Photo.deleteMany({ student: req.params.id }),
    removeStudentPhotos([req.params.id]),
  ]);
  syncExcel();
  audit(req, 'student.delete', `Talabani o‘chirdi: ${found.fullName}`, found.group);
  res.json({ ok: true });
}));

// Variantlar (viloyat, tuman, ijara holati)
admin.get('/options', wrap(async (req, res) => res.json(await Option.find().sort({ type: 1, value: 1 }).lean())));
admin.post('/options', ownerOnly, wrap(async (req, res) => {
  const type = clean(req.body.type);
  if (!['region', 'district', 'rentStatus'].includes(type)) return res.status(400).json({ message: 'Noto‘g‘ri tur' });
  res.status(201).json(await Option.create({ type, value: clean(req.body.value), parent: clean(req.body.parent) }));
}));
admin.put('/options/:id', ownerOnly, wrap(async (req, res) => {
  res.json(await Option.findByIdAndUpdate(req.params.id, { value: clean(req.body.value), parent: clean(req.body.parent) }, { new: true }));
}));
admin.delete('/options/:id', ownerOnly, wrap(async (req, res) => {
  await Option.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

// Forma maydonlari
admin.get('/fields', wrap(async (req, res) => res.json(await FieldConfig.find().sort({ order: 1 }).lean())));
admin.put('/fields', ownerOnly, wrap(async (req, res) => {
  const list = Array.isArray(req.body) ? req.body : [];
  await Promise.all(list.map((f, order) => FieldConfig.updateOne({ key: f.key }, {
    label: clean(f.label) || f.key, enabled: !!f.enabled, required: !!f.enabled && !!f.required, order,
  })));
  syncExcel();
  res.json(await FieldConfig.find().sort({ order: 1 }).lean());
}));

// Yuborilgan ma'lumotlar
admin.get('/submissions', wrap(async (req, res) => {
  const ids = resolveScope(req, req.query.group);
  res.json(await Submission.find(inScope(ids)).sort({ updatedAt: -1 }).lean());
}));
admin.patch('/submissions/:id', wrap(async (req, res) => {
  const allowed = ['rentStatus', 'phone', 'landlordName', 'landlordPhone', 'region', 'district', 'mahalla', 'street', 'house', 'apartment', 'location'];
  const set = {};
  for (const k of allowed) if (k in req.body) set[k] = k === 'landlordName' ? formatName(req.body[k]) : clean(req.body[k]);
  const found = await Submission.findById(req.params.id).select('group').lean();
  if (!found) return res.status(404).json({ message: 'Yozuv topilmadi' });
  assertGroup(req, found.group);
  const s = await Submission.findByIdAndUpdate(req.params.id, set, { new: true });
  syncExcel();
  audit(req, 'submission.update', `${s.fullName}: ma’lumotni yangiladi${'rentStatus' in set ? ` (ijara holati: ${set.rentStatus || '—'})` : ''}`, s.group);
  res.json(s);
}));
admin.delete('/submissions/:id', wrap(async (req, res) => {
  const found = await Submission.findById(req.params.id).select('group').lean();
  if (found) assertGroup(req, found.group);
  const gone = await Submission.findByIdAndDelete(req.params.id);
  if (gone) audit(req, 'submission.delete', `${gone.fullName}: yozuvni o‘chirdi`, gone.group);
  syncExcel();
  res.json({ ok: true });
}));
admin.get('/export', wrap(async (req, res) => {
  const wb = await buildWorkbook(scopeIds(req));
  audit(req, 'export.excel', 'Excel yuklab oldi');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="hygge.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}));

admin.get('/monitor', wrap(async (req, res) => res.json(await buildReport(scopeIds(req)))));

admin.use(photosRouter);

app.use('/api/admin', admin);

/* ---------------- Production: React build ---------------- */
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Rasm hajmi 8 MB dan oshmasligi kerak' });
  if (err.name === 'MulterError') return res.status(400).json({ message: 'Rasm yuklashda xatolik' });
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err.code === 11000) return res.status(409).json({ message: 'Bunday yozuv allaqachon mavjud' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Maydonlar to‘liq emas' });
  res.status(500).json({ message: 'Serverda xatolik' });
});

await mongoose.connect(process.env.MONGO_URI);
await seed();
await ensureOwner();
await syncExcel();
app.listen(process.env.PORT || 5000, () => console.log(`Hygge server: http://localhost:${process.env.PORT || 5000}`));
