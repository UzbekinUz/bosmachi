import { AuditLog } from './models.js';

// Muhim amallarni yozib boradi: egasi kuratorlar faoliyatini ko'ra oladi.
// Jurnal yozishdagi xato asosiy amalni to'xtatmaydi.
export function audit(req, action, summary, group = null) {
  const u = req.user;
  AuditLog.create({
    user: u?._id, username: u?.username, fullName: u?.fullName, action, summary: String(summary || '').slice(0, 300), group,
  }).catch((e) => console.error('Jurnalga yozishda xato:', e.message));
}
