import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '../..');
const databasePath = process.env.DB_FILE
  ? path.resolve(projectRoot, process.env.DB_FILE)
  : path.join(projectRoot, 'database/lms.sqlite');

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Safe column additions (SQLite does not support ADD COLUMN IF NOT EXISTS)
function addColumnIfMissing(table, column, definition) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.find(c => c.name === column)) {
      db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
      console.log(`  + Added column ${table}.${column}`);
    } else {
      console.log(`  - Column ${table}.${column} already exists`);
    }
  } catch (err) {
    console.error(`  ! Error adding ${table}.${column}: ${err.message}`);
  }
}

console.log('Running migrations…');

// Feature 1: Add category and difficulty to courses
addColumnIfMissing('courses', 'category', "TEXT NOT NULL DEFAULT 'General'");
addColumnIfMissing('courses', 'difficulty', "TEXT NOT NULL DEFAULT 'beginner' CHECK(difficulty IN ('beginner','intermediate','advanced'))");

// Run the migrations SQL file for new tables
const migrationsPath = path.resolve(here, '../../database/migrations.sql');
db.exec(fs.readFileSync(migrationsPath, 'utf8'));
console.log('  + New tables created (IF NOT EXISTS)');

console.log('Migrations complete.');
db.close();
