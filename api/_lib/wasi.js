// @ts-check
/**
 * Wasi CRM client (server-side only). Credentials come from env vars and never
 * leave the server. All requests go over HTTPS to https://api.wasi.co/v1.
 *
 * @typedef {Object} WasiProperty
 * @property {string|number} id
 * @property {string} title
 * @property {boolean} forSale
 * @property {boolean} forRent
 * @property {string} priceLabel        Pre-formatted (₡/$) from Wasi *_label fields
 * @property {string} [saleLabel]
 * @property {string} [rentLabel]
 * @property {number|null} bedrooms
 * @property {number|null} bathrooms
 * @property {number|null} garages
 * @property {string} [area]            e.g. "120 m²"
 * @property {string} region            Province label
 * @property {string} city
 * @property {string} [zone]
 * @property {string} address
 * @property {string} type              Property-type name (from /property-type/all map)
 * @property {string} image             main image URL, large ("" if none)
 * @property {string} thumb             main image URL, small (listing cards)
 * @property {Array<{full:string,thumb:string}>} gallery
 * @property {string[]} features
 * @property {string} description
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {string} availabilityLabel
 * @property {string} currency
 */

const BASE = 'https://api.wasi.co/v1';
const PAGE = 100;            // Wasi hard cap per request
const PAGE_GUARD = 50;       // safety: max 5000 properties
const TYPE_TTL = 3600 * 1000; // cache property-type map for 1h (warm invocations)
const CODE_MESSAGES = {
  0: 'Credenciales de Wasi inválidas (id_company o token).',
  1: 'La cuenta de Wasi no tiene plan Pro / permiso para esta operación.',
  2: 'Error de validación en la solicitud a Wasi.',
};

// id_status_on_page: 1 Active · 2 Inactive · 3 Outstanding · 4 Deleted · 5 (filter only)
const HIDDEN_STATUSES = new Set(['2', '4']);

/** Read credentials from env. Throws a config error if missing. */
function readCreds() {
  const id_company = process.env.WASI_ID_COMPANY;
  const wasi_token = process.env.WASI_TOKEN;
  if (!id_company || !wasi_token) {
    const e = new Error('Faltan las variables WASI_ID_COMPANY / WASI_TOKEN en el entorno.');
    // @ts-ignore
    e.config = true;
    throw e;
  }
  return { id_company, wasi_token };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch with one retry on network failure or HTTP 5xx (Wasi app-errors are 200). */
async function fetchWithRetry(url, retries = 1) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok && res.status >= 500 && retries > 0) {
      await delay(350);
      return fetchWithRetry(url, retries - 1);
    }
    return res;
  } catch (err) {
    if (retries > 0) { await delay(350); return fetchWithRetry(url, retries - 1); }
    throw err;
  }
}

/** QUIRK (b): Wasi returns HTTP 200 even on errors. Verify status==="success". */
function assertSuccess(json) {
  if (json && json.status === 'success') return;
  const code = json ? json.code : undefined;
  const msg = (json && json.message) || CODE_MESSAGES[code] || 'Respuesta de error de Wasi.';
  const e = new Error(msg);
  // @ts-ignore
  e.wasiCode = code;
  throw e;
}

function buildUrl(path, params) {
  const url = new URL(`${BASE}/${path}`);
  const { id_company, wasi_token } = readCreds();
  url.searchParams.set('id_company', id_company);
  url.searchParams.set('wasi_token', wasi_token);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * GET a Wasi endpoint (credentials as query params, HTTPS, server-side).
 * Wasi docs use NO trailing slash (e.g. /property/get/1). We send it that way
 * and, only if the host routes it to a 404, retry once WITH a trailing slash.
 */
async function wasiGet(path, params = {}) {
  let res = await fetchWithRetry(buildUrl(path, params));
  if (res.status === 404) res = await fetchWithRetry(buildUrl(path + '/', params));
  if (!res.ok) throw new Error(`Wasi respondió HTTP ${res.status}`);
  return res.json();
}

/** QUIRK (c): collect numeric-string-keyed entries into an array. */
function collectNumericEntries(json) {
  return Object.keys(json)
    .filter((k) => /^\d+$/.test(k))
    .map((k) => json[k])
    .filter((v) => v && typeof v === 'object');
}

const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

/** Drop Wasi's untranslated i18n tokens (e.g. "models/property_type.id.34"). */
function cleanTypeLabel(s) {
  if (!s) return '';
  const t = String(s).trim();
  if (/^models\//i.test(t) || /property_type\.id/i.test(t)) return '';
  return t;
}

/**
 * Decode HTML entities found in Wasi fields — numeric (e.g. "&#8353;" -> "₡")
 * plus the named Latin entities WordPress emits in titles/descriptions
 * (e.g. "&uacute;" -> "ú", "&ntilde;" -> "ñ", "&iexcl;" -> "¡").
 * Unknown named entities are left intact.
 */
const NAMED_ENTITIES = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", lt: '<', gt: '>',
  iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', hellip: '…',
  ndash: '–', mdash: '—', deg: '°', ordm: 'º', ordf: 'ª', middot: '·', euro: '€',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', ccedil: 'ç', Ccedil: 'Ç',
};
function decodeEntities(s) {
  if (!s) return '';
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return _; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return _; } })
    .replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (m, name) =>
      Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : m)
    .trim();
}

