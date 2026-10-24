import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { api, formatPhone } from '../api.js';
import { Alert, Button, Card, Field, Input, Logo, Picker } from '../components/ui.jsx';
import MapPicker, { mapsLink } from '../components/MapPicker.jsx';

const REGION = 'Toshkent shahar';
const emptyForm = { phone: '', landlordName: '', landlordPhone: '', region: REGION, district: '', mahalla: '', street: '', house: '', apartment: '', location: '' };
const emptyPerson = { info: '', fullName: '', phone: '' };

const Section = ({ title, hint, children }) => (
  <section>
    <Card className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-snug text-slate-300">{hint}</p>}
      </div>
      {children}
    </Card>
  </section>
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
    <div className="min-h-screen">
      <header className="border-b border-[var(--rule)]">
        <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-4">
          <Logo />
          <Link to="/admin" className="rounded-full px-2 py-1.5 text-sm text-slate-300 transition hover:text-white">Admin</Link>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-32 pt-8">
        <h1 className="text-2xl font-semibold text-white">Ijara ma’lumotlari</h1>
        {!done && <p className="mb-6 mt-1 text-[15px] leading-relaxed text-slate-300">Ijarada yoki boshqa joyda yashayotgan talabalar uchun. To‘ldirish 2-3 daqiqa oladi, har bir talaba formani faqat bir marta yuboradi.</p>}

        {!cfg && !error && <p className="py-10 text-center text-slate-400">Yuklanmoqda…</p>}

        {done ? (
          <Card className="mt-6 py-10 text-center">
            <svg className="mx-auto mb-4 h-10 w-10 text-positive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9.5" />
              <motion.path d="M7.5 12.5l3 3 6-7" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35 }} />
            </svg>
            <h2 className="text-lg font-semibold text-white">Ma’lumotlaringiz qabul qilindi</h2>
            <p className="mt-1 text-sm text-slate-300">Xatolik bo‘lsa, guruh tyutoringizga murojaat qiling.</p>
            <Button variant="ghost" className="mt-6" onClick={reset}>Yangi forma to‘ldirish</Button>
          </Card>
        ) : cfg && (
          <form onSubmit={submit} className="space-y-4">
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
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-3 rounded-[14px] bg-ink-700 p-4 text-sm">
                    {[['Fakultet', group.faculty], ['Yo‘nalish', group.direction], ['Kurs', group.course], ['Guruh tyutori', group.tutor || '—']].map(([k, v]) => (
                      <div key={k}><dt className="text-xs text-slate-300">{k}</dt><dd className="font-medium text-white">{v}</dd></div>
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
                <p className="text-sm text-warning">Bu guruhda formani to‘ldirmagan talaba qolmagan.</p>
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
              <Section title={`${lbl('cohabitants')}${req('cohabitants') ? ' *' : ''}`} hint="Siz bilan bir xonadonda yashaydigan boshqa odamlar. Har biri uchun kim ekanini (masalan: TDPI talabasi), to‘liq ismi va telefonini yozing. Yolg‘iz yashasangiz, bo‘sh qoldiring.">
                <AnimatePresence initial={false}>
                  {people.map((p, i) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-[14px] bg-ink-700 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white">{i + 1}-shaxs</span>
                          <button type="button" onClick={() => setPeople(people.filter((x) => x.id !== p.id))} className="min-h-9 rounded-full px-3 text-sm text-negative transition hover:bg-negative/10">O‘chirish</button>
                        </div>
                        <Input placeholder="Kim ekanligi (masalan: TDPI talabasi)" value={p.info} onChange={(e) => setPerson(i, { info: e.target.value })} />
                        <Input placeholder="Familiya Ism Otasining ismi" value={p.fullName} onChange={(e) => setPerson(i, { fullName: e.target.value })} />
                        <Input type="tel" inputMode="tel" placeholder="Telefon raqami" value={p.phone} onChange={(e) => setPerson(i, { phone: formatPhone(e.target.value) })} />
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setPeople([...people, { ...emptyPerson, id: crypto.randomUUID() }])}>Shaxs qo‘shish</Button>
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
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="ghost" onClick={() => setMapOpen(true)}>Xaritadan belgilash</Button>
                      <Button type="button" variant="ghost" onClick={locate} disabled={locating}>{locating ? 'Aniqlanmoqda…' : 'Joriy joylashuvim'}</Button>
                    </div>
                  </Field>
                )}
              </Section>
            )}

            <Alert>{error}</Alert>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--rule)] bg-ink-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className="mx-auto max-w-xl">
                <Button type="submit" disabled={busy || !studentId} className="w-full !min-h-12 text-base">{busy ? 'Yuborilmoqda…' : 'Yuborish'}</Button>
              </div>
            </div>
          </form>
        )}

        {!cfg && error && <Alert>{error}</Alert>}
      </main>
      <AnimatePresence>
        {mapOpen && <MapPicker value={form.location} onClose={() => setMapOpen(false)} onSelect={(link) => setForm((f) => ({ ...f, location: link }))} />}
      </AnimatePresence>
    </div>
  );
}
