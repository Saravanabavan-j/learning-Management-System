import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, pool } from '../config/db.js';
import { authenticate, optionalAuthenticate, requireRole, asyncHandler } from '../middleware/auth.js';
import { requiredText, positiveId } from '../validators/input.js';

const router = Router();
const student = [authenticate, requireRole('student')];
const admin = [authenticate, requireRole('admin')];
const cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/', maxAge: 24 * 60 * 60 * 1000 });
const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });
const tokenFor = user => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
async function hasEnrollment(userId, courseId) {
  const rows = await query('SELECT id FROM enrollments WHERE student_id=:userId AND course_id=:courseId', { userId, courseId });
  return rows.length > 0;
}
async function lessonAccess(req, res, next, lessonId) {
  const rows = await query('SELECT l.*, c.published FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=:id', { id: lessonId });
  if (!rows.length) return res.status(404).json({ message: 'Lesson not found.' });
  if (req.user.role === 'admin' || (rows[0].published && await hasEnrollment(req.user.id, rows[0].course_id))) { req.lesson = rows[0]; return next(); }
  return res.status(403).json({ message: 'Enroll in this course to access its lessons.' });
}

// Authentication
router.post('/auth/register', asyncHandler(async (req, res) => {
  const name = requiredText(req.body.name, 'Name', 100);
  const email = requiredText(req.body.email, 'Email', 254).toLowerCase();
  const password = requiredText(req.body.password, 'Password', 100);
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password must contain at least 8 characters.' });
  const hash = await bcrypt.hash(password, 12);
  const result = await query('INSERT INTO users(name,email,password_hash,role) VALUES(:name,:email,:hash,\'student\')', { name, email, hash });
  const user = { id: result.insertId, name, email, role: 'student' };
  res.cookie('lms_token', tokenFor(user), cookieOptions()).status(201).json({ user, message: 'Account created successfully.' });
}));
router.post('/auth/login', asyncHandler(async (req, res) => {
  const email = requiredText(req.body.email, 'Email', 254).toLowerCase();
  const password = requiredText(req.body.password, 'Password', 100);
  const rows = await query('SELECT id,name,email,password_hash,role FROM users WHERE email=:email', { email });
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
  const user = publicUser(rows[0]);
  res.cookie('lms_token', tokenFor(user), cookieOptions()).json({ user, message: 'Welcome back.' });
}));
router.post('/auth/logout', (_req, res) => res.clearCookie('lms_token', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/' }).json({ message: 'You have logged out.' }));
router.get('/auth/me', authenticate, (req, res) => res.json({ user: req.user }));

// Profile and user administration
router.get('/users/me', authenticate, (req, res) => res.json({ user: req.user }));
router.put('/users/me', authenticate, asyncHandler(async (req, res) => {
  const name = requiredText(req.body.name, 'Name', 100);
  await query('UPDATE users SET name=:name WHERE id=:id', { name, id: req.user.id });
  res.json({ user: { ...req.user, name }, message: 'Profile updated.' });
}));
router.get('/users', ...admin, asyncHandler(async (_req, res) => {
  const users = await query(`SELECT u.id,u.name,u.email,u.role,u.created_at,COUNT(DISTINCT e.id) AS enrollments FROM users u LEFT JOIN enrollments e ON e.student_id=u.id GROUP BY u.id ORDER BY u.created_at DESC`);
  res.json({ users });
}));

// ── Feature 1: Course catalogue with search + category + difficulty filters ──
router.get('/courses', optionalAuthenticate, asyncHandler(async (req, res) => {
  const search = `%${String(req.query.search || '').slice(0, 100)}%`;
  const isAdmin = req.user?.role === 'admin';
  const category = String(req.query.category || '').trim();
  const difficulty = String(req.query.difficulty || '').trim();
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];

  let sql = `SELECT c.id,c.title,c.description,c.thumbnail_url,c.published,c.created_at,c.category,c.difficulty,u.name AS instructor,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count,
    (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) AS student_count,
    ROUND(COALESCE((SELECT AVG(r.rating) FROM course_reviews r WHERE r.course_id=c.id),0),1) AS avg_rating,
    (SELECT COUNT(*) FROM course_reviews r WHERE r.course_id=c.id) AS review_count
    FROM courses c JOIN users u ON u.id=c.instructor_id
    WHERE (:isAdmin=1 OR c.published=1) AND (c.title LIKE :search OR c.description LIKE :search)`;

  const params = { isAdmin: isAdmin ? 1 : 0, search };

  if (category) { sql += ' AND c.category=:category'; params.category = category; }
  if (difficulty && validDifficulties.includes(difficulty)) { sql += ' AND c.difficulty=:difficulty'; params.difficulty = difficulty; }

  sql += ' ORDER BY c.created_at DESC';
  const courses = await query(sql, params);
  res.json({ courses });
}));

router.get('/courses/categories', asyncHandler(async (_req, res) => {
  const rows = await query('SELECT DISTINCT category FROM courses WHERE published=1 ORDER BY category');
  res.json({ categories: rows.map(r => r.category).filter(Boolean) });
}));

router.get('/courses/:id', optionalAuthenticate, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id);
  const rows = await query(`SELECT c.*,u.name AS instructor,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) lesson_count,
    ROUND(COALESCE((SELECT AVG(r.rating) FROM course_reviews r WHERE r.course_id=c.id),0),1) AS avg_rating,
    (SELECT COUNT(*) FROM course_reviews r WHERE r.course_id=c.id) AS review_count
    FROM courses c JOIN users u ON u.id=c.instructor_id WHERE c.id=:id`, { id });
  if (!rows.length || (!rows[0].published && req.user?.role !== 'admin')) return res.status(404).json({ message: 'Course not found.' });
  const course = rows[0];
  if (req.user?.role === 'admin' || (req.user && await hasEnrollment(req.user.id, id))) {
    course.lessons = await query('SELECT id,title,content,video_url,position FROM lessons WHERE course_id=:id ORDER BY position,id', { id });
  }
  // Reviews (always visible)
  course.reviews = await query(`SELECT r.id,r.rating,r.review_text,r.created_at,r.updated_at,u.name AS student_name,
    (CASE WHEN :userId > 0 AND r.student_id=:userId THEN 1 ELSE 0 END) AS is_mine
    FROM course_reviews r JOIN users u ON u.id=r.student_id WHERE r.course_id=:id ORDER BY r.created_at DESC LIMIT 20`,
    { id, userId: req.user?.id || 0 });
  res.json({ course });
}));

