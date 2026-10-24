import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, formatPhone } from '../api.js';
import { Alert, Button, Card, Field, Input, Item, Logo, Picker, Stagger } from '../components/ui.jsx';
import MapPicker, { mapsLink } from '../components/MapPicker.jsx';

const REGION = 'Toshkent shahar';
const emptyForm = { phone: '', landlordName: '', landlordPhone: '', region: REGION, district: '', mahalla: '', street: '', house: '', apartment: '', location: '' };
const emptyPerson = { info: '', fullName: '', phone: '' };

const Section = ({ title, hint, children }) => (
  <Item as="section">
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {hint && <p className="mt-1 text-[14px] leading-snug text-slate-300">{hint}</p>}
      </div>
      {children}
    </Card>
  </Item>
);

const Collapse = ({ show, children }) => (
  <AnimatePresence initial={false}>
    {show && (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);

export default function FormPage() {
  const [cfg, setCfg] = useState(null);
  const [groupId, setGroupId] = useState('');
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [people, setPeople] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => { api('/public/config').then(setCfg).catch((e) => setError(e.message)); }, []);

  const group = cfg?.groups.find((g) => g._id === groupId);
  const fields = useMemo(() => (cfg?.fields || []).filter((f) => f.enabled), [cfg]);
  const fieldMap = Object.fromEntries(fields.map((f) => [f.key, f]));
  const req = (k) => fieldMap[k]?.required;
  const lbl = (k) => fieldMap[k]?.label;

  const pickGroup = (id) => {
    setGroupId(id); setStudentId(''); setStudents([]);
    if (id) api(`/public/groups/${id}/students`).then(setStudents).catch((e) => setError(e.message));
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPhone = (k) => (e) => setForm((f) => ({ ...f, [k]: formatPhone(e.target.value) }));
  const setPerson = (i, patch) => setPeople((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const districts = (cfg?.districts || []).filter((d) => d.region === REGION);

  const locate = () => {
    if (!navigator.geolocation) return setError('Brauzer joylashuvni qo‘llab-quvvatlamaydi');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setForm((f) => ({ ...f, location: mapsLink([p.coords.latitude, p.coords.longitude]) })); setLocating(false); setError(''); },
      () => { setError('Joylashuvni aniqlab bo‘lmadi. Xaritadan belgilang yoki havolani kiriting.'); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/public/submissions', {
        method: 'POST',
        body: { student: studentId, ...form, cohabitants: people.map(({ id, ...p }) => p) }, // eslint-disable-line no-unused-vars
      });
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const reset = () => { setDone(false); setGroupId(''); setStudentId(''); setStudents([]); setForm(emptyForm); setPeople([]); };

  const hasAddress = ['region', 'district', 'mahalla', 'street', 'house', 'apartment', 'location'].some((k) => fieldMap[k]);

  return (
    <div className="mx-auto max-w-xl px-4 pb-32 pt-5 sm:pt-10">
      <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-5 flex items-center justify-between">
        <Logo />
        <Link to="/admin" className="rounded-lg px-2 py-1.5 text-sm text-slate-500 transition hover:text-brand-400">Admin</Link>
      </motion.header>

      {!done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h1 className="text-2xl font-semibold text-white">Ijara ma’lumotlari</h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate-300">Ijarada yoki boshqa joyda yashayotgan talabalar uchun. To‘ldirish 2-3 daqiqa oladi, har bir talaba formani faqat bir marta yuboradi.</p>
        </motion.div>
      )}

      {!cfg && !error && <p className="py-10 text-center text-slate-400">Yuklanmoqda…</p>}

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="py-12 text-center">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-300"
              >
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45 }} />
                </svg>
              </motion.div>
              <h2 className="text-xl font-semibold text-white">Rahmat! Ma’lumotlaringiz qabul qilindi</h2>
              <p className="mt-1 text-sm text-slate-400">Xatolik bo‘lsa, guruh tyutoringizga murojaat qiling.</p>
              <Button className="mt-7" onClick={reset}>Yangi forma</Button>
            </Card>
          </motion.div>
        ) : cfg && (
          <Stagger as="form" key="form" onSubmit={submit} className="space-y-4">
            <Section title="Talaba" hint="Guruhingizni, so‘ng ro‘yxatdan ismingizni tanlang. Ismingiz topilmasa, guruh tyutoringizga murojaat qiling.">
              <Field label="Guruh" required>
                <Picker
                  title="Guruhni tanlang" placeholder="Guruhni tanlang…" required
                  value={groupId} onChange={pickGroup}
                  options={cfg.groups.map((g) => ({ value: g._id, label: g.index, hint: `${g.faculty} · ${g.course}` }))}
                />
              </Field>

              <Collapse show={!!group}>
                {group && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-lg border border-ink-600/60 bg-ink-900/60 p-3 text-sm">
                    {[['Fakultet', group.faculty], ['Yo‘nalish', group.direction], ['Kurs', group.course], ['Guruh tyutori', group.tutor || '—']].map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="font-medium text-blue-100">{v}</dd></div>
                    ))}
                  </dl>
                )}
              </Collapse>

              <Field label="To‘liq ismi" required>
                <Picker
                  title="Ismingizni tanlang" required disabled={!groupId}
                  placeholder={groupId ? 'Ismingizni tanlang…' : 'Avval guruhni tanlang'}
                  value={studentId} onChange={setStudentId}
                  options={students.map((s) => ({ value: s._id, label: s.fullName }))}
                />
              </Field>
              <Collapse show={!!groupId && !students.length}>
                <p className="text-sm text-amber-300">Bu guruhda formani to‘ldirmagan talaba qolmagan.</p>
              </Collapse>
            </Section>

            <Section title="Aloqa ma’lumotlari" hint="Telefon raqamlari +998 bilan avtomatik yoziladi. Uy egasining ismini familiya, ism va otasining ismi bilan to‘liq yozing.">
              {fieldMap.phone && (
                <Field label={lbl('phone')} required={req('phone')}>
                  <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={setPhone('phone')} required={req('phone')} />
                </Field>
              )}
              {fieldMap.landlordName && (
                <Field label={lbl('landlordName')} required={req('landlordName')} hint="Familiya, ism, otasining ismi">
                  <Input value={form.landlordName} onChange={set('landlordName')} placeholder="Familiya Ism Otasining ismi" autoComplete="off" required={req('landlordName')} />
                </Field>
              )}
              {fieldMap.landlordPhone && (
                <Field label={lbl('landlordPhone')} required={req('landlordPhone')}>
                  <Input type="tel" inputMode="tel" placeholder="+998 90 123 45 67" value={form.landlordPhone} onChange={setPhone('landlordPhone')} required={req('landlordPhone')} />
                </Field>
              )}
            </Section>

            {fieldMap.cohabitants && (
              <Section title={`${lbl('cohabitants')}${req('cohabitants') ? ' *' : ''}`} hint="Siz bilan bir xonadonda yashaydigan boshqa odamlar. Har biri uchun kim ekanini (masalan: TDPI talabasi), to‘liq ismi va telefonini yozing.">
                <p className="-mt-1 text-xs text-slate-400">Yolg‘iz yashasangiz, bo‘sh qoldiring.</p>
                <AnimatePresence initial={false}>
                  {people.map((p, i) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-lg border border-ink-600/60 bg-ink-900/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{i + 1}-shaxs</span>
                          <button type="button" onClick={() => setPeople(people.filter((x) => x.id !== p.id))} className="rounded-md px-2 py-1 text-sm text-red-300 transition hover:bg-red-500/10">O‘chirish</button>
                        </div>
                        <Input placeholder="Kim ekanligi (masalan: TDPI talabasi)" value={p.info} onChange={(e) => setPerson(i, { info: e.target.value })} />
                        <Input placeholder="Familiya Ism Otasining ismi" value={p.fullName} onChange={(e) => setPerson(i, { fullName: e.target.value })} />
                        <Input type="tel" inputMode="tel" placeholder="Telefon raqami" value={p.phone} onChange={(e) => setPerson(i, { phone: formatPhone(e.target.value) })} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setPeople([...people, { ...emptyPerson, id: crypto.randomUUID() }])}>+ Shaxs qo‘shish</Button>
              </Section>
            )}

            {hasAddress && (
              <Section title="Ijara manzili" hint="Hozir ijarada turgan xonadon manzili. Lokatsiyani xaritadan belgilasangiz, tyutor uni oson topadi.">
                {fieldMap.region && (
                  <Field label={lbl('region')}>
                    <Input value={REGION} readOnly tabIndex={-1} className="cursor-not-allowed opacity-70" />
                  </Field>
                )}
                {fieldMap.district && (
                  <Field label={lbl('district')} required={req('district')}>
                    {districts.length ? (
                      <Picker
                        title="Tumanni tanlang" placeholder="Tumanni tanlang…" required={req('district')}
                        value={form.district} onChange={(v) => setForm((f) => ({ ...f, district: v }))}
                        options={districts.map((d) => ({ value: d.value, label: d.value }))}
                      />
                    ) : (
                      <Input value={form.district} onChange={set('district')} placeholder="Tuman nomi" required={req('district')} />
                    )}
                  </Field>
                )}
                {fieldMap.mahalla && <Field label={lbl('mahalla')} required={req('mahalla')}><Input value={form.mahalla} onChange={set('mahalla')} placeholder="MFY nomi" required={req('mahalla')} /></Field>}
                {fieldMap.street && <Field label={lbl('street')} required={req('street')}><Input value={form.street} onChange={set('street')} placeholder="Ko‘cha nomi" required={req('street')} /></Field>}
                {(fieldMap.house || fieldMap.apartment) && (
                  <div className="grid grid-cols-2 gap-3">
                    {fieldMap.house && <Field label={lbl('house')} required={req('house')}><Input value={form.house} onChange={set('house')} placeholder="Raqami" required={req('house')} /></Field>}
                    {fieldMap.apartment && <Field label={lbl('apartment')} required={req('apartment')}><Input value={form.apartment} onChange={set('apartment')} placeholder="Raqami" required={req('apartment')} /></Field>}
                  </div>
                )}

                {fieldMap.location && (
                  <Field label={lbl('location')} required={req('location')} hint="Havolani kiriting yoki xaritadan belgilang">
                    <Input type="url" inputMode="url" value={form.location} onChange={set('location')} placeholder="https://maps.google.com/…" required={req('location')} />
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="ghost" onClick={() => setMapOpen(true)}>📍 Xaritadan belgilash</Button>
                      <Button type="button" variant="ghost" onClick={locate} disabled={locating}>{locating ? 'Aniqlanmoqda…' : '🎯 Joriy joylashuvim'}</Button>
                    </div>
                  </Field>
                )}
              </Section>
            )}

            <Alert>{error}</Alert>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700 bg-ink-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className="mx-auto max-w-xl">
                <Button type="submit" disabled={busy || !studentId} className="w-full !min-h-12 text-base">{busy ? 'Yuborilmoqda…' : 'Yuborish'}</Button>
              </div>
            </div>
          </Stagger>
        )}
      </AnimatePresence>

      {!cfg && error && <Alert>{error}</Alert>}
      <AnimatePresence>
        {mapOpen && <MapPicker value={form.location} onClose={() => setMapOpen(false)} onSelect={(link) => setForm((f) => ({ ...f, location: link }))} />}
      </AnimatePresence>
    </div>
  );
}
