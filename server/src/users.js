import crypto from 'node:crypto';
import { promisify } from 'node:util';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Group, Student, Submission, Photo, User, AuditLog } from './models.js';
import { formatName } from './format.js';
import { audit } from './audit.js';
import { syncExcel } from './excel.js';

const scrypt = promisify(crypto.scrypt);
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });
const digits = (v) => String(v || '').replace(/\D/g, '');
const TOKEN_TTL = '8h';

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

// Zaif parollarni rad etadi: kamida 8 belgi, loginga o'xshamasin, bir xil belgidan iborat bo'lmasin
function assertStrongPassword(password, username = '') {
  const p = String(password || '');
  if (p.length < 8) throw httpError(400, 'Parol kamida 8 belgidan iborat bo‘lsin');
  if (p.length > 100) throw httpError(400, 'Parol juda uzun');
  if (/^(.)\1+$/.test(p) || /^(12345678|password|qwertyui|11111111)/i.test(p)) throw httpError(400, 'Parol juda oddiy, boshqasini tanlang');
  if (username && p.toLowerCase().includes(String(username).toLowerCase())) throw httpError(400, 'Parolda login bo‘lmasin');
}

export const publicUser = (u) => ({
  _id: u._id, username: u.username, fullName: u.fullName, role: u.role, phone: u.phone || '',
  groups: u.groups, active: u.active, mustChangePassword: u.mustChangePassword,
  lastLoginAt: u.lastLoginAt || null, lastActiveAt: u.lastActiveAt || null,
});

const signToken = (user) => jwt.sign({ sub: String(user._id), v: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

/* ---------- Kirish (urinishlar cheklovi bilan) ---------- */
const DUMMY = await hashPassword('dummy-password');
const failures = new Map(); // login -> { n, until }
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

export async function login(username, password) {
  const name = String(username || '').toLowerCase().trim().slice(0, 60);
  const f = failures.get(name);
  if (f && f.until > Date.now()) throw httpError(429, 'Juda ko‘p noto‘g‘ri urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring');

  const user = await User.findOne({ username: name });
  const ok = await checkPassword(String(password || '').slice(0, 200), user ? user.passwordHash : DUMMY);
  if (!user || !ok || !user.active) {
    const n = (f && f.until <= Date.now() ? 0 : f?.n || 0) + 1;
    failures.set(name, { n, until: n >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
    return null;
  }
  failures.delete(name);
  user.lastLoginAt = new Date();
  user.lastActiveAt = new Date();
  await user.save();
  audit({ user }, 'login', 'Tizimga kirdi');
  return { token: signToken(user), user: publicUser(user) };
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
    owner.tokenVersion += 1;
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
  // Parol almashtirilgan yoki o'chirilgan hisobning eski tokenlari ishlamaydi
  if (!user || !user.active || (user.tokenVersion || 0) !== payload.v) return res.status(401).json({ message: 'Avtorizatsiyadan o‘ting' });
  if (!user.lastActiveAt || Date.now() - user.lastActiveAt > 60 * 1000) {
    user.lastActiveAt = new Date();
    User.updateOne({ _id: user._id }, { lastActiveAt: user.lastActiveAt }).catch(() => {});
  }
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

// Kurator ismi/telefoni o'zgarsa, uning guruhlaridagi tyutor ma'lumoti ham yangilanadi (hujjat va Excel uchun)
async function syncTutorFields(user, oldName) {
  const groups = await Group.find({ _id: { $in: user.groups } });
  for (const g of groups) {
    if (g.tutor && g.tutor !== oldName && g.tutor !== user.fullName) continue; // qo'lda boshqa tyutor yozilgan
    g.tutor = user.fullName;
    g.tutorPhone = user.phone;
    await g.save(); // eslint-disable-line no-await-in-loop
    await Submission.updateMany({ group: g._id }, { tutor: g.tutor, tutorPhone: g.tutorPhone }); // eslint-disable-line no-await-in-loop
  }
  syncExcel();
}

/* ---------- Hisob (hamma uchun) ---------- */
export const accountRouter = express.Router();

accountRouter.get('/me', (req, res) => res.json(publicUser(req.user)));

accountRouter.put('/me', wrap(async (req, res) => {
  const oldName = req.user.fullName;
  if (req.body.fullName !== undefined) {
    const name = formatName(req.body.fullName);
    if (!name) throw httpError(400, 'Ismni kiriting');
    req.user.fullName = name;
  }
  if (req.body.phone !== undefined) {
    if (digits(req.body.phone).length < 9) throw httpError(400, 'Telefon raqami noto‘g‘ri');
    req.user.phone = String(req.body.phone).trim().slice(0, 30);
  }
  await req.user.save();
  if (req.user.role === 'curator') await syncTutorFields(req.user, oldName);
  audit(req, 'profile.update', 'Profilini yangiladi');
  res.json(publicUser(req.user));
}));

// Parol almashtirilgach barcha eski tokenlar bekor bo'ladi; yangi token qaytariladi
accountRouter.post('/me/password', wrap(async (req, res) => {
  const { current, password } = req.body || {};
  if (!(await checkPassword(String(current || ''), req.user.passwordHash))) throw httpError(400, 'Joriy parol noto‘g‘ri');
  assertStrongPassword(password, req.user.username);
  if (await checkPassword(String(password), req.user.passwordHash)) throw httpError(400, 'Yangi parol eskisidan farq qilsin');
  req.user.passwordHash = await hashPassword(password);
  req.user.mustChangePassword = false;
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();
  audit(req, 'password.change', 'Parolini almashtirdi');
  res.json({ ok: true, token: signToken(req.user) });
}));

/* ---------- Egasi: kuratorlarni boshqarish va nazorat qilish ---------- */
export const usersRouter = express.Router();
usersRouter.use(['/users', '/overview', '/activity'], ownerOnly);

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
  assertStrongPassword(req.body.password, username);
  const fullName = formatName(req.body.fullName);
  if (!fullName) throw httpError(400, 'Kuratorning ismini kiriting');
  if (digits(req.body.phone).length < 9) throw httpError(400, 'Kuratorning telefon raqamini kiriting');
  const user = await User.create({
    username, fullName, phone: String(req.body.phone).trim().slice(0, 30), role: 'curator', groups: await groupIds(req.body.groups),
    passwordHash: await hashPassword(req.body.password), mustChangePassword: true,
  });
  audit(req, 'user.create', `Kurator yaratdi: ${fullName} (@${username})`);
  res.status(201).json(publicUser(user));
}));

usersRouter.put('/users/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'Foydalanuvchi topilmadi');
  const oldName = user.fullName;
  if (req.body.fullName !== undefined) user.fullName = formatName(req.body.fullName) || user.fullName;
  if (req.body.phone !== undefined) {
    if (digits(req.body.phone).length < 9) throw httpError(400, 'Telefon raqami noto‘g‘ri');
    user.phone = String(req.body.phone).trim().slice(0, 30);
  }
  if (user.role === 'curator') {
    if (req.body.groups !== undefined) user.groups = await groupIds(req.body.groups);
    if (req.body.active !== undefined) {
      user.active = !!req.body.active;
      if (!user.active) user.tokenVersion += 1;
    }
  }
  if (req.body.password) {
    assertStrongPassword(req.body.password, user.username);
    user.passwordHash = await hashPassword(req.body.password);
    user.tokenVersion += 1;
    user.mustChangePassword = String(user._id) !== String(req.user._id);
  }
  await user.save();
  if (user.role === 'curator') await syncTutorFields(user, oldName);
  audit(req, 'user.update', `Kuratorni yangiladi: ${user.fullName}`);
  res.json(publicUser(user));
}));

