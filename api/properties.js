// @ts-check
import { getActiveProperties } from './_lib/wasi.js';

export default async function handler(req, res) {
  // Light edge caching so the CRM stays ~in sync without spamming Wasi.
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  try {
    const { rawTotal, properties } = await getActiveProperties();
    res.status(200).json({ status: 'success', total: rawTotal, count: properties.length, properties });
  } catch (err) {
    const isConfig = Boolean(err && err.config);
    res.status(isConfig ? 500 : 502).json({
      status: 'error',
      code: err && err.wasiCode,
      message: (err && err.message) || 'Error al consultar Wasi.',
    });
  }
}
