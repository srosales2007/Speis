/* SPEIS — shared behavior for index.html and propiedades.html
   Each block guards on the elements it needs, so one file serves both pages. */

/* ====== Intro preloader (index): spell out SPEIS, then reveal the page ====== */
(function () {
  var pre = document.getElementById('preloader');
  if (!pre) { document.body.classList.remove('loading'); return; }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DONE_AT = reduce ? 700 : 6000; // letters reveal -> slow gloss sweep -> reveal page (total ~6s)
  function finish() {
    pre.classList.add('done');
    document.body.classList.remove('loading');
    setTimeout(function () { if (pre && pre.parentNode) pre.parentNode.removeChild(pre); }, 800);
  }
  pre.addEventListener('click', finish); // allow users to skip the intro
  setTimeout(finish, DONE_AT);
})();

/* ====== Hero search (index) -> redirect to propiedades.html with filters in the URL ====== */
(function () {
  var form = document.getElementById('searchForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var params = new URLSearchParams();
    var kw = document.getElementById('kw').value.trim();
    var loc = document.getElementById('loc').value;
    var type = document.getElementById('type').value;
    if (kw) params.set('kw', kw);
    if (loc) params.set('loc', loc);
    if (type) params.set('type', type);
    var qs = params.toString();
    window.location.href = 'propiedades.html' + (qs ? '?' + qs : '');
  });
})();

/* ====== Contact form (index) ====== */
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alert('¡Gracias! Su mensaje fue enviado.');
    form.reset();
  });
})();

/* ====== Carousels (index) ====== */
document.querySelectorAll('[data-carousel]').forEach(function (c) {
  var track = c.querySelector('[data-track]');
  var prev = c.querySelector('.prev');
  var next = c.querySelector('.next');
  if (!track) return;
  var step = function () {
    var first = track.querySelector('.card');
    if (!first) return 320;
    var s = getComputedStyle(track);
    var gap = parseFloat(s.columnGap || s.gap || 24) || 24;
    return first.getBoundingClientRect().width + gap;
  };
  if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
  if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
});

/* ====== Nav dropdown (both pages) ====== */
(function () {
  var dd = document.getElementById('navDropdown');
  if (!dd) return;
  var btn = dd.querySelector('.nav-dropdown-btn');
  function close() { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = dd.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) { if (!dd.contains(e.target)) close(); });
  dd.querySelectorAll('.nav-dropdown-menu a').forEach(function (a) { a.addEventListener('click', close); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

/* ====== Testimonial slider (index): dots switch between real testimonials ====== */
(function () {
  var slides = document.querySelectorAll('.testi-slide');
  var dotsWrap = document.querySelector('.dots');
  if (!slides.length || !dotsWrap) return;
  var dots = dotsWrap.querySelectorAll('.dot');
  function show(i) {
    slides.forEach(function (s, j) { s.classList.toggle('active', j === i); });
    dots.forEach(function (d, j) { d.classList.toggle('active', j === i); });
  }
  dots.forEach(function (d, i) { d.addEventListener('click', function () { show(i); }); });
  show(0);
})();

/* ====== Property filters (propiedades) ====== */
(function () {
  var grid = document.getElementById('propertiesGrid');
  if (!grid) return;

  var LOC_LABELS = { 'san jose': 'San José', 'alajuela': 'Alajuela', 'cartago': 'Cartago', 'heredia': 'Heredia', 'guanacaste': 'Guanacaste', 'puntarenas': 'Puntarenas', 'limon': 'Limón' };
  var TYPE_LABELS = { casa: 'Casa', apartamento: 'Apartamento', lote: 'Lote', condominio: 'Condominio' };

  function normalize(s) {
    return (s || '').toString().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, ''); // accent-insensitive
  }

  function applyFilters() {
    var kw = normalize(document.getElementById('f_kw').value.trim());
    var loc = normalize(document.getElementById('f_loc').value);
    var type = normalize(document.getElementById('f_type').value);
    var cards = grid.querySelectorAll('[data-property]');
    var visible = 0;
    cards.forEach(function (card) {
      var title = normalize(card.dataset.title);
      var cloc = normalize(card.dataset.location);
      var ctype = normalize(card.dataset.type);
      var matchKw = !kw || title.includes(kw) || cloc.includes(kw) || ctype.includes(kw);
      var matchLoc = !loc || cloc.includes(loc);
      var matchType = !type || ctype === type;
      var show = matchKw && matchLoc && matchType;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    document.getElementById('resultsCount').textContent = visible;
    document.getElementById('noResults').classList.toggle('show', visible === 0);
    renderActiveFilters();
    syncUrl();
  }

  function renderActiveFilters() {
    var wrap = document.getElementById('activeFilters');
    if (!wrap) return;
    var kw = document.getElementById('f_kw').value.trim();
    var loc = document.getElementById('f_loc').value;
    var type = document.getElementById('f_type').value;
    wrap.innerHTML = '';
    function make(label, clear) {
      var c = document.createElement('span');
      c.className = 'chip';
      c.innerHTML = label + ' <button type="button" aria-label="Quitar">×</button>';
      c.querySelector('button').addEventListener('click', function () { clear(); applyFilters(); });
      wrap.appendChild(c);
    }
    if (kw) make('“' + kw + '”', function () { document.getElementById('f_kw').value = ''; });
    if (loc) make(LOC_LABELS[loc] || loc, function () { document.getElementById('f_loc').value = ''; });
    if (type) make(TYPE_LABELS[type] || type, function () { document.getElementById('f_type').value = ''; });
  }

  function syncUrl() {
    var params = new URLSearchParams();
    var kw = document.getElementById('f_kw').value.trim();
    var loc = document.getElementById('f_loc').value;
    var type = document.getElementById('f_type').value;
    if (kw) params.set('kw', kw);
    if (loc) params.set('loc', loc);
    if (type) params.set('type', type);
    var qs = params.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  // Read filters from the URL (passed from the home page search)
  var params = new URLSearchParams(location.search);
  document.getElementById('f_kw').value = params.get('kw') || '';
  ['f_loc', 'f_type'].forEach(function (id) {
    var want = params.get(id === 'f_loc' ? 'loc' : 'type') || '';
    var sel = document.getElementById(id);
    if ([].some.call(sel.options, function (o) { return o.value === want; })) sel.value = want;
  });

  // Live filtering + submit + clear
  ['f_kw', 'f_loc', 'f_type'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', applyFilters);
  });
  document.getElementById('resultsSearchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    applyFilters();
  });
  var clearBtn = document.getElementById('clearFilters');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    ['f_kw', 'f_loc', 'f_type'].forEach(function (id) { document.getElementById(id).value = ''; });
    applyFilters();
  });

  applyFilters();
})();
