import Database from 'better-sqlite3';
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const databasePath = process.env.DB_FILE
  ? path.resolve(projectRoot, process.env.DB_FILE)
  : path.join(projectRoot, 'database/lms.sqlite');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');

// Initialize the schema automatically on first start; no separate database server is needed.
const schemaPath = path.resolve(here, '../../database/schema.sql');
db.exec(fs.readFileSync(schemaPath, 'utf8'));

export const pool = {
  async query(sql) {
    return [db.prepare(sql).all()];
  },
  async end() {
    db.close();
  }
};

export async function query(sql, params = {}) {
  const statement = db.prepare(sql);
  const hasParams = Object.keys(params).length > 0;
  if (statement.reader) return hasParams ? statement.all(params) : statement.all();
  const result = hasParams ? statement.run(params) : statement.run();
  return {
    insertId: Number(result.lastInsertRowid),
    affectedRows: result.changes,
    changes: result.changes
  };
}
