import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import fs from 'node:fs';
import { Student, Photo } from './models.js';
import { saveVariants, removeFiles, photoPath } from './storage.js';
import { buildReportDoc, reportPreview } from './report.js';

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const SLOTS = [1, 2, 3, 4];

// Xotira to'lib ketmasligi uchun: bitta fayl, 8 MB gacha (brauzer oldindan ~300 KB gacha siqadi)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
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

// Admin router'ga ulanadi (JWT index.js dagi admin.use(auth) orqali allaqachon tekshiriladi)
export const photosRouter = express.Router();

// Talabalar ro'yxati va ularning rasmlari (guruh bo'yicha)
photosRouter.get('/photos/summary', wrap(async (req, res) => {
  if (req.query.group) checkId(req.query.group);
  const q = req.query.group ? { group: req.query.group } : {};
  const students = await Student.find(q).populate('group', 'index').sort({ fullName: 1 }).lean();
  const photos = await Photo.find({ student: { $in: students.map((s) => s._id) } }).lean();
  const byStudent = {};
  for (const p of photos) (byStudent[p.student] ||= []).push({ id: p._id, slot: p.slot, updatedAt: p.updatedAt });
  res.json(students.map((s) => {
    const list = (byStudent[s._id] || []).sort((a, b) => a.slot - b.slot);
    return { _id: s._id, fullName: s.fullName, groupIndex: s.group?.index || '', count: list.length, photos: list };
  }));
}));

// Rasm yuklash yoki almashtirish
photosRouter.put('/students/:id/photos/:slot', upload.single('photo'), wrap(async (req, res) => {
  checkId(req.params.id);
  const slot = checkSlot(req.params.slot);
  if (!req.file) throw badRequest('Rasm tanlanmagan');
  const student = await Student.findById(req.params.id);
  if (!student) throw badRequest('Talaba topilmadi');

  const file = `${student._id}/${slot}`;
  let size;
  try {
    size = await saveVariants(req.file.buffer, file);
  } catch (e) {
    if (e.status) throw e;
    throw badRequest('Rasmni o‘qib bo‘lmadi. Boshqa fayl tanlang');
  }
  const photo = await Photo.findOneAndUpdate(
    { student: student._id, slot },
    { student: student._id, group: student.group, slot, file, size },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ id: photo._id, slot, updatedAt: photo.updatedAt });
}));

photosRouter.delete('/students/:id/photos/:slot', wrap(async (req, res) => {
  checkId(req.params.id);
  const slot = checkSlot(req.params.slot);
  const photo = await Photo.findOneAndDelete({ student: req.params.id, slot });
  if (photo) await removeFiles(photo.file);
  res.json({ ok: true });
}));

// Rasmni ko'rish (brauzer Authorization sarlavhasi bilan blob sifatida oladi)
photosRouter.get('/photos/:id/file', wrap(async (req, res) => {
  checkId(req.params.id);
  const photo = await Photo.findById(req.params.id).lean();
  if (!photo) return res.status(404).json({ message: 'Rasm topilmadi' });
  const file = photoPath(photo.file, req.query.v === 'thumb' ? 'thumb' : 'full');
  if (!fs.existsSync(file)) return res.status(404).json({ message: 'Rasm fayli topilmadi' });
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'private, max-age=3600');
  fs.createReadStream(file).pipe(res);
}));

// Hisobotdan oldin tekshiruv
photosRouter.get('/report/preview', wrap(async (req, res) => {
  if (req.query.group) checkId(req.query.group);
  res.json(await reportPreview(req.query.group));
}));

photosRouter.get('/report', wrap(async (req, res) => {
  if (req.query.group) checkId(req.query.group);
  const { buffer, name } = await buildReportDoc({ groupId: req.query.group, missing: req.query.missing === 'skip' ? 'skip' : 'placeholder' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
  res.send(buffer);
}));