router.post('/courses', ...admin, asyncHandler(async (req, res) => {
  const title = requiredText(req.body.title, 'Title', 180), description = requiredText(req.body.description, 'Description', 10000);
  const category = String(req.body.category || 'General').trim().slice(0, 80);
  const difficulty = ['beginner','intermediate','advanced'].includes(req.body.difficulty) ? req.body.difficulty : 'beginner';
  const result = await query('INSERT INTO courses(title,description,thumbnail_url,instructor_id,published,category,difficulty) VALUES(:title,:description,:thumbnail,:instructor,:published,:category,:difficulty)',
    { title, description, thumbnail: req.body.thumbnail_url || null, instructor: req.user.id, published: req.body.published ? 1 : 0, category, difficulty });
  res.status(201).json({ course: { id: result.insertId, title, description }, message: 'Course created.' });
}));

router.put('/courses/:id', ...admin, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id), title = requiredText(req.body.title, 'Title', 180), description = requiredText(req.body.description, 'Description', 10000);
  const category = String(req.body.category || 'General').trim().slice(0, 80);
  const difficulty = ['beginner','intermediate','advanced'].includes(req.body.difficulty) ? req.body.difficulty : 'beginner';
  const result = await query('UPDATE courses SET title=:title,description=:description,thumbnail_url=:thumbnail,published=:published,category=:category,difficulty=:difficulty WHERE id=:id',
    { id, title, description, thumbnail: req.body.thumbnail_url || null, published: req.body.published ? 1 : 0, category, difficulty });
  if (!result.affectedRows) return res.status(404).json({ message: 'Course not found.' });
  res.json({ message: 'Course updated.' });
}));

router.delete('/courses/:id', ...admin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM courses WHERE id=:id', { id: positiveId(req.params.id) });
  if (!result.affectedRows) return res.status(404).json({ message: 'Course not found.' });
  res.json({ message: 'Course deleted.' });
}));

// Lessons
router.get('/courses/:courseId/lessons', authenticate, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const course = await query('SELECT id,published FROM courses WHERE id=:id', { id: courseId });
  if (!course.length) return res.status(404).json({ message: 'Course not found.' });
  if (req.user.role !== 'admin' && (!course[0].published || !(await hasEnrollment(req.user.id, courseId)))) return res.status(403).json({ message: 'Enroll in this course to access lessons.' });
  const lessons = await query('SELECT id,course_id,title,content,video_url,position FROM lessons WHERE course_id=:courseId ORDER BY position,id', { courseId });
  res.json({ lessons });
}));
router.post('/courses/:courseId/lessons', ...admin, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId), title = requiredText(req.body.title, 'Title', 180), content = requiredText(req.body.content, 'Content', 20000);
  const position = Math.max(1, Number(req.body.position) || 1);
  const result = await query('INSERT INTO lessons(course_id,title,content,video_url,position) VALUES(:courseId,:title,:content,:video,:position)', { courseId, title, content, video: req.body.video_url || null, position });
  res.status(201).json({ lesson: { id: result.insertId, course_id: courseId, title, content, position } });
}));
router.put('/lessons/:id', ...admin, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id), title = requiredText(req.body.title, 'Title', 180), content = requiredText(req.body.content, 'Content', 20000);
  const result = await query('UPDATE lessons SET title=:title,content=:content,video_url=:video,position=:position WHERE id=:id', { id, title, content, video: req.body.video_url || null, position: Math.max(1, Number(req.body.position) || 1) });
  if (!result.affectedRows) return res.status(404).json({ message: 'Lesson not found.' });
  res.json({ message: 'Lesson updated.' });
}));
router.delete('/lessons/:id', ...admin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM lessons WHERE id=:id', { id: positiveId(req.params.id) });
  if (!result.affectedRows) return res.status(404).json({ message: 'Lesson not found.' });
  res.json({ message: 'Lesson deleted.' });
}));

