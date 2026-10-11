import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export async function authenticate(req, res, next) {
  try {
    const token = req.cookies?.lms_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ message: 'Please log in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const users = await query('SELECT id, name, email, role FROM users WHERE id = :id', { id: payload.id });
    if (!users.length) return res.status(401).json({ message: 'Your session is no longer valid.' });
    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Session expired. Please log in again.' });
    next(error);
  }
}
export function requireRole(...roles) {
  return (req, res, next) => req.user && roles.includes(req.user.role)
    ? next() : res.status(403).json({ message: 'You do not have permission to do that.' });
}
export function asyncHandler(fn) { return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next); }

export async function optionalAuthenticate(req, _res, next) {
  try {
    const token = req.cookies?.lms_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const users = await query('SELECT id, name, email, role FROM users WHERE id = :id', { id: payload.id });
      if (users.length) req.user = users[0];
    }
  } catch { /* Public catalogue remains available if an optional session is expired. */ }
  next();
}
