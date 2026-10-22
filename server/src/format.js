const KEEP_LOWER = new Set(["o'g'li", "o'g'il", 'ogli', "o'gli", 'qizi', "qiz", 'kizi']);

// "ABDUQODIROVA saida abdumo’min QIZI" -> "Abduqodirova Saida Abdumo'min qizi"
export function formatName(value) {
  const words = String(value || '')
    .replace(/[‘’ʻʼ`´′]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('uz')
    .split(' ')
    .filter(Boolean);
  return words
    .map((w, i) => {
      if (i > 0 && KEEP_LOWER.has(w)) return w;
      return w.replace(/(^|-)(\p{L})/gu, (m, p, c) => p + c.toLocaleUpperCase('uz'));
    })
    .join(' ');
}

// "Familiya Ism": kamida uch so'z (familiya, ism, otasining ismi), faqat harf, apostrof, defis; raqam bo'lmasin
export function isFullName(value) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  return words.every((w) => /^[\p{L}'.-]+$/u.test(w) && (w.match(/\p{L}/gu) || []).length >= 2);
}
