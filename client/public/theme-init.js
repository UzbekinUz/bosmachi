// Sahifa chizilishidan oldin rang rejimini o'rnatadi (miltillashsiz). Tashqi fayl: CSP inline skriptga ruxsat bermaydi.
(function () {
  var ground = { light: '#f2f4f7', dark: '#0c0d0f' };
  var theme = 'dark';
  var pref = 'system';
  try {
    var q = new URLSearchParams(location.search).get('theme');
    pref = q === 'light' || q === 'dark' ? q : localStorage.getItem('hygge_theme') || 'system';
    theme = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  } catch (e) { /* xotira yopiq bo'lsa, qorong'i */ }
  var root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-pref', pref);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', ground[theme]);
})();
