import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const Group = model('Group', new Schema({
  index: { type: String, required: true, unique: true, trim: true }, // I-87/25i
  faculty: { type: String, required: true, trim: true },
  direction: { type: String, required: true, trim: true },
  course: { type: String, required: true, trim: true }, // 2-kurs
  tutor: { type: String, default: '', trim: true },
  tutorPhone: { type: String, default: '', trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true }));

const Student = model('Student', new Schema({
  fullName: { type: String, required: true, trim: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
}, { timestamps: true }));

// type: region | district | rentStatus. District.parent = region nomi.
const Option = model('Option', new Schema({
  type: { type: String, required: true, index: true },
  value: { type: String, required: true, trim: true },
  parent: { type: String, default: '' },
}));

// Formada qaysi maydonlar yig'ilishini admin boshqaradi
const FieldConfig = model('FieldConfig', new Schema({
  key: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  enabled: { type: Boolean, default: true },
  required: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}));

const Submission = model('Submission', new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  // Yuborilgan paytdagi nusxa (guruh keyin o'zgarsa ham Excel buzilmasin)
  groupIndex: String,
  faculty: String,
  direction: String,
  course: String,
  tutor: String,
  tutorPhone: String,
  fullName: String,
  phone: String,
  rentStatus: { type: String, default: '' }, // faqat admin belgilaydi
  landlordName: String,
  landlordPhone: String,
  cohabitants: [{ info: String, fullName: String, phone: String, address: String, _id: false }],
  region: String,
  district: String,
  mahalla: String,
  street: String,
  house: String,
  apartment: String,
  location: String,
}, { timestamps: true }));

// Tyutor yuklagan rasmlar: har talabaga 4 ta joy (slot 1-4). Fayllar diskda, bu yerda faqat yo'li.
const Photo = model('Photo', new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  group: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  slot: { type: Number, required: true, min: 1, max: 4 },
  file: { type: String, required: true }, // "<talabaId>/<slot>" — kengaytma va o'lcham nomi storage.js'da
  size: { type: Number, default: 0 },
  // Asl rasmdan qaysi qismi olingani (0..1 ulushlar). Bo'sh bo'lsa — markazdan avtomatik kesilgan
  crop: { x: Number, y: Number, w: Number, h: Number, _id: false },
}, { timestamps: true }));
Photo.schema.index({ student: 1, slot: 1 }, { unique: true });

// Platforma foydalanuvchilari: egasi (owner) va kuratorlar (curator). Kurator faqat o'ziga biriktirilgan guruhlarni ko'radi.
const User = model('User', new Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  fullName: { type: String, default: '', trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'curator'], default: 'curator' },
  groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
  active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  phone: { type: String, default: '', trim: true }, // hujjatlarda (hisobot) ishlatiladi
  tokenVersion: { type: Number, default: 0 }, // oshirilsa, eski tokenlar ishlamay qoladi
  lastLoginAt: Date,
  lastActiveAt: Date,
}, { timestamps: true }));

const AuditLog = model('AuditLog', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  username: String,
  fullName: String,
  action: { type: String, index: true },
  summary: String,
  group: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
  at: { type: Date, default: Date.now, index: true, expires: 60 * 60 * 24 * 180 },
}));

export { Group, Student, Option, FieldConfig, Submission, Photo, User, AuditLog };
