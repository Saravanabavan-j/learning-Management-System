import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';

const [name, emailArg, passwordArg] = process.argv.slice(2);
const email = (emailArg || '').toLowerCase();
if (!name || !email || !passwordArg) {
  console.error('Usage: npm run create-admin -- "Admin Name" admin@example.com "StrongPasswordHere"');
  process.exit(1);
}
if (!/^\S+@\S+\.\S+$/.test(email) || passwordArg.length < 12) {
  console.error('Use a valid email and a password of at least 12 characters.'); process.exit(1);
}
try {
  const hash = await bcrypt.hash(passwordArg, 12);
  const result = await query('INSERT INTO users(name,email,password_hash,role) VALUES(:name,:email,:hash,\'admin\')', { name, email, hash });
  console.log(`Admin created with id ${result.insertId}. Keep the credentials private.`);
} catch (error) {
  console.error((String(error.code || '').startsWith('SQLITE_CONSTRAINT_UNIQUE') || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') ? 'That email already exists.' : error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
