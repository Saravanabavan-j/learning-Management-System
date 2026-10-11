import 'dotenv/config';
import app from './app.js';
import { pool } from './config/db.js';
const port = Number(process.env.PORT || 5000);
try {
  await pool.query('SELECT 1');
  app.listen(port, () => console.log(`LearnSpace API running at http://localhost:${port}`));
} catch (error) {
  console.error('Could not initialize SQLite. Check server/.env and database/schema.sql.', error.message);
  process.exit(1);
}