// Enrollment and progress
router.post('/courses/:courseId/enroll', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const courses = await query('SELECT id FROM courses WHERE id=:id AND published=1', { id: courseId });
  if (!courses.length) return res.status(404).json({ message: 'Published course not found.' });
  await query('INSERT INTO enrollments(student_id,course_id) VALUES(:student,:course)', { student: req.user.id, course: courseId });
  res.status(201).json({ message: 'You are enrolled in this course.' });
}));
router.get('/enrollments/my', ...student, asyncHandler(async (req, res) => {
  const enrollments = await query(`SELECT c.id,c.title,c.description,c.thumbnail_url,c.category,c.difficulty,u.name instructor,e.enrolled_at,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) lesson_count,
    (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l2 ON l2.id=p.lesson_id WHERE l2.course_id=c.id AND p.student_id=:student AND p.completed=1) completed_count
    FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=c.instructor_id WHERE e.student_id=:student ORDER BY e.enrolled_at DESC`, { student: req.user.id });
  res.json({ courses: enrollments.map(c => ({ ...c, progress: c.lesson_count ? Math.round(c.completed_count * 100 / c.lesson_count) : 0 })) });
}));
router.get('/courses/:courseId/progress', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  if (!(await hasEnrollment(req.user.id, courseId))) return res.status(403).json({ message: 'You are not enrolled in this course.' });
  const progress = await query(`SELECT l.id AS lesson_id,l.title,l.position,COALESCE(p.completed,0) completed,p.completed_at FROM lessons l LEFT JOIN lesson_progress p ON p.lesson_id=l.id AND p.student_id=:student WHERE l.course_id=:course ORDER BY l.position,l.id`, { student: req.user.id, course: courseId });
  res.json({ progress, percentage: progress.length ? Math.round(progress.filter(p => p.completed).length * 100 / progress.length) : 0 });
}));
router.put('/lessons/:lessonId/progress', ...student, asyncHandler(async (req, res) => {
  const lessonId = positiveId(req.params.lessonId), done = req.body.completed !== false;
  const lessons = await query('SELECT id,course_id FROM lessons WHERE id=:id', { id: lessonId });
  if (!lessons.length) return res.status(404).json({ message: 'Lesson not found.' });
  if (!(await hasEnrollment(req.user.id, lessons[0].course_id))) return res.status(403).json({ message: 'You are not enrolled in this course.' });
  await query(`INSERT INTO lesson_progress(student_id,lesson_id,completed,completed_at) VALUES(:student,:lesson,:completed,CASE WHEN :completed=1 THEN CURRENT_TIMESTAMP ELSE NULL END) ON CONFLICT(student_id,lesson_id) DO UPDATE SET completed=excluded.completed,completed_at=CASE WHEN excluded.completed=1 THEN CURRENT_TIMESTAMP ELSE NULL END`, { student: req.user.id, lesson: lessonId, completed: done ? 1 : 0 });
  res.json({ message: done ? 'Lesson marked complete.' : 'Lesson marked incomplete.' });
}));

// Assignments and submissions
router.get('/courses/:courseId/assignments', authenticate, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  if (req.user.role !== 'admin' && !(await hasEnrollment(req.user.id, courseId))) return res.status(403).json({ message: 'You are not enrolled in this course.' });
  const assignments = await query(`SELECT a.id,a.course_id,a.title,a.instructions,a.due_date,a.max_score,a.created_at,s.id AS submission_id,s.submitted_at,s.score,s.feedback FROM assignments a LEFT JOIN submissions s ON s.assignment_id=a.id AND s.student_id=:student WHERE a.course_id=:course ORDER BY a.due_date`, { student: req.user.id, course: courseId });
  res.json({ assignments });
}));

// ── Feature 3: Assignment due-date reminders for student ──
router.get('/assignments/reminders', ...student, asyncHandler(async (req, res) => {
  const now = new Date().toISOString();
  // All assignments for courses the student is enrolled in, with submission info
  const assignments = await query(`
    SELECT a.id,a.course_id,a.title,a.due_date,a.max_score,c.title AS course_title,
      s.id AS submission_id,s.submitted_at,s.score,s.feedback
    FROM assignments a
    JOIN courses c ON c.id=a.course_id
    JOIN enrollments e ON e.course_id=a.course_id AND e.student_id=:student
    LEFT JOIN submissions s ON s.assignment_id=a.id AND s.student_id=:student
    ORDER BY a.due_date ASC`, { student: req.user.id });
  res.json({ assignments, serverTime: now });
}));

