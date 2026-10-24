import crypto from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Group, User } from './models.js';
import { formatName } from './format.js';

const scrypt = promisify(crypto.scrypt);
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });

/* ---------- Parol ---------- */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function checkPassword(password, stored) {
  const [, saltHex, keyHex] = String(stored).split('$');
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, 'hex');
  const key = await scrypt(password, Buffer.from(saltHex, 'hex'), 64);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

export const publicUser = (u) => ({
  _id: u._id, username: u.username, fullName: u.fullName, role: u.role,
  groups: u.groups, active: u.active, mustChangePassword: u.mustChangePassword,
});

/* ---------- Kirish ---------- */
const DUMMY = await hashPassword('dummy-password');

export async function login(username, password) {
  const user = await User.findOne({ username: String(username || '').toLowerCase().trim() });
  const ok = await checkPassword(String(password || ''), user ? user.passwordHash : DUMMY);
  if (!user || !ok || !user.active) return null;
  return {
    token: jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '12h' }),
    user: publicUser(user),
  };
}

// Dastlabki egasi .env dagi ADMIN_USER/ADMIN_PASS dan yaratiladi.
// Parolni unutsangiz: ADMIN_RESET=true bilan ishga tushiring (ADMIN_PASS ga tiklanadi).
export async function ensureOwner() {
  const username = String(process.env.ADMIN_USER || 'admin').toLowerCase();
  const owner = await User.findOne({ role: 'owner' });
  if (!owner) {
    await User.create({ username, fullName: 'Egasi', role: 'owner', passwordHash: await hashPassword(process.env.ADMIN_PASS || 'admin123') });
    return;
  }
  if (process.env.ADMIN_RESET === 'true' && process.env.ADMIN_PASS) {
    owner.passwordHash = await hashPassword(process.env.ADMIN_PASS);
    owner.active = true;
    await owner.save();
    console.log(`Egasi (${owner.username}) paroli ADMIN_PASS ga tiklandi. ADMIN_RESET ni o'chirib qo'ying.`);
  }
}

/* ---------- Himoya va ko'rish doirasi ---------- */
export const auth = wrap(async (req, res, next) => {
  let payload;
  try {
    payload = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Avtorizatsiyadan o‘ting' });
  }
  const user = payload.sub && mongoose.isValidObjectId(payload.sub) ? await User.findById(payload.sub) : null;
  if (!user || !user.active) return res.status(401).json({ message: 'Avtorizatsiyadan o‘ting' });
  req.user = user;
  next();
});

export const ownerOnly = (req, res, next) => (
  req.user.role === 'owner' ? next() : res.status(403).json({ message: 'Bu amal faqat egasi uchun' })
);

// null — hamma guruh (egasi); massiv — kuratorga biriktirilgan guruhlar
export const scopeIds = (req) => (req.user.role === 'owner' ? null : req.user.groups.map(String));

export function assertGroup(req, groupId) {
  const ids = scopeIds(req);
  if (ids && !ids.includes(String(groupId))) throw httpError(403, 'Bu guruh sizga biriktirilmagan');
}

// So'ralgan guruh (ixtiyoriy) bo'yicha ruxsat etilgan guruhlar ro'yxati
export function resolveScope(req, requested) {
  if (requested) {
    if (!mongoose.isValidObjectId(requested)) throw httpError(400, 'Noto‘g‘ri identifikator');
    assertGroup(req, requested);
    return [String(requested)];
  }
  return scopeIds(req);
}

// Mongo filtri: egasi uchun bo'sh, kurator uchun faqat o'z guruhlari
export const inScope = (ids, field = 'group') => (ids ? { [field]: { $in: ids } } : {});

/* ---------- Hisob (hamma uchun) ---------- */
export const accountRouter = express.Router();

accountRouter.get('/me', (req, res) => res.json(publicUser(req.user)));

accountRouter.post('/me/password', wrap(async (req, res) => {
  const { current, password } = req.body || {};
  if (!(await checkPassword(String(current || ''), req.user.passwordHash))) throw httpError(400, 'Joriy parol noto‘g‘ri');
  if (String(password || '').length < 8) throw httpError(400, 'Yangi parol kamida 8 belgidan iborat bo‘lsin');
  req.user.passwordHash = await hashPassword(password);
  req.user.mustChangePassword = false;
  await req.user.save();
  res.json({ ok: true });
}));

/* ---------- Kuratorlarni boshqarish (faqat egasi) ---------- */
export const usersRouter = express.Router();
usersRouter.use('/users', ownerOnly);

const groupIds = async (list) => {
  const ids = (Array.isArray(list) ? list : []).filter((id) => mongoose.isValidObjectId(id));
  return (await Group.find({ _id: { $in: ids } }).select('_id').lean()).map((g) => g._id);
};

usersRouter.get('/users', wrap(async (req, res) => {
  const list = await User.find().sort({ role: 1, fullName: 1 }).lean();
  res.json(list.map((u) => publicUser(u)));
}));

usersRouter.post('/users', wrap(async (req, res) => {
  const username = String(req.body.username || '').toLowerCase().trim();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw httpError(400, 'Login 3-30 belgi: lotin harf, raqam, nuqta, defis');
  if (String(req.body.password || '').length < 8) throw httpError(400, 'Parol kamida 8 belgidan iborat bo‘lsin');
  const fullName = formatName(req.body.fullName);
  if (!fullName) throw httpError(400, 'Kuratorning ismini kiriting');
  const user = await User.create({
    username, fullName, role: 'curator', groups: await groupIds(req.body.groups),
    passwordHash: await hashPassword(req.body.password), mustChangePassword: true,
  });
  res.status(201).json(publicUser(user));
}));

usersRouter.put('/users/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'Foydalanuvchi topilmadi');
  if (req.body.fullName !== undefined) user.fullName = formatName(req.body.fullName) || user.fullName;
  if (user.role === 'curator') {
    if (req.body.groups !== undefined) user.groups = await groupIds(req.body.groups);
    if (req.body.active !== undefined) user.active = !!req.body.active;
  }
  if (req.body.password) {
    if (String(req.body.password).length < 8) throw httpError(400, 'Parol kamida 8 belgidan iborat bo‘lsin');
    user.passwordHash = await hashPassword(req.body.password);
    user.mustChangePassword = String(user._id) !== String(req.user._id);
  }
  await user.save();
  res.json(publicUser(user));
}));

usersRouter.delete('/users/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'Foydalanuvchi topilmadi');
  if (user.role === 'owner') throw httpError(400, 'Egasini o‘chirib bo‘lmaydi');
  await user.deleteOne();
  res.json({ ok: true });
}));
