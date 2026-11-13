/* Persen muat di layar pembuka. Berkas terpisah karena aplikasi tidak mengizinkan skrip di dalam halaman. */
(function () {
  var box = document.getElementById('prog');
  if (!box) return;
  var bar = box.querySelector('em'), pct = box.querySelector('strong'), lab = box.querySelector('span');
  var sec = box.querySelector('small'), lambat = box.querySelector('p');
  var t0 = Date.now(), nilai = 5, urls = [], sudah = {};
  var tags = document.querySelectorAll('script[type="module"][src],link[rel="stylesheet"][href],link[rel="modulepreload"][href]');
  for (var i = 0; i < tags.length; i++) urls.push(tags[i].src || tags[i].href);

  function set(p, teks) {
    if (p <= nilai) return;
    nilai = Math.min(100, Math.round(p));
    bar.style.width = nilai + '%'; pct.textContent = nilai + '%';
    if (teks) lab.textContent = teks;
  }
  function hitung() {
    var n = 0;
    for (var k = 0; k < urls.length; k++) if (sudah[urls[k]]) n++;
    if (urls.length) set(10 + 80 * n / urls.length, 'Mengunduh aplikasi…');
  }
  try {
    new PerformanceObserver(function (l) {
      l.getEntries().forEach(function (e) { sudah[e.name] = 1; });
      hitung();
    }).observe({ type: 'resource', buffered: true });
  } catch (e) {}
  set(10, 'Mengunduh aplikasi…');

  var tik = setInterval(function () {
    var d = Math.round((Date.now() - t0) / 1000);
    sec.textContent = d + ' dtk';
    if (d >= 8) lambat.hidden = false;
  }, 1000);
  window.__progres = { set: set, selesai: function () { clearInterval(tik); } };
})();
