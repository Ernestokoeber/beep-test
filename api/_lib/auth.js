import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const TOKEN_TTL = '30d';

export function validEmail(value) {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 10 && value.length <= 128;
}

export function hashPassword(value) {
  return bcrypt.hash(value, 12);
}

export function verifyPassword(value, hash) {
  return bcrypt.compare(value, hash);
}

export function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET fehlt oder ist zu kurz');
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function getAuth(req) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return null;
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    return jwt.verify(match[1], process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const auth = getAuth(req);
  if (auth) return auth;
  res.status(401).json({ error: 'Bitte erneut anmelden.' });
  return null;
}

export async function getMembership(userId) {
  const { rows } = await query(
    `SELECT m.role, o.id AS organization_id, o.name AS organization_name, o.slug AS organization_slug
       FROM memberships m
       JOIN organizations o ON o.id = m.organization_id
      WHERE m.user_id = $1
      ORDER BY m.created_at ASC
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function requireMembership(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  const membership = await getMembership(auth.sub);
  if (!membership) {
    res.status(403).json({ error: 'Keinem Team zugeordnet.' });
    return null;
  }
  return { ...auth, ...membership };
}

export function canWrite(role) {
  return role === 'admin' || role === 'coach' || role === 'assistant';
}