/**
 * Wasi property descriptions arrive as HTML (with entities). Turn them into
 * clean plain-text paragraphs separated by a blank line — safe to render via
 * textContent. The front-end splits on the blank line into <p> blocks.
 */
function cleanDescription(raw) {
  if (!raw) return '';
  let s = decodeEntities(String(raw)); // accents/ñ/¡ + any escaped tags -> real chars
  s = s
    .replace(/<\s*\/\s*(p|div|li|ul|ol|h[1-6]|tr|table)\s*>/gi, '\n\n') // block ends -> paragraph break
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')                                // line breaks
    .replace(/<[^>]*>/g, '');                                           // drop any remaining tags
  return s
    .replace(/\r/g, '')
    .replace(/[ \t\u00A0]+/g, ' ')  // collapse runs of spaces / tabs / nbsp
    .replace(/ *\n */g, '\n')       // trim around newlines
    .replace(/\n{3,}/g, '\n\n')     // at most one blank line between paragraphs
    .trim();
}

/** Visible = not Inactive/Deleted AND Available (id_availability 1, i.e. not Sold/Rented). */
function isVisible(p) {
  if (HIDDEN_STATUSES.has(String(p.id_status_on_page))) return false;
  return String(p.id_availability) === '1';
}

function extractFeatures(p) {
  const out = [];
  const pull = (arr) => {
    if (!Array.isArray(arr)) return;
    for (const it of arr) {
      if (typeof it === 'string') out.push(it);
      else if (it && typeof it === 'object') {
        const v = it.nombre || it.name || it.label || it.feature;
        if (v) out.push(String(v));
      }
    }
  };
  pull(p.features); pull(p.internal_features); pull(p.external_features);
  return Array.from(new Set(out));
}

/**
 * Wasi serves images through image.wasi.co — an AWS Serverless Image Handler
 * whose resize box is base64-encoded in the path. Decode it, shrink the box to
 * ~maxW (keeping aspect), re-encode → a lighter thumbnail derived from the same
 * source, so listing cards download far fewer bytes. Returns the URL unchanged
 * for anything that isn't a parseable image.wasi.co URL, or already smaller.
 */
function resizeWasiImage(url, maxW) {
  if (typeof url !== 'string') return url || '';
  const m = url.match(/^(https?:\/\/image\.wasi\.co\/)([A-Za-z0-9+/=]+)$/);
  if (!m) return url;
  try {
    const cfg = JSON.parse(Buffer.from(m[2], 'base64').toString('utf8'));
    const r = cfg && cfg.edits && cfg.edits.resize;
    if (!r || !r.width || r.width <= maxW) return url; // already small enough
    const scale = maxW / r.width;
    r.width = Math.round(r.width * scale);
    if (r.height) r.height = Math.round(r.height * scale);
    return m[1] + Buffer.from(JSON.stringify(cfg)).toString('base64');
  } catch {
    return url;
  }
}

/**
 * Build the per-property photo list. Wasi nests a property's photos inside
 * `galleries` (an array of gallery containers); each container holds its
 * images as numeric-keyed entries ("0","1",… — Wasi's list quirk), NOT as a
 * flat array of images. We flatten every gallery, order by `position`, and
 * expose `thumb` (medium `url`) + `full` (large `url_big`). The main image is
 * usually position 0, so it leads; de-dup drops any repeat. Wasi images have
 * no `url_thumb` — `url` (~555px) is the lightest size. Scoped to this
 * property only — no cross-property mixing.
 */
function buildGallery(p) {
  const galleries = Array.isArray(p.galleries) ? p.galleries
    : (p.galleries && typeof p.galleries === 'object') ? [p.galleries] : [];
  const images = [];
  for (const gallery of galleries) {
    for (const im of collectNumericEntries(gallery)) images.push(im);
  }
  images.sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));

  const items = [];
  const seen = new Set();
  const add = (full, thumb) => {
    if (!/^https?:/.test(full || '')) return;
    const key = String(full).split('?')[0]; // de-dup (main image repeats as position 0)
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ full, thumb: /^https?:/.test(thumb || '') ? thumb : full });
  };
  for (const im of images) add(im.url_big || im.url || im.url_original, im.url || im.url_thumb || im.url_big);
  // fallback: a property with no gallery images still shows its main image
  if (items.length === 0 && p.main_image) {
    const m = p.main_image;
    add(m.url_big || m.url || m.url_original, m.url || m.url_thumb || m.url_big);
  }
  return items;
}

