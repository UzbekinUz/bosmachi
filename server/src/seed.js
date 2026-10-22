import { Group, Student, Option, FieldConfig } from './models.js';

export const DEFAULT_FIELDS = [
  ['phone', 'Telefon raqami', true],
  ['landlordName', 'Uy egasining ismi', false],
  ['landlordPhone', 'Uy egasining telefon raqami', false],
  ['cohabitants', 'Kimlar bilan istiqomat qiladi', false],
  ['region', 'Viloyat / shahar', true],
  ['district', 'Tuman', true],
  ['mahalla', 'Mahalla (MFY)', true],
  ['street', "Ko'cha", true],
  ['house', 'Uy', true],
  ['apartment', 'Xonadon', false],
  ['location', 'Ijara geolokatsiyasi', false],
];

const REGIONS = [
  'Toshkent shahar', 'Toshkent viloyati', 'Andijon viloyati', 'Buxoro viloyati',
  "Farg'ona viloyati", 'Jizzax viloyati', 'Xorazm viloyati', 'Namangan viloyati',
  'Navoiy viloyati', 'Qashqadaryo viloyati', "Qoraqalpog'iston Respublikasi",
  'Samarqand viloyati', 'Sirdaryo viloyati', 'Surxondaryo viloyati',
];

const TASHKENT_DISTRICTS = [
  'Bektemir', 'Chilonzor', 'Mirobod', "Mirzo Ulug'bek", 'Olmazor', 'Sergeli',
  'Shayxontohur', 'Uchtepa', 'Yakkasaroy', 'Yangihayot', 'Yashnobod', 'Yunusobod',
];

const RENT_STATUSES = ['Yashil', 'Sariq', 'Qizil'];

export async function seed() {
  if (!(await FieldConfig.countDocuments())) {
    await FieldConfig.insertMany(DEFAULT_FIELDS.map(([key, label, required], order) => (
      { key, label, required, order }
    )));
  }
  if (!(await Option.countDocuments())) {
    await Option.insertMany([
      ...REGIONS.map((value) => ({ type: 'region', value })),
      ...TASHKENT_DISTRICTS.map((value) => ({ type: 'district', value, parent: 'Toshkent shahar' })),
      ...RENT_STATUSES.map((value) => ({ type: 'rentStatus', value })),
    ]);
  }
  if (process.env.SEED_DEMO === 'true' && !(await Group.countDocuments())) {
    const g = await Group.create({
      index: 'I-87/25i', faculty: 'Iqtisodiyot', direction: 'Iqtisodiyot', course: '2-kurs', tutor: 'Karimov Aziz', tutorPhone: '90 123 45 67',
    });
    await Student.insertMany(
      ['Abdullayev Jasur', 'Karimova Dilnoza', "Rahimov Sardor", "Yusupova Madina"]
        .map((fullName) => ({ fullName, group: g._id })),
    );
  }
}
