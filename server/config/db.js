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

// Initialize the schema and migrations automatically on startup
const schemaPath = path.resolve(here, '../../database/schema.sql');
if (fs.existsSync(schemaPath)) {
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
}

// Run migrations (columns and new tables)
const migrationsPath = path.resolve(here, '../../database/migrations.sql');
if (fs.existsSync(migrationsPath)) {
  try {
    const cols = db.prepare("PRAGMA table_info(courses)").all();
    if (!cols.find(c => c.name === 'category')) {
      db.prepare("ALTER TABLE courses ADD COLUMN category TEXT NOT NULL DEFAULT 'General'").run();
    }
    if (!cols.find(c => c.name === 'difficulty')) {
      db.prepare("ALTER TABLE courses ADD COLUMN difficulty TEXT NOT NULL DEFAULT 'beginner' CHECK(difficulty IN ('beginner','intermediate','advanced'))").run();
    }
  } catch (_) {}
  db.exec(fs.readFileSync(migrationsPath, 'utf8'));
}

// Auto-seed default admin and initial courses if database is empty
try {
  const userCount = db.prepare("SELECT COUNT(*) AS cnt FROM users").get().cnt;
  if (userCount === 0) {
    import('bcryptjs').then(async (bcrypt) => {
      try {
        const hash = await bcrypt.default.hash('Password123!', 12);
        const adminRes = db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES('LMS Admin','admin@lms.local',?,'admin')").run(hash);
        db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES('LMS Administrator','admin@example.com',?,'admin')").run(hash);
        db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES('Demo Student','student@lms.local',?,'student')").run(hash);

        const adminId = adminRes.lastInsertRowid;
        const courses = [
          ['JavaScript Foundations', 'Build a strong foundation in modern JavaScript: variables, functions, arrays, objects, and asynchronous code.', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80', 'Programming', 'beginner'],
          ['React for Beginners', 'Learn components, props, state, effects, and how to build responsive interfaces with React.', 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=1200&q=80', 'Programming', 'intermediate'],
          ['SQL & Database Essentials', 'Understand relational databases, joins, grouping, constraints, and writing useful SQL queries.', 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&w=1200&q=80', 'Data', 'beginner'],
          ['UX Design Fundamentals', 'Learn the principles of user-centred design, wireframing, prototyping, and usability testing.', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80', 'Design', 'beginner'],
          ['Advanced Python', 'Deep dive into Python decorators, generators, async/await, type hints, and packaging.', 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80', 'Programming', 'advanced']
        ];
        const insertCourse = db.prepare('INSERT INTO courses(title,description,thumbnail_url,instructor_id,published,category,difficulty) VALUES(?,?,?,?,1,?,?)');
        for (const [title, desc, thumb, cat, diff] of courses) {
          insertCourse.run(title, desc, thumb, adminId, cat, diff);
        }

        const lessonSeeds = [
          ['JavaScript Foundations', 'Variables and data types', 'Learn let, const, strings, numbers, booleans, null, and undefined. Try declaring a variable and logging its type.', 1],
          ['JavaScript Foundations', 'Functions and scope', 'Functions package reusable logic. Practice function declarations, parameters, return values, and block scope.', 2],
          ['JavaScript Foundations', 'Arrays and objects', 'Arrays hold ordered data; objects hold key-value pairs. Learn to iterate, destructure, and transform them.', 3],
          ['React for Beginners', 'Your first React component', 'A React component is a JavaScript function that returns UI. Create a component, render it, and pass it a prop.', 1],
          ['React for Beginners', 'State and effects', 'useState manages local state; useEffect handles side-effects like data fetching. Build a counter and a data-loader.', 2],
          ['SQL & Database Essentials', 'Introduction to SQL', 'SQL is the language of relational databases. Learn SELECT, FROM, WHERE, ORDER BY, and LIMIT.', 1],
          ['SQL & Database Essentials', 'Joins and relationships', 'Combine data from multiple tables using INNER JOIN, LEFT JOIN, and understand primary and foreign keys.', 2]
        ];
        for (const [courseTitle, title, content, pos] of lessonSeeds) {
          const c = db.prepare('SELECT id FROM courses WHERE title=?').get(courseTitle);
          if (c) db.prepare('INSERT INTO lessons(course_id,title,content,position) VALUES(?,?,?,?)').run(c.id, title, content, pos);
        }

        // Sample Quiz
        const jsCourse = db.prepare('SELECT id FROM courses WHERE title=?').get('JavaScript Foundations');
        if (jsCourse) {
          const qRes = db.prepare('INSERT INTO quizzes(course_id,title,instructions,pass_percent,published) VALUES(?,?,?,60,1)').run(jsCourse.id, 'JavaScript Basics Quiz', 'Answer all 4 questions.');
          const quizId = qRes.lastInsertRowid;
          const questions = [
            ['Which keyword declares a block-scoped variable?', 'var', 'let', 'function', 'class', 'b'],
            ['What does typeof null return?', '"null"', '"object"', '"undefined"', '"boolean"', 'b'],
            ['Which method adds an element to the end of an array?', 'push()', 'pop()', 'shift()', 'unshift()', 'a'],
            ['What is the result of 2 + "3"?', '5', '"23"', 'NaN', 'TypeError', 'b']
          ];
          for (let i = 0; i < questions.length; i++) {
            const [q, a, b, c, d, cor] = questions[i];
            db.prepare('INSERT INTO quiz_questions(quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,position) VALUES(?,?,?,?,?,?,?,?)').run(quizId, q, a, b, c, d, cor, i + 1);
          }
        }
        console.log('Auto-seed completed for fresh database.');
      } catch (err) {
        console.error('Auto-seed error:', err.message);
      }
    });
  }
} catch (_) {}

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
