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

/* ====== Hero rotating word (index): cycles SPEIS ⇄ AQUÍ — vanilla animated-hero ====== */
(function () {
  var wrap = document.querySelector('.rotate-word');
  if (!wrap) return;
  var items = wrap.querySelectorAll('.rw-item');
  if (items.length < 2) return;
  var active = 0;
  function apply() {
    items.forEach(function (el, i) {
      el.classList.remove('is-active', 'is-up', 'is-down');
      el.classList.add(i === active ? 'is-active' : (active > i ? 'is-up' : 'is-down'));
    });
  }
  apply();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return; // show the first word statically
  setInterval(function () { active = (active + 1) % items.length; apply(); }, 2200);
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

/* ====== Shared fetch helper: JSON + one retry on failure ====== */
function wasiFetchJson(url, retries) {
  retries = retries == null ? 1 : retries;
  return fetch(url, { headers: { Accept: 'application/json' } })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .catch(function (err) {
      if (retries > 0) return new Promise(function (res) { setTimeout(res, 400); })
        .then(function () { return wasiFetchJson(url, retries - 1); });
      throw err;
    });
}

function plNormalize(s) {
  return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function plMapType(label) {
  var t = plNormalize(label);
  if (t.indexOf('aparta') >= 0 || t.indexOf('apto') >= 0) return 'apartamento';
  if (t.indexOf('lote') >= 0 || t.indexOf('terreno') >= 0 || t.indexOf('finca') >= 0) return 'lote';
  if (t.indexOf('condominio') >= 0) return 'condominio';
  return 'casa';
}

/* ====== Live properties listing (propiedades.html) ====== */
(function () {
  var grid = document.getElementById('propertiesGrid');
  var form = document.getElementById('resultsSearchForm');
  if (!grid || !form) return; // only the listings page

  var LOC_LABELS = { 'san jose': 'San José', 'alajuela': 'Alajuela', 'cartago': 'Cartago', 'heredia': 'Heredia', 'guanacaste': 'Guanacaste', 'puntarenas': 'Puntarenas', 'limon': 'Limón' };
  var TYPE_LABELS = { casa: 'Casa', apartamento: 'Apartamento', lote: 'Lote', condominio: 'Condominio' };
  var loadingEl = document.getElementById('gridLoading');
  var errorEl = document.getElementById('gridError');
  var noResults = document.getElementById('noResults');

  function setState(s) { // 'loading' | 'error' | 'ready'
    if (loadingEl) loadingEl.hidden = s !== 'loading';
    if (errorEl) errorEl.hidden = s !== 'error';
    grid.hidden = s !== 'ready';
    if (noResults && s !== 'ready') noResults.classList.remove('show');
  }

  function buildMeta(p) {
    var items = [];
    if (p.bedrooms) items.push(p.bedrooms + ' hab');
    if (p.bathrooms) items.push(p.bathrooms + ' baños');
    if (p.area) items.push(p.area);
    if (!items.length) return null;
    var ul = document.createElement('ul'); ul.className = 'card-meta';
    items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    return ul;
  }

  function buildCard(p) {
    var bucket = plMapType(p.type);
    var href = 'propiedad.html?id=' + encodeURIComponent(p.id);
    var locText = [p.city, p.region].filter(Boolean).join(', ') || p.address || 'Costa Rica';

    var card = document.createElement('article');
    card.className = 'card';
    card.setAttribute('data-property', '');
    card.dataset.id = p.id;
    card.dataset.title = p.title || '';
    card.dataset.location = plNormalize([p.region, p.city, p.zone, p.address].filter(Boolean).join(' '));
    card.dataset.type = bucket;

    var imgWrap = document.createElement('a');
    imgWrap.className = 'card-img';
    imgWrap.href = href;
    if (p.image && /^https?:/.test(p.image)) {
      var img = document.createElement('img');
      img.src = p.image; img.alt = p.title || 'Propiedad'; img.loading = 'lazy';
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('placeholder-img');
      var ph = document.createElement('div'); ph.className = 'placeholder-logo'; ph.textContent = 'SPEIS';
      imgWrap.appendChild(ph);
    }
    card.appendChild(imgWrap);

    var body = document.createElement('div'); body.className = 'card-body';
    var h3 = document.createElement('h3'); h3.textContent = p.title || 'Propiedad'; body.appendChild(h3);

    var loc = document.createElement('p'); loc.className = 'loc';
    var pin = document.createElement('span'); pin.className = 'pin'; loc.appendChild(pin);
    loc.appendChild(document.createTextNode(locText)); body.appendChild(loc);

    if (p.priceLabel) { var pr = document.createElement('p'); pr.className = 'card-price'; pr.textContent = p.priceLabel; body.appendChild(pr); }
    var meta = buildMeta(p); if (meta) body.appendChild(meta);

    var foot = document.createElement('div'); foot.className = 'card-foot';
    var tag = document.createElement('span'); tag.className = 'tag';
    tag.textContent = p.type || TYPE_LABELS[bucket] || 'Propiedad'; // real Wasi name
    foot.appendChild(tag);
    var det = document.createElement('a'); det.className = 'btn btn-dark sm'; det.href = href; det.textContent = 'Detalles'; foot.appendChild(det);
    body.appendChild(foot);

    card.appendChild(body);
    return card;
  }

  function render(properties) {
    var frag = document.createDocumentFragment();
    properties.forEach(function (p) { frag.appendChild(buildCard(p)); });
    grid.innerHTML = '';
    grid.appendChild(frag);
  }

  /* ---- filters: identical UX, now over the live-rendered cards ---- */
  function applyFilters() {
    var kw = plNormalize(document.getElementById('f_kw').value.trim());
    var loc = plNormalize(document.getElementById('f_loc').value);
    var type = plNormalize(document.getElementById('f_type').value);
    var cards = grid.querySelectorAll('[data-property]');
    var visible = 0;
    cards.forEach(function (card) {
      var matchKw = !kw || plNormalize(card.dataset.title).includes(kw) || plNormalize(card.dataset.location).includes(kw) || plNormalize(card.dataset.type).includes(kw);
      var matchLoc = !loc || plNormalize(card.dataset.location).includes(loc);
      var matchType = !type || plNormalize(card.dataset.type) === type;
      var show = matchKw && matchLoc && matchType;
      card.classList.toggle('is-hidden', !show);
      if (show) visible++;
    });
    document.getElementById('resultsCount').textContent = visible;
    if (noResults) noResults.classList.toggle('show', visible === 0);
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

  function readUrlIntoFilters() {
    var params = new URLSearchParams(location.search);
    document.getElementById('f_kw').value = params.get('kw') || '';
    [['f_loc', 'loc'], ['f_type', 'type']].forEach(function (pair) {
      var sel = document.getElementById(pair[0]);
      var want = params.get(pair[1]) || '';
      if ([].some.call(sel.options, function (o) { return o.value === want; })) sel.value = want;
    });
  }

  // wire filter controls once (the inputs are static markup)
  ['f_kw', 'f_loc', 'f_type'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', applyFilters);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); applyFilters(); });
  var clearBtn = document.getElementById('clearFilters');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    ['f_kw', 'f_loc', 'f_type'].forEach(function (id) { document.getElementById(id).value = ''; });
    applyFilters();
  });

  function load() {
    setState('loading');
    wasiFetchJson('/api/properties').then(function (data) {
      if (!data || data.status !== 'success' || !Array.isArray(data.properties)) throw new Error('bad payload');
      render(data.properties);
      setState('ready');
      readUrlIntoFilters();
      applyFilters(); // also surfaces the empty state via #noResults
    }).catch(function () { setState('error'); });
  }
  var retry = document.getElementById('retryLoad');
  if (retry) retry.addEventListener('click', load);
  load();
})();

/* ====== Property detail (propiedad.html) ====== */
(function () {
  var root = document.getElementById('propertyDetail');
  if (!root) return;
  var loadingEl = document.getElementById('detailLoading');
  var errorEl = document.getElementById('detailError');
  var contentEl = document.getElementById('detailContent');
  var id = new URLSearchParams(location.search).get('id');

  function state(s) {
    if (loadingEl) loadingEl.hidden = s !== 'loading';
    if (errorEl) errorEl.hidden = s !== 'error';
    if (contentEl) contentEl.hidden = s !== 'ready';
  }
  if (!id) { state('error'); return; }
  state('loading');

  wasiFetchJson('/api/property?id=' + encodeURIComponent(id)).then(function (data) {
    if (!data || data.status !== 'success' || !data.property) throw new Error('not found');
    renderDetail(data.property);
    state('ready');
  }).catch(function () { state('error'); });

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderDetail(p) {
    document.title = (p.title || 'Propiedad') + ' – Speis';
    contentEl.innerHTML = '';

    var gridWrap = el('div', 'detail-grid');

    // --- media ---
    var media = el('div', 'detail-media');
    var gallery = (p.gallery && p.gallery.length) ? p.gallery : (p.image ? [{ full: p.image, thumb: p.image }] : []);
    var mainImg = el('img', 'detail-main-img');
    if (gallery[0]) { mainImg.src = gallery[0].full; mainImg.alt = p.title || 'Propiedad'; }
    media.appendChild(mainImg);
    if (gallery.length > 1) {
      var thumbs = el('div', 'detail-thumbs');
      gallery.forEach(function (g, i) {
        var t = el('img'); t.src = g.thumb; t.alt = (p.title || 'Foto') + ' ' + (i + 1); t.loading = 'lazy';
        if (i === 0) t.classList.add('active');
        t.addEventListener('click', function () {
          mainImg.src = g.full;
          thumbs.querySelectorAll('img').forEach(function (x) { x.classList.remove('active'); });
          t.classList.add('active');
        });
        thumbs.appendChild(t);
      });
      media.appendChild(thumbs);
    }
    gridWrap.appendChild(media);

    // --- info ---
    var info = el('div', 'detail-info');
    var badge = [];
    if (p.forSale) badge.push('En venta');
    if (p.forRent) badge.push('En alquiler');
    if (p.type) badge.push(p.type);
    info.appendChild(el('span', 'eyebrow', badge.join(' · ')));
    info.appendChild(el('h1', 'detail-title', p.title || 'Propiedad'));

    var loc = el('p', 'loc'); loc.appendChild(el('span', 'pin'));
    loc.appendChild(document.createTextNode([p.address, p.city, p.region].filter(Boolean).join(', ') || 'Costa Rica'));
    info.appendChild(loc);

    info.appendChild(el('p', 'detail-price', p.priceLabel || 'Consultar precio'));

    var metaItems = [];
    if (p.bedrooms) metaItems.push(p.bedrooms + ' habitaciones');
    if (p.bathrooms) metaItems.push(p.bathrooms + ' baños');
    if (p.garages) metaItems.push(p.garages + ' parqueos');
    if (p.area) metaItems.push(p.area);
    if (metaItems.length) {
      var ul = el('ul', 'detail-meta');
      metaItems.forEach(function (t) { ul.appendChild(el('li', null, t)); });
      info.appendChild(ul);
    }

    var wa = el('a', 'btn btn-wa', null);
    wa.href = 'https://wa.me/50663034870?text=' + encodeURIComponent('Hola, me interesa: ' + (p.title || ('propiedad ' + p.id)));
    wa.target = '_blank'; wa.rel = 'noopener';
    wa.appendChild(document.createTextNode('Consultar por WhatsApp'));
    info.appendChild(wa);

    if (p.description) {
      var desc = el('div', 'detail-block');
      desc.appendChild(el('h3', null, 'Descripción'));
      desc.appendChild(el('p', null, p.description));
      info.appendChild(desc);
    }
    if (p.features && p.features.length) {
      var feat = el('div', 'detail-block');
      feat.appendChild(el('h3', null, 'Características'));
      var fl = el('ul', 'detail-features');
      p.features.forEach(function (f) { fl.appendChild(el('li', null, f)); });
      feat.appendChild(fl);
      info.appendChild(feat);
    }
    gridWrap.appendChild(info);
    contentEl.appendChild(gridWrap);

    // --- map ---
    if (p.latitude != null && p.longitude != null) {
      var mapWrap = el('div', 'detail-map');
      var iframe = document.createElement('iframe');
      iframe.loading = 'lazy'; iframe.title = 'Ubicación de la propiedad';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.src = 'https://www.google.com/maps?q=' + p.latitude + ',' + p.longitude + '&z=16&hl=es&output=embed';
      mapWrap.appendChild(iframe);
      contentEl.appendChild(mapWrap);
    }
  }
})();

/* ====== Contáctenos — scroll + cursor-driven 3D card reveal (index) ======
   Vanilla port of the framer ContainerScroll effect, augmented: as the section
   scrolls in the card unfolds (rotateX 26->0), grows (scale 0.9->1) and rises
   (translateY 64->0); it also tilts toward the cursor (rotateX/rotateY parallax),
   eased for smoothness. Same useTransform idea, no library. */
(function () {
  var section = document.querySelector('.contact-section');
  if (!section) return;
  var card = section.querySelector('.scroll-card');
  if (!card) return;
  var head = section.querySelector('.scroll-head');

  // Respect reduced-motion: leave the flat, fully-visible base state untouched.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var mq = window.matchMedia('(max-width: 768px)');
  var mobile = mq.matches;
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  var p = 0;          // scroll progress 0..1
  var px = 0, py = 0; // eased cursor offset -1..1
  var tx = 0, ty = 0; // target cursor offset -1..1
  var raf = 0;

  function render() {
    raf = 0;
    px += (tx - px) * 0.12; // ease the cursor for buttery parallax
    py += (ty - py) * 0.12;

    var rotX = lerp(26, 0, p) + (-py * 7); // scroll unfold + cursor tilt
    var rotY = px * 10;
    var scale = lerp(mobile ? 0.88 : 0.9, 1, p);
    var lift = lerp(64, 0, p);             // card rises into place
    card.style.transform =
      'perspective(900px) translateY(' + lift.toFixed(1) + 'px) rotateX(' + rotX.toFixed(2) +
      'deg) rotateY(' + rotY.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
    if (head) {
      head.style.transform =
        'translateY(' + lerp(34, -18, p).toFixed(1) + 'px) translateX(' + (px * 5).toFixed(1) + 'px)';
    }
    // keep animating until the cursor easing settles
    if (Math.abs(tx - px) > 0.001 || Math.abs(ty - py) > 0.001) schedule();
  }
  function schedule() { if (!raf) raf = window.requestAnimationFrame(render); }

  function onScroll() {
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var top = section.getBoundingClientRect().top;
    // p: 0 when the section top sits at the viewport bottom, 1 once it's near the top.
    p = clamp((vh - top) / (vh - vh * 0.15), 0, 1);
    schedule();
  }
  function onMove(e) {
    var r = card.getBoundingClientRect();
    tx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
    ty = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
    // spotlight-card border glow: place the gold light at the cursor (card-local %)
    card.style.setProperty('--mx', (clamp((e.clientX - r.left) / r.width, 0, 1) * 100).toFixed(1) + '%');
    card.style.setProperty('--my', (clamp((e.clientY - r.top) / r.height, 0, 1) * 100).toFixed(1) + '%');
    card.classList.add('is-glowing');
    schedule();
  }
  function onLeave() { tx = 0; ty = 0; card.classList.remove('is-glowing'); schedule(); }

  window.addEventListener('scroll', onScroll, { passive: true });
  section.addEventListener('mousemove', onMove);
  section.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', function () { mobile = mq.matches; onScroll(); });
  onScroll();
})();