router.post('/courses/:courseId/assignments', ...admin, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId), title = requiredText(req.body.title, 'Title', 180), instructions = requiredText(req.body.instructions, 'Instructions', 10000), maxScore = Number(req.body.max_score || 100);
  if (!Number.isFinite(maxScore) || maxScore <= 0 || maxScore > 10000) return res.status(400).json({ message: 'Maximum score must be between 1 and 10000.' });
  const result = await query('INSERT INTO assignments(course_id,title,instructions,due_date,max_score) VALUES(:course,:title,:instructions,:due,:score)', { course: courseId, title, instructions, due: req.body.due_date || null, score: maxScore });
  res.status(201).json({ assignment: { id: result.insertId, course_id: courseId, title }, message: 'Assignment created.' });
}));
router.put('/assignments/:id', ...admin, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id), title = requiredText(req.body.title, 'Title', 180), instructions = requiredText(req.body.instructions, 'Instructions', 10000), score = Number(req.body.max_score || 100);
  if (!Number.isFinite(score) || score <= 0 || score > 10000) return res.status(400).json({ message: 'Maximum score must be between 1 and 10000.' });
  const result = await query('UPDATE assignments SET title=:title,instructions=:instructions,due_date=:due,max_score=:score WHERE id=:id', { id, title, instructions, due: req.body.due_date || null, score });
  if (!result.affectedRows) return res.status(404).json({ message: 'Assignment not found.' });
  res.json({ message: 'Assignment updated.' });
}));
router.delete('/assignments/:id', ...admin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM assignments WHERE id=:id', { id: positiveId(req.params.id) });
  if (!result.affectedRows) return res.status(404).json({ message: 'Assignment not found.' });
  res.json({ message: 'Assignment deleted.' });
}));
router.post('/assignments/:id/submissions', ...student, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id), text = String(req.body.submission_text || '').trim(), url = String(req.body.submission_url || '').trim();
  if (!text && !url) return res.status(400).json({ message: 'Enter your work or provide a submission URL.' });
  if (text.length > 20000 || url.length > 2000) return res.status(400).json({ message: 'Submission is too long.' });
  if (url && !/^https?:\/\//i.test(url)) return res.status(400).json({ message: 'Submission URL must start with http:// or https://.' });
  const assignments = await query('SELECT a.id,a.course_id,a.due_date FROM assignments a JOIN enrollments e ON e.course_id=a.course_id WHERE a.id=:id AND e.student_id=:student', { id, student: req.user.id });
  if (!assignments.length) return res.status(403).json({ message: 'Assignment not found or you are not enrolled.' });
  if (assignments[0].due_date && new Date(assignments[0].due_date).getTime() < Date.now()) return res.status(400).json({ message: 'The deadline has passed. Submissions are closed.' });
  await query('INSERT INTO submissions(assignment_id,student_id,submission_text,submission_url) VALUES(:assignment,:student,:text,:url) ON CONFLICT(assignment_id,student_id) DO UPDATE SET submission_text=excluded.submission_text,submission_url=excluded.submission_url,submitted_at=CURRENT_TIMESTAMP,score=NULL,feedback=NULL,graded_at=NULL,graded_by=NULL', { assignment: id, student: req.user.id, text: text || null, url: url || null });
  res.status(201).json({ message: 'Assignment submitted successfully.' });
}));
router.get('/assignments/:id/submissions', authenticate, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id);
  if (req.user.role === 'admin') {
    const submissions = await query(`SELECT s.*,u.name student_name,u.email student_email FROM submissions s JOIN users u ON u.id=s.student_id WHERE s.assignment_id=:id ORDER BY s.submitted_at DESC`, { id });
    return res.json({ submissions });
  }
  const submissions = await query(`SELECT s.id,s.assignment_id,s.student_id,s.submission_text,s.submission_url,s.submitted_at,s.score,s.feedback,s.graded_at FROM submissions s JOIN assignments a ON a.id=s.assignment_id JOIN enrollments e ON e.course_id=a.course_id AND e.student_id=s.student_id WHERE s.assignment_id=:id AND s.student_id=:student AND e.student_id=:student`, { id, student: req.user.id });
  res.json({ submissions });
}));
router.put('/submissions/:id/grade', ...admin, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id), score = Number(req.body.score);
  if (!Number.isFinite(score) || score < 0) return res.status(400).json({ message: 'Score must be zero or greater.' });
  const rows = await query('SELECT s.id,a.max_score FROM submissions s JOIN assignments a ON a.id=s.assignment_id WHERE s.id=:id', { id });
  if (!rows.length) return res.status(404).json({ message: 'Submission not found.' });
  if (score > rows[0].max_score) return res.status(400).json({ message: `Score cannot exceed ${rows[0].max_score}.` });
  await query('UPDATE submissions SET score=:score,feedback=:feedback,graded_at=CURRENT_TIMESTAMP,graded_by=:admin WHERE id=:id', { id, score, feedback: String(req.body.feedback || '').slice(0, 5000) || null, admin: req.user.id });
  res.json({ message: 'Submission graded.' });
}));

