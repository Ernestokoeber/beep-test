import QRCode from 'qrcode';
import { validCheckinToken } from '../_lib/checkin.js';
import { method } from '../_lib/http.js';

export default async function handler(req, res) {
  if (!method(req, res, ['GET'])) return;
  const token = req.query && req.query.token;
  if (!validCheckinToken(token)) return res.status(400).send('Ungültiger Code');
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const host = /^[a-z0-9.-]+(?::\d{2,5})?$/i.test(forwardedHost) ? forwardedHost : 'beep-test.vercel.app';
  const proto = host.startsWith('localhost:') ? 'http' : 'https';
  const base = String(process.env.PUBLIC_APP_URL || '').replace(/\/$/, '') || proto + '://' + host;
  const url = base + '/#/checkin/' + encodeURIComponent(token);
  const svg = await QRCode.toString(url, { type: 'svg', width: 360, margin: 2, color: { dark: '#002f1b', light: '#ffffff' } });
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.status(200).send(svg);
}