usersRouter.delete('/users/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'Foydalanuvchi topilmadi');
  if (user.role === 'owner') throw httpError(400, 'Egasini o‘chirib bo‘lmaydi');
  await user.deleteOne();
  // Kuratorning guruhlari o'chmaydi: egasiga qaytadi (biriktirilmagan bo'lib qoladi)
  audit(req, 'user.delete', `Kuratorni o‘chirdi: ${user.fullName} (@${user.username})`);
  res.json({ ok: true });
}));

// Har bir kurator va uning guruhlari bo'yicha ish holati
usersRouter.get('/overview', wrap(async (req, res) => {
  const [users, groups, students, subs, photoCounts] = await Promise.all([
    User.find({ role: 'curator' }).sort({ fullName: 1 }).lean(),
    Group.find().sort({ index: 1 }).lean(),
    Student.aggregate([{ $group: { _id: '$group', n: { $sum: 1 } } }]),
    Submission.aggregate([{ $group: { _id: '$group', n: { $sum: 1 } } }]),
    Photo.aggregate([
      { $group: { _id: { student: '$student', group: '$group' }, n: { $sum: 1 } } },
      { $match: { n: 4 } },
      { $group: { _id: '$_id.group', complete: { $sum: 1 } } },
    ]),
  ]);
  const by = (arr, key) => Object.fromEntries(arr.map((x) => [String(x._id), x[key]]));
  const nStudents = by(students, 'n');
  const nSubs = by(subs, 'n');
  const nComplete = by(photoCounts, 'complete');
  const groupInfo = (g) => ({
    _id: g._id, index: g.index, tutor: g.tutor,
    students: nStudents[String(g._id)] || 0, submitted: nSubs[String(g._id)] || 0, photosComplete: nComplete[String(g._id)] || 0,
  });
  const byId = Object.fromEntries(groups.map((g) => [String(g._id), g]));
  const assigned = new Set();
  const curators = users.map((u) => {
    const list = (u.groups || []).map((id) => byId[String(id)]).filter(Boolean).map(groupInfo);
    list.forEach((g) => assigned.add(String(g._id)));
    const sum = (k) => list.reduce((a, g) => a + g[k], 0);
    return { ...publicUser(u), groupList: list, totals: { groups: list.length, students: sum('students'), submitted: sum('submitted'), photosComplete: sum('photosComplete') } };
  });
  res.json({ curators, unassigned: groups.filter((g) => !assigned.has(String(g._id))).map(groupInfo) });
}));

// Faoliyat jurnali (oxirgi amallar), kurator bo'yicha saralash mumkin
usersRouter.get('/activity', wrap(async (req, res) => {
  const q = {};
  if (req.query.user) {
    if (!mongoose.isValidObjectId(req.query.user)) throw httpError(400, 'Noto‘g‘ri identifikator');
    q.user = req.query.user;
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
  res.json(await AuditLog.find(q).sort({ at: -1 }).limit(limit).lean());
}));