// ── Feature 4: Favorites / Wishlist ──
router.get('/favorites', ...student, asyncHandler(async (req, res) => {
  const favorites = await query(`SELECT c.id,c.title,c.description,c.thumbnail_url,c.category,c.difficulty,u.name AS instructor,
    (SELECT COUNT(*) FROM lessons l WHERE l.course_id=c.id) AS lesson_count,
    (SELECT COUNT(*) FROM enrollments e2 WHERE e2.course_id=c.id) AS student_count,
    ROUND(COALESCE((SELECT AVG(r.rating) FROM course_reviews r WHERE r.course_id=c.id),0),1) AS avg_rating,
    f.created_at AS favorited_at
    FROM favorites f JOIN courses c ON c.id=f.course_id JOIN users u ON u.id=c.instructor_id
    WHERE f.student_id=:student AND c.published=1
    ORDER BY f.created_at DESC`, { student: req.user.id });
  res.json({ favorites });
}));
router.post('/favorites/:courseId', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const courses = await query('SELECT id FROM courses WHERE id=:id AND published=1', { id: courseId });
  if (!courses.length) return res.status(404).json({ message: 'Published course not found.' });
  await query('INSERT INTO favorites(student_id,course_id) VALUES(:student,:course)', { student: req.user.id, course: courseId });
  res.status(201).json({ message: 'Added to favorites.' });
}));
router.delete('/favorites/:courseId', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const result = await query('DELETE FROM favorites WHERE student_id=:student AND course_id=:course', { student: req.user.id, course: courseId });
  if (!result.affectedRows) return res.status(404).json({ message: 'Favorite not found.' });
  res.json({ message: 'Removed from favorites.' });
}));
router.get('/favorites/check/:courseId', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const rows = await query('SELECT id FROM favorites WHERE student_id=:student AND course_id=:course', { student: req.user.id, course: courseId });
  res.json({ isFavorite: rows.length > 0 });
}));

// ── Feature 5: Quiz System ──
// Admin quiz management
router.get('/courses/:courseId/quizzes', authenticate, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !(await hasEnrollment(req.user.id, courseId))) return res.status(403).json({ message: 'You are not enrolled in this course.' });
  const sql = isAdmin
    ? 'SELECT q.*,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS question_count FROM quizzes q WHERE q.course_id=:courseId ORDER BY q.created_at DESC'
    : 'SELECT q.id,q.course_id,q.title,q.instructions,q.pass_percent,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) AS question_count FROM quizzes q WHERE q.course_id=:courseId AND q.published=1 ORDER BY q.created_at DESC';
  const quizzes = await query(sql, { courseId });
  res.json({ quizzes });
}));
router.post('/courses/:courseId/quizzes', ...admin, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const title = requiredText(req.body.title, 'Title', 180);
  const instructions = String(req.body.instructions || '').slice(0, 5000).trim();
  const passPercent = Math.min(100, Math.max(0, Number(req.body.pass_percent ?? 60)));
  const result = await query('INSERT INTO quizzes(course_id,title,instructions,pass_percent,published) VALUES(:courseId,:title,:instructions,:pass,:pub)',
    { courseId, title, instructions: instructions || null, pass: passPercent, pub: req.body.published ? 1 : 0 });
  res.status(201).json({ quiz: { id: result.insertId }, message: 'Quiz created.' });
}));
router.put('/quizzes/:id', ...admin, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id);
  const title = requiredText(req.body.title, 'Title', 180);
  const instructions = String(req.body.instructions || '').slice(0, 5000).trim();
  const passPercent = Math.min(100, Math.max(0, Number(req.body.pass_percent ?? 60)));
  const result = await query('UPDATE quizzes SET title=:title,instructions=:instructions,pass_percent=:pass,published=:pub,updated_at=CURRENT_TIMESTAMP WHERE id=:id',
    { id, title, instructions: instructions || null, pass: passPercent, pub: req.body.published ? 1 : 0 });
  if (!result.affectedRows) return res.status(404).json({ message: 'Quiz not found.' });
  res.json({ message: 'Quiz updated.' });
}));
router.delete('/quizzes/:id', ...admin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM quizzes WHERE id=:id', { id: positiveId(req.params.id) });
  if (!result.affectedRows) return res.status(404).json({ message: 'Quiz not found.' });
  res.json({ message: 'Quiz deleted.' });
}));

