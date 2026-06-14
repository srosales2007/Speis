// @ts-check
import { getPropertyDetail } from './_lib/wasi.js';

export default async function handler(req, res) {
  const id = req.query && req.query.id;
  if (!id) { res.status(400).json({ status: 'error', message: 'Falta el parámetro id.' }); return; }
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const property = await getPropertyDetail(id);
    if (!property) { res.status(404).json({ status: 'error', message: 'Propiedad no encontrada.' }); return; }
    res.status(200).json({ status: 'success', property });
  } catch (err) {
    const isConfig = Boolean(err && err.config);
    res.status(isConfig ? 500 : 502).json({
      status: 'error', code: err && err.wasiCode,
      message: (err && err.message) || 'Error al consultar Wasi.',
    });
  }
}