// ---- property-type map (FIX 1): id_property_type (number) -> name ----
let _typeMap = null;
let _typeMapAt = 0;

/** @returns {Promise<Record<string,string>>} */
async function getTypeMap() {
  const now = Date.now();
  if (_typeMap && (now - _typeMapAt) < TYPE_TTL) return _typeMap;
  const json = await wasiGet('property-type/all');
  assertSuccess(json);
  const map = {};
  for (const t of collectNumericEntries(json)) {
    const id = String(t.id_property_type);
    const name = cleanTypeLabel(t.nombre || t.name); // skip broken i18n tokens
    if (id && name) map[id] = name;
  }
  _typeMap = map;
  _typeMapAt = now;
  return map;
}

/**
 * @param {any} p
 * @param {Record<string,string>} [typeMap]
 * @returns {WasiProperty}
 */
function normalizeProperty(p, typeMap) {
  const forSale = truthy(p.for_sale);
  const forRent = truthy(p.for_rent);
  const saleLabel = decodeEntities(p.sale_price_label || '');
  const rentLabel = decodeEntities(p.rent_price_label || '');
  const parts = [];
  if (forSale && saleLabel) parts.push(saleLabel);
  if (forRent && rentLabel) parts.push(rentLabel + '/mes');
  const priceLabel = parts.join(' · ') || saleLabel || rentLabel || 'Consultar precio';
  const gallery = buildGallery(p);
  const typeName = decodeEntities(cleanTypeLabel(p.property_type_label) || cleanTypeLabel(p.type_property_label)
    || (typeMap && typeMap[String(p.id_property_type)]) || 'Propiedad');
  return {
    id: p.id_property,
    title: decodeEntities(p.title || p.name) || ('Propiedad ' + p.id_property),
    forSale, forRent, priceLabel, saleLabel, rentLabel,
    bedrooms: num(p.bedrooms), bathrooms: num(p.bathrooms), garages: num(p.garages),
    area: p.area ? decodeEntities(`${p.area} ${p.unit_area_label || p.area_unit_label || 'm²'}`).trim() : '',
    region: decodeEntities(p.region_label || ''), city: decodeEntities(p.city_label || ''), zone: decodeEntities(p.zone_label || ''),
    address: decodeEntities(p.address || ''),
    type: typeName,
    image: (p.main_image && p.main_image.url) || (gallery[0] && gallery[0].full) || '',
    thumb: resizeWasiImage(
      (p.main_image && (p.main_image.url_thumb || p.main_image.url))
      || (gallery[0] && gallery[0].thumb) || (gallery[0] && gallery[0].full) || '', 400),
    gallery,
    features: extractFeatures(p).map(decodeEntities),
    description: cleanDescription(p.observations || p.description || p.comment || ''),
    latitude: num(p.latitude), longitude: num(p.longitude),
    availabilityLabel: decodeEntities(p.availability_label || ''), currency: p.iso_currency || '',
  };
}

/**
 * QUIRK (a): loop skip in steps of 100 using `total` to fetch ALL listings.
 * Keeps only visible+available ones (FIX 2) and labels types from the map (FIX 1).
 * @returns {Promise<{rawTotal:number, properties:WasiProperty[]}>}
 */
export async function getActiveProperties() {
  const typeMap = await getTypeMap();
  let skip = 0, rawTotal = 0;
  const collected = [];
  for (let guard = 0; guard < PAGE_GUARD; guard++) {
    const json = await wasiGet('property/search', { id_availability: 1, take: PAGE, skip });
    assertSuccess(json);
    rawTotal = Number(json.total) || 0;
    const batch = collectNumericEntries(json);
    collected.push(...batch);
    skip += PAGE;
    if (batch.length === 0 || collected.length >= rawTotal) break;
  }
  const properties = collected
    .filter(isVisible)
    .map((p) => normalizeProperty(p, typeMap))
    .sort((a, b) => Number(b.id) - Number(a.id)); // newest first (proxy: higher id)
  return { rawTotal, properties };
}

/** @returns {Promise<WasiProperty|null>} */
export async function getPropertyDetail(id) {
  const typeMap = await getTypeMap().catch(() => ({}));
  const json = await wasiGet(`property/get/${encodeURIComponent(id)}`);
  assertSuccess(json);
  const raw = json.id_property ? json : (collectNumericEntries(json)[0] || null);
  return raw ? normalizeProperty(raw, typeMap) : null;
}