// Quiz questions
router.get('/quizzes/:quizId/questions', authenticate, asyncHandler(async (req, res) => {
  const quizId = positiveId(req.params.quizId);
  const quizRows = await query('SELECT q.*,c.published AS course_published FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.id=:id', { id: quizId });
  if (!quizRows.length) return res.status(404).json({ message: 'Quiz not found.' });
  const quiz = quizRows[0];
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && (!quiz.published || !(await hasEnrollment(req.user.id, quiz.course_id)))) return res.status(403).json({ message: 'Quiz not accessible.' });

  // For students: never expose correct_option
  const fields = isAdmin
    ? 'id,quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,position'
    : 'id,quiz_id,question_text,option_a,option_b,option_c,option_d,position';
  const questions = await query(`SELECT ${fields} FROM quiz_questions WHERE quiz_id=:quizId ORDER BY position,id`, { quizId });
  res.json({ questions, quiz: isAdmin ? quiz : { id: quiz.id, title: quiz.title, instructions: quiz.instructions, pass_percent: quiz.pass_percent } });
}));
router.post('/quizzes/:quizId/questions', ...admin, asyncHandler(async (req, res) => {
  const quizId = positiveId(req.params.quizId);
  const quizRows = await query('SELECT id FROM quizzes WHERE id=:id', { id: quizId });
  if (!quizRows.length) return res.status(404).json({ message: 'Quiz not found.' });
  const question_text = requiredText(req.body.question_text, 'Question', 2000);
  const option_a = requiredText(req.body.option_a, 'Option A', 500);
  const option_b = requiredText(req.body.option_b, 'Option B', 500);
  const option_c = requiredText(req.body.option_c, 'Option C', 500);
  const option_d = requiredText(req.body.option_d, 'Option D', 500);
  if (!['a','b','c','d'].includes(req.body.correct_option)) { const e = new Error('Correct option must be a, b, c, or d.'); e.status = 400; throw e; }
  const correct_option = req.body.correct_option;
  const count = await query('SELECT COUNT(*) AS n FROM quiz_questions WHERE quiz_id=:quizId', { quizId });
  const position = count[0].n + 1;
  const result = await query('INSERT INTO quiz_questions(quiz_id,question_text,option_a,option_b,option_c,option_d,correct_option,position) VALUES(:quizId,:q,:a,:b,:c,:d,:correct,:pos)',
    { quizId, q: question_text, a: option_a, b: option_b, c: option_c, d: option_d, correct: correct_option, pos: position });
  res.status(201).json({ question: { id: result.insertId }, message: 'Question added.' });
}));
router.put('/quiz-questions/:id', ...admin, asyncHandler(async (req, res) => {
  const id = positiveId(req.params.id);
  const question_text = requiredText(req.body.question_text, 'Question', 2000);
  const option_a = requiredText(req.body.option_a, 'Option A', 500);
  const option_b = requiredText(req.body.option_b, 'Option B', 500);
  const option_c = requiredText(req.body.option_c, 'Option C', 500);
  const option_d = requiredText(req.body.option_d, 'Option D', 500);
  if (!['a','b','c','d'].includes(req.body.correct_option)) { const e = new Error('Correct option must be a, b, c, or d.'); e.status = 400; throw e; }
  const result = await query('UPDATE quiz_questions SET question_text=:q,option_a=:a,option_b=:b,option_c=:c,option_d=:d,correct_option=:correct WHERE id=:id',
    { id, q: question_text, a: option_a, b: option_b, c: option_c, d: option_d, correct: req.body.correct_option });
  if (!result.affectedRows) return res.status(404).json({ message: 'Question not found.' });
  res.json({ message: 'Question updated.' });
}));
router.delete('/quiz-questions/:id', ...admin, asyncHandler(async (req, res) => {
  const result = await query('DELETE FROM quiz_questions WHERE id=:id', { id: positiveId(req.params.id) });
  if (!result.affectedRows) return res.status(404).json({ message: 'Question not found.' });
  res.json({ message: 'Question deleted.' });
}));

// Quiz attempts (student)
router.get('/quizzes/:quizId/attempts', ...student, asyncHandler(async (req, res) => {
  const quizId = positiveId(req.params.quizId);
  const attempts = await query(`SELECT a.*,
    (SELECT json_group_array(json_object('question_id',qa.question_id,'selected_option',qa.selected_option,'is_correct',qa.is_correct))
     FROM quiz_answers qa WHERE qa.attempt_id=a.id) AS answers_json
    FROM quiz_attempts a WHERE a.quiz_id=:quizId AND a.student_id=:student ORDER BY a.attempted_at DESC`, { quizId, student: req.user.id });
  const result = attempts.map(a => ({ ...a, answers: a.answers_json ? JSON.parse(a.answers_json) : [] }));
  result.forEach(r => delete r.answers_json);
  res.json({ attempts: result });
}));

