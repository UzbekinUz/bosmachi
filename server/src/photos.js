import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import fs from 'node:fs';
import { Student, Photo, Submission } from './models.js';
import { storeOriginal, renderVariants, parseCrop, removeFiles, photoPath } from './storage.js';
import { buildReportDoc, reportPreview, addressOf } from './report.js';
import { assertGroup, resolveScope, inScope } from './users.js';
import { audit } from './audit.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const SLOTS = [1, 2, 3, 4];

// Xotira to'lib ketmasligi uchun: bitta fayl, 8 MB gacha (brauzer oldindan ~500 KB gacha siqadi)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 4, fieldSize: 1024 },
  fileFilter: (req, file, cb) => (
    ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error('Faqat JPEG, PNG yoki WebP rasm yuklash mumkin'), { status: 400 }))
  ),
});

const badRequest = (message) => Object.assign(new Error(message), { status: 400 });
const checkId = (id) => { if (!mongoose.isValidObjectId(id)) throw badRequest('Noto‘g‘ri identifikator'); };
const checkSlot = (v) => {
  const slot = Number(v);
  if (!SLOTS.includes(slot)) throw badRequest('Rasm joyi 1 dan 4 gacha bo‘lishi kerak');
  return slot;
};

// Talabani topib, ko'rish doirasi va forma to'ldirilganini tekshiradi
async function loadStudent(req) {
  checkId(req.params.id);
  const student = await Student.findById(req.params.id);
  if (!student) throw badRequest('Talaba topilmadi');
  assertGroup(req, student.group);
  if (!(await Submission.exists({ student: student._id }))) throw badRequest('Rasm faqat formani to‘ldirgan talaba uchun yuklanadi');
  return student;
}

// Admin router'ga ulanadi (JWT index.js dagi admin.use(auth) orqali allaqachon tekshiriladi)
export const photosRouter = express.Router();

// Faqat formani to'ldirgan talabalar va ularning rasmlari (guruh bo'yicha)
photosRouter.get('/photos/summary', wrap(async (req, res) => {
  const q = inScope(resolveScope(req, req.query.group));
  const done = await Submission.find(q).distinct('student');
  const students = await Student.find({ ...q, _id: { $in: done } }).populate('group', 'index').sort({ fullName: 1 }).lean();
  const ids = students.map((s) => s._id);
  const [photos, subs] = await Promise.all([
    Photo.find({ student: { $in: ids } }).lean(),
    Submission.find({ student: { $in: ids } }).lean(),
  ]);
  const subBy = Object.fromEntries(subs.map((s) => [String(s.student), s]));
  const byStudent = {};
  for (const p of photos) (byStudent[p.student] ||= []).push({ id: p._id, slot: p.slot, updatedAt: p.updatedAt, crop: p.crop?.w ? p.crop : null });
  res.json(students.map((s) => {
    const list = (byStudent[s._id] || []).sort((a, b) => a.slot - b.slot);
    const sub = subBy[String(s._id)];
    return {
      _id: s._id, fullName: s.fullName, groupIndex: s.group?.index || '', count: list.length, photos: list,
      // Tyutor xonadonga borishi uchun kerakli ma'lumotlar
      address: addressOf(sub), location: sub?.location || '', phone: sub?.phone || '', landlordName: sub?.landlordName || '',
    };
  }));
}));

// Rasm yuklash yoki almashtirish: asl rasm + (ixtiyoriy) kesim to'rtburchagi
photosRouter.put('/students/:id/photos/:slot', upload.single('photo'), wrap(async (req, res) => {
  const slot = checkSlot(req.params.slot);
  if (!req.file) throw badRequest('Rasm tanlanmagan');
  const student = await loadStudent(req);
  const rect = parseCrop(req.body.crop);

  const file = `${student._id}/${slot}`;
  let result;
  try {
    await storeOriginal(req.file.buffer, file);
    result = await renderVariants(file, rect);
  } catch (e) {
    if (e.status) throw e;
    throw badRequest('Rasmni o‘qib bo‘lmadi. Boshqa fayl tanlang');
  }
  const photo = await Photo.findOneAndUpdate(
    { student: student._id, slot },
    { student: student._id, group: student.group, slot, file, size: result.size, crop: result.crop },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  audit(req, 'photo.upload', `${student.fullName}: ${slot}-rasm yuklandi`, student.group);
  res.status(201).json({ id: photo._id, slot, updatedAt: photo.updatedAt, crop: photo.crop });
}));

// Faqat kesimni o'zgartirish: asl rasm qayta yuborilmaydi
photosRouter.put('/students/:id/photos/:slot/crop', wrap(async (req, res) => {
  const slot = checkSlot(req.params.slot);
  const student = await loadStudent(req);
  const rect = parseCrop(req.body);
  if (!rect) throw badRequest('Kesim ma’lumoti yo‘q');
  const photo = await Photo.findOne({ student: student._id, slot });
  if (!photo) throw badRequest('Bu joyda rasm yo‘q');

  const result = await renderVariants(photo.file, rect);
  photo.size = result.size;
  photo.crop = result.crop;
  await photo.save();
  audit(req, 'photo.crop', `${student.fullName}: ${slot}-rasm qayta kesildi`, student.group);
  res.json({ id: photo._id, slot, updatedAt: photo.updatedAt, crop: photo.crop });
}));

photosRouter.delete('/students/:id/photos/:slot', wrap(async (req, res) => {
  checkId(req.params.id);
  const slot = checkSlot(req.params.slot);
  const owner = await Student.findById(req.params.id).select('group fullName').lean();
  if (owner) assertGroup(req, owner.group);
  const photo = await Photo.findOneAndDelete({ student: req.params.id, slot });
  if (photo) {
    await removeFiles(photo.file);
    audit(req, 'photo.delete', `${owner?.fullName || ''}: ${slot}-rasm o‘chirildi`, owner?.group);
  }
  res.json({ ok: true });
}));

// Rasmni ko'rish (brauzer Authorization sarlavhasi bilan blob sifatida oladi)
photosRouter.get('/photos/:id/file', wrap(async (req, res) => {
  checkId(req.params.id);
  const photo = await Photo.findById(req.params.id).lean();
  if (!photo) return res.status(404).json({ message: 'Rasm topilmadi' });
  assertGroup(req, photo.group);
  const variant = ['thumb', 'original'].includes(req.query.v) ? req.query.v : 'full';
  let file = photoPath(photo.file, variant);
  if (!fs.existsSync(file)) file = photoPath(photo.file, 'full'); // eski rasmlarda asl nusxa yo'q
  if (!fs.existsSync(file)) return res.status(404).json({ message: 'Rasm fayli topilmadi' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(file).pipe(res);
}));

// Hisobotdan oldin tekshiruv
photosRouter.get('/report/preview', wrap(async (req, res) => {
  res.json(await reportPreview(resolveScope(req, req.query.group)));
}));

photosRouter.get('/report', wrap(async (req, res) => {
  const groupIds = resolveScope(req, req.query.group);
  const { buffer, name } = await buildReportDoc({ groupIds, missing: req.query.missing === 'skip' ? 'skip' : 'placeholder' });
  audit(req, 'report.download', `Word hisobot yuklab olindi (${name})`, req.query.group || null);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(buffer);
}));