router.post('/quizzes/:quizId/submit', ...student, asyncHandler(async (req, res) => {
  const quizId = positiveId(req.params.quizId);
  const quizRows = await query('SELECT q.*,c.published AS course_published FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.id=:id', { id: quizId });
  if (!quizRows.length || !quizRows[0].published) return res.status(404).json({ message: 'Quiz not found.' });
  const quiz = quizRows[0];
  if (!(await hasEnrollment(req.user.id, quiz.course_id))) return res.status(403).json({ message: 'You are not enrolled in this course.' });

  // Get all questions with correct answers (server-side grading)
  const questions = await query('SELECT id,correct_option FROM quiz_questions WHERE quiz_id=:quizId', { quizId });
  if (!questions.length) return res.status(400).json({ message: 'This quiz has no questions yet.' });

  const answers = req.body.answers; // [{question_id, selected_option}]
  if (!Array.isArray(answers) || answers.length === 0) return res.status(400).json({ message: 'Please answer at least one question.' });

  // Validate all submitted question IDs belong to this quiz
  const validIds = new Set(questions.map(q => q.id));
  for (const a of answers) {
    const qId = Number(a.question_id);
    if (!validIds.has(qId)) return res.status(400).json({ message: `Invalid question id: ${qId}` });
    if (!['a','b','c','d'].includes(a.selected_option)) return res.status(400).json({ message: 'Invalid answer option.' });
  }

  // Grade server-side
  const correctMap = Object.fromEntries(questions.map(q => [q.id, q.correct_option]));
  let score = 0;
  const graded = answers.map(a => {
    const qId = Number(a.question_id);
    const isCorrect = correctMap[qId] === a.selected_option ? 1 : 0;
    if (isCorrect) score++;
    return { question_id: qId, selected_option: a.selected_option, is_correct: isCorrect };
  });

  const total = questions.length;
  const percentage = Math.round(score * 100 / total);
  const passed = percentage >= quiz.pass_percent ? 1 : 0;

  // Use a synchronous transaction via better-sqlite3
  const { default: Database } = await import('better-sqlite3');
  // We use the query helper via a transaction workaround — insert attempt then answers
  const attempt = await query('INSERT INTO quiz_attempts(quiz_id,student_id,score,total,percentage,passed) VALUES(:quizId,:student,:score,:total,:pct,:passed)',
    { quizId, student: req.user.id, score, total, pct: percentage, passed });
  const attemptId = attempt.insertId;
  for (const g of graded) {
    await query('INSERT INTO quiz_answers(attempt_id,question_id,selected_option,is_correct) VALUES(:attempt,:question,:sel,:correct)',
      { attempt: attemptId, question: g.question_id, sel: g.selected_option, correct: g.is_correct });
  }

  // Return results with correct answers revealed
  const enriched = graded.map(g => ({
    ...g,
    correct_option: correctMap[g.question_id]
  }));

  res.status(201).json({
    attempt: { id: attemptId, score, total, percentage, passed: passed === 1, pass_percent: quiz.pass_percent },
    answers: enriched,
    message: passed ? `You passed! Score: ${score}/${total} (${percentage}%)` : `Score: ${score}/${total} (${percentage}%). Passing requires ${quiz.pass_percent}%.`
  });
}));

// ── Feature 6: Course Completion Certificate ──
router.get('/courses/:courseId/certificate', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);

  if (!(await hasEnrollment(req.user.id, courseId))) return res.status(403).json({ message: 'You are not enrolled in this course.' });

  const courseRows = await query('SELECT c.*,u.name AS instructor FROM courses c JOIN users u ON u.id=c.instructor_id WHERE c.id=:id AND c.published=1', { id: courseId });
  if (!courseRows.length) return res.status(404).json({ message: 'Course not found.' });
  const course = courseRows[0];

  // Verify completion on the server
  const progressRows = await query('SELECT COUNT(*) AS total FROM lessons WHERE course_id=:courseId', { courseId });
  const total = progressRows[0].total;
  if (total === 0) return res.status(400).json({ message: 'This course has no lessons yet.' });

  const completedRows = await query(`SELECT COUNT(*) AS done FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE l.course_id=:courseId AND p.student_id=:student AND p.completed=1`, { courseId, student: req.user.id });
  const done = completedRows[0].done;
  if (done < total) return res.status(400).json({ message: `Complete all ${total} lessons to download the certificate. You've completed ${done}.` });

  // Generate PDF
  const { default: PDFDocument } = await import('pdfkit');
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 60 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificate-${req.user.id}-${courseId}.pdf"`);
  doc.pipe(res);

  const W = 841.89, H = 595.28;
  const completedAt = await query('SELECT MAX(completed_at) AS dt FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id WHERE l.course_id=:courseId AND p.student_id=:student AND p.completed=1', { courseId, student: req.user.id });
  const completionDate = completedAt[0]?.dt ? new Date(completedAt[0].dt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const certId = `LS-${req.user.id}-${courseId}-${Date.now().toString(36).toUpperCase()}`;

  // Background
  doc.rect(0, 0, W, H).fill('#f9f8ff');
  // Border
  doc.rect(30, 30, W-60, H-60).lineWidth(2).strokeColor('#7865f4').stroke();
  doc.rect(38, 38, W-76, H-76).lineWidth(0.5).strokeColor('#c4b8ff').stroke();

  // Header bar
  doc.rect(0, 0, W, 90).fill('#101c3a');

  // Title
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#b6acff').text('LEARNSPACE', 0, 28, { align: 'center', width: W });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#8888cc').text('LEARNING MANAGEMENT SYSTEM', 0, 44, { align: 'center', width: W });

  // Certificate heading
  doc.font('Helvetica-Bold').fontSize(36).fillColor('#1c2540').text('Certificate of Completion', 0, 110, { align: 'center', width: W });

  // Sub text
  doc.font('Helvetica').fontSize(13).fillColor('#7d859b').text('This is to certify that', 0, 170, { align: 'center', width: W });

  // Student name
  doc.font('Helvetica-Bold').fontSize(30).fillColor('#7865f4').text(req.user.name, 0, 195, { align: 'center', width: W });

  // Line under name
  doc.moveTo(W/2 - 180, 238).lineTo(W/2 + 180, 238).lineWidth(1.5).strokeColor('#c4b8ff').stroke();

  doc.font('Helvetica').fontSize(13).fillColor('#7d859b').text('has successfully completed', 0, 248, { align: 'center', width: W });

  // Course title
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#202a47').text(course.title, 60, 273, { align: 'center', width: W - 120 });

  // Details
  doc.font('Helvetica').fontSize(11).fillColor('#8a92a8').text(`Instructor: ${course.instructor}`, 0, 330, { align: 'center', width: W });
  doc.font('Helvetica').fontSize(11).fillColor('#8a92a8').text(`Completed on: ${completionDate}`, 0, 348, { align: 'center', width: W });

  // Footer
  doc.rect(0, H - 70, W, 70).fill('#101c3a');
  doc.font('Helvetica').fontSize(8).fillColor('#8888cc').text(`Certificate ID: ${certId}`, 60, H - 50);
  doc.font('Helvetica').fontSize(8).fillColor('#8888cc').text('LearnSpace LMS · learnspace.app', 0, H - 50, { align: 'right', width: W - 60 });

  doc.end();
}));

// ── Feature 7: Course Ratings and Reviews ──
router.get('/courses/:courseId/reviews', optionalAuthenticate, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const reviews = await query(`SELECT r.id,r.rating,r.review_text,r.created_at,r.updated_at,u.name AS student_name,
    (CASE WHEN :userId > 0 AND r.student_id=:userId THEN 1 ELSE 0 END) AS is_mine
    FROM course_reviews r JOIN users u ON u.id=r.student_id WHERE r.course_id=:courseId ORDER BY r.created_at DESC`,
    { courseId, userId: req.user?.id || 0 });
  const stats = await query('SELECT ROUND(AVG(rating),1) AS avg_rating, COUNT(*) AS review_count FROM course_reviews WHERE course_id=:courseId', { courseId });
  res.json({ reviews, avg_rating: stats[0]?.avg_rating || 0, review_count: stats[0]?.review_count || 0 });
}));

router.post('/courses/:courseId/reviews', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  if (!(await hasEnrollment(req.user.id, courseId))) return res.status(403).json({ message: 'You must be enrolled to leave a review.' });
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
  const review_text = String(req.body.review_text || '').trim().slice(0, 3000) || null;
  await query('INSERT INTO course_reviews(course_id,student_id,rating,review_text) VALUES(:courseId,:student,:rating,:text)',
    { courseId, student: req.user.id, rating, text: review_text });
  res.status(201).json({ message: 'Review submitted. Thank you!' });
}));

router.put('/courses/:courseId/reviews', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const rating = Number(req.body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
  const review_text = String(req.body.review_text || '').trim().slice(0, 3000) || null;
  const result = await query('UPDATE course_reviews SET rating=:rating,review_text=:text,updated_at=CURRENT_TIMESTAMP WHERE course_id=:courseId AND student_id=:student',
    { courseId, student: req.user.id, rating, text: review_text });
  if (!result.affectedRows) return res.status(404).json({ message: 'Review not found. Submit a new review first.' });
  res.json({ message: 'Review updated.' });
}));

router.delete('/courses/:courseId/reviews', ...student, asyncHandler(async (req, res) => {
  const courseId = positiveId(req.params.courseId);
  const result = await query('DELETE FROM course_reviews WHERE course_id=:courseId AND student_id=:student', { courseId, student: req.user.id });
  if (!result.affectedRows) return res.status(404).json({ message: 'Review not found.' });
  res.json({ message: 'Review deleted.' });
}));

// Admin dashboard
router.get('/admin/dashboard', ...admin, asyncHandler(async (_req, res) => {
  const [users] = await query('SELECT COUNT(*) total FROM users WHERE role=\'student\'');
  const [courses] = await query('SELECT COUNT(*) total FROM courses');
  const [enrollments] = await query('SELECT COUNT(*) total FROM enrollments');
  const [submissions] = await query('SELECT COUNT(*) total FROM submissions');
  const recent = await query(`SELECT s.id,s.submitted_at,s.score,s.feedback,a.max_score,u.name student_name,a.title assignment_title,c.title course_title FROM submissions s JOIN users u ON u.id=s.student_id JOIN assignments a ON a.id=s.assignment_id JOIN courses c ON c.id=a.course_id ORDER BY s.submitted_at DESC LIMIT 8`);
  res.json({ stats: { students: users.total, courses: courses.total, enrollments: enrollments.total, submissions: submissions.total }, recentSubmissions: recent });
}));

export default router;
