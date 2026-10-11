import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, GraduationCap, Users, ClipboardCheck, Plus, Pencil, Trash2, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardLayout } from '../components/Layout';
import { Alert, Empty, Loading } from '../components/States';
import api, { messageFrom } from '../services/api';

export function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [grades, setGrades] = useState({});
  useEffect(() => {
    api.get('/admin/dashboard').then(r => {
      setData(r.data);
      setGrades(Object.fromEntries(r.data.recentSubmissions.map(s => [s.id, { score: s.score ?? '', feedback: s.feedback || '' }])));
    }).catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  }, []);
  const saveGrade = async s => {
    setError(''); setNotice('');
    try {
      const g = grades[s.id] || {};
      await api.put(`/submissions/${s.id}/grade`, { score: Number(g.score), feedback: g.feedback || '' });
      setNotice(`Graded ${s.student_name}'s submission.`);
      const r = await api.get('/admin/dashboard'); setData(r.data);
    } catch (e) { setError(messageFrom(e)); }
  };
  const stats = [['Students', data?.stats.students, Users, 'metric-purple'], ['Courses', data?.stats.courses, BookOpen, 'metric-blue'], ['Enrollments', data?.stats.enrollments, GraduationCap, 'metric-green'], ['Submissions', data?.stats.submissions, ClipboardCheck, 'metric-orange']];
  return (
    <DashboardLayout admin>
      <div className="dash-welcome">
        <div><div className="eyebrow">ADMIN WORKSPACE</div><h1>Dashboard overview</h1><p>Manage learning content and see how your students are doing.</p></div>
        <Link className="button" to="/admin/courses/new"><Plus size={18} /> Create course</Link>
      </div>
      <Alert>{error}</Alert>
      {loading ? <Loading /> : <>
        <div className="metric-grid admin-metrics">{stats.map(([label, value, Icon, cl]) => <div className="metric-card" key={label}><span className={`metric-icon ${cl}`}><Icon /></span><div><small>{label}</small><strong>{value ?? 0}</strong></div></div>)}</div>
        <div className="admin-quick-grid">
          <Link to="/admin/courses" className="admin-quick-card"><span className="metric-icon metric-purple"><BookOpen /></span><h3>Manage courses</h3><p>Create courses, update details, and publish them for students.</p><span className="text-link">Open course manager <ArrowRight size={16} /></span></Link>
          <Link to="/admin/quizzes" className="admin-quick-card"><span className="metric-icon metric-blue"><Brain /></span><h3>Manage quizzes</h3><p>Create quizzes, add questions, and publish them for enrolled students.</p><span className="text-link">Open quiz manager <ArrowRight size={16} /></span></Link>
          <Link to="/admin/students" className="admin-quick-card"><span className="metric-icon metric-green"><Users /></span><h3>Manage students</h3><p>View registered students and the courses they have joined.</p><span className="text-link">View students <ArrowRight size={16} /></span></Link>
        </div>
        <section className="admin-table-section">
          <div className="dash-section-heading"><div><h2>Recent submissions</h2><p>Review work, assign a score, and leave feedback.</p></div></div>
          <Alert>{error}</Alert><Alert type="success">{notice}</Alert>
          {data.recentSubmissions.length
            ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Student / assignment</th><th>Course</th><th>Submitted</th><th>Score</th><th>Feedback</th><th>Action</th></tr></thead>
              <tbody>{data.recentSubmissions.map(s => <tr key={s.id}><td><strong>{s.student_name}</strong><br /><span>{s.assignment_title}</span></td><td>{s.course_title}</td><td>{new Date(s.submitted_at).toLocaleDateString()}</td>
                <td><input className="grade-input" type="number" min="0" max={s.max_score} value={grades[s.id]?.score ?? s.score ?? ''} onChange={e => setGrades(g => ({ ...g, [s.id]: { ...g[s.id], score: e.target.value } }))} aria-label={`Score for ${s.student_name}`} /><small> / {s.max_score}</small></td>
                <td><input className="grade-feedback-input" value={grades[s.id]?.feedback ?? s.feedback ?? ''} onChange={e => setGrades(g => ({ ...g, [s.id]: { ...g[s.id], feedback: e.target.value } }))} placeholder="Feedback…" aria-label={`Feedback for ${s.student_name}`} /></td>
                <td><button className="button button-small" onClick={() => saveGrade(s)}>Save grade</button></td></tr>)}</tbody></table></div>
            : <Empty title="No submissions yet" detail="Student assignment submissions will appear here." />}
        </section>
      </>}
    </DashboardLayout>
  );
}

export function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = () => api.get('/courses').then(r => setCourses(r.data.courses)).catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const remove = async c => { if (!window.confirm(`Delete "${c.title}" and its lessons and assignments?`)) return; try { await api.delete(`/courses/${c.id}`); setNotice('Course deleted.'); load(); } catch (e) { setError(messageFrom(e)); } };
  const toggle = async c => { try { await api.put(`/courses/${c.id}`, { title: c.title, description: c.description, thumbnail_url: c.thumbnail_url, published: !c.published, category: c.category, difficulty: c.difficulty }); setNotice(`Course ${c.published ? 'unpublished' : 'published'}.`); load(); } catch (e) { setError(messageFrom(e)); } };
  return (
    <DashboardLayout admin>
      <div className="dash-welcome"><div><div className="eyebrow">CONTENT MANAGEMENT</div><h1>Manage courses</h1><p>Create and maintain the learning catalogue.</p></div><Link className="button" to="/admin/courses/new"><Plus size={18} /> New course</Link></div>
      <Alert>{error}</Alert><Alert type="success">{notice}</Alert>
      {loading ? <Loading /> : courses.length
        ? <div className="admin-course-list">{courses.map(c => <article className="admin-course-row" key={c.id}>
            <img src={c.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=400&q=80'} alt="" />
            <div className="admin-course-info">
              <div className="admin-course-title"><h3>{c.title}</h3><span className={`status-badge ${c.published ? 'published' : 'draft'}`}>{c.published ? 'Published' : 'Draft'}</span>{c.category && <span className="status-badge" style={{ background: '#e9f4ff', color: '#3a79c5' }}>{c.category}</span>}{c.difficulty && <span className="status-badge" style={{ background: '#f0edff', color: '#6654e6' }}>{c.difficulty}</span>}</div>
              <p>{c.description}</p><small>{c.lesson_count} lessons · {c.student_count} students</small>
            </div>
            <div className="admin-course-actions">
              <Link className="icon-button" title="Edit course" to={`/admin/courses/${c.id}`}><Pencil size={17} /></Link>
              <button className="icon-button" title={c.published ? 'Unpublish' : 'Publish'} onClick={() => toggle(c)}>{c.published ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              <button className="icon-button danger" title="Delete course" onClick={() => remove(c)}><Trash2 size={17} /></button>
            </div>
          </article>)}</div>
        : <Empty title="No courses yet" detail="Create your first course to start building your learning catalogue." />}
    </DashboardLayout>
  );
}

export function AdminCourseForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState('beginner');
  const [published, setPublished] = useState(true);
  const [lessons, setLessons] = useState([]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonVideo, setLessonVideo] = useState('');
  const [assignTitle, setAssignTitle] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const editing = window.location.pathname.match(/^\/admin\/courses\/(\d+)$/);
  const id = editing?.[1];

  useEffect(() => {
    if (id) api.get(`/courses/${id}`).then(r => {
      const c = r.data.course;
      setTitle(c.title); setDescription(c.description); setThumbnail(c.thumbnail_url || '');
      setPublished(Boolean(c.published)); setLessons(c.lessons || []);
      setCategory(c.category || 'General'); setDifficulty(c.difficulty || 'beginner');
    }).catch(e => setError(messageFrom(e)));
  }, [id]);

  const save = async e => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (id) { await api.put(`/courses/${id}`, { title, description, thumbnail_url: thumbnail, published, category, difficulty }); setNotice('Course details saved.'); }
      else { const r = await api.post('/courses', { title, description, thumbnail_url: thumbnail, published, category, difficulty }); window.location.href = `/admin/courses/${r.data.course.id}`; }
    } catch (e) { setError(messageFrom(e)); } finally { setBusy(false); }
  };
  const addLesson = async e => {
    e.preventDefault(); setError('');
    try { await api.post(`/courses/${id}/lessons`, { title: lessonTitle, content: lessonContent, video_url: lessonVideo, position: lessons.length + 1 }); setLessonTitle(''); setLessonContent(''); setLessonVideo(''); const r = await api.get(`/courses/${id}`); setLessons(r.data.course.lessons || []); setNotice('Lesson added.'); }
    catch (e) { setError(messageFrom(e)); }
  };
  const deleteLesson = async l => { try { await api.delete(`/lessons/${l.id}`); setLessons(s => s.filter(x => x.id !== l.id)); setNotice('Lesson deleted.'); } catch (e) { setError(messageFrom(e)); } };
  const addAssignment = async e => {
    e.preventDefault();
    try { await api.post(`/courses/${id}/assignments`, { title: assignTitle, instructions: assignInstructions, due_date: dueDate || null, max_score: Number(maxScore) }); setAssignTitle(''); setAssignInstructions(''); setDueDate(''); setNotice('Assignment added.'); }
    catch (e) { setError(messageFrom(e)); }
  };

  return (
    <DashboardLayout admin>
      <div className="dash-page-title"><Link className="back-link" to="/admin/courses">← Course manager</Link><div className="eyebrow">COURSE EDITOR</div><h1>{id ? 'Edit course' : 'Create a course'}</h1><p>Set up the course details, lessons, and assignments.</p></div>
      <Alert>{error}</Alert><Alert type="success">{notice}</Alert>
      <section className="editor-card">
        <h2>Course details</h2>
        <form className="form-stack" onSubmit={save}>
          <label>Course title<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. JavaScript Foundations" required maxLength={180} /></label>
          <label>Description<textarea rows="4" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will students learn?" required maxLength={10000} /></label>
          <div className="form-row">
            <label>Category<input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Programming" maxLength={80} /></label>
            <label>Difficulty level
              <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </div>
          <label>Thumbnail image URL <span className="form-hint">Optional — use a publicly accessible image URL.</span><input type="url" value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="https://example.com/course-image.jpg" /></label>
          <label className="checkbox-label"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> Publish this course so students can find it</label>
          <button className="button" disabled={busy}>{busy ? 'Saving…' : id ? 'Save course changes' : 'Create course'} <ArrowRight size={17} /></button>
        </form>
      </section>
      {id && <>
        <section className="editor-card">
          <div className="editor-heading"><div><h2>Lessons</h2><p>Add lesson content to this course. Students need to enroll to access it.</p></div></div>
          {lessons.map((l, i) => <div className="lesson-admin-row" key={l.id}><span className="lesson-number">{String(i + 1).padStart(2, '0')}</span><div><strong>{l.title}</strong><small>{l.content?.slice(0, 100)}</small></div><button className="icon-button danger" onClick={() => deleteLesson(l)} aria-label={`Delete ${l.title}`}><Trash2 size={17} /></button></div>)}
          <form className="form-stack add-content-form" onSubmit={addLesson}>
            <h3>Add a lesson</h3>
            <label>Lesson title<input value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} required maxLength={180} /></label>
            <label>Lesson content<textarea rows="4" value={lessonContent} onChange={e => setLessonContent(e.target.value)} required maxLength={20000} /></label>
            <label>Video URL (optional)<input type="url" value={lessonVideo} onChange={e => setLessonVideo(e.target.value)} placeholder="https://…" /></label>
            <button className="button button-outline"><Plus size={17} /> Add lesson</button>
          </form>
        </section>
        <section className="editor-card">
          <h2>Assignments</h2><p className="muted">Create an assignment for enrolled students.</p>
          <form className="form-stack" onSubmit={addAssignment}>
            <label>Assignment title<input value={assignTitle} onChange={e => setAssignTitle(e.target.value)} required maxLength={180} /></label>
            <label>Instructions<textarea rows="3" value={assignInstructions} onChange={e => setAssignInstructions(e.target.value)} required maxLength={10000} /></label>
            <div className="form-row"><label>Due date<input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label><label>Maximum score<input type="number" min="1" max="10000" value={maxScore} onChange={e => setMaxScore(e.target.value)} required /></label></div>
            <button className="button"><Plus size={17} /> Create assignment</button>
          </form>
        </section>
        <section className="editor-card">
          <div className="editor-heading"><div><h2>Quizzes</h2><p>Manage quizzes for this course from the <Link to="/admin/quizzes" className="text-link">quiz manager</Link>.</p></div></div>
        </section>
      </>}
    </DashboardLayout>
  );
}

export function AdminStudents() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/users').then(r => setUsers(r.data.users.filter(u => u.role === 'student'))).catch(e => setError(messageFrom(e))).finally(() => setLoading(false)); }, []);
  return (
    <DashboardLayout admin>
      <div className="dash-page-title"><div className="eyebrow">COMMUNITY</div><h1>Students</h1><p>Registered learners and their course enrollments.</p></div>
      <Alert>{error}</Alert>
      {loading ? <Loading /> : users.length
        ? <div className="table-scroll admin-table-section"><table className="data-table"><thead><tr><th>Student</th><th>Email</th><th>Enrolled courses</th><th>Joined</th></tr></thead>
          <tbody>{users.map(u => <tr key={u.id}><td><strong>{u.name}</strong></td><td>{u.email}</td><td>{u.enrollments}</td><td>{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
        : <Empty title="No students yet" detail="Students will appear here after creating an account." />}
    </DashboardLayout>
  );
}

// ── Feature 5: Admin Quiz Manager ──
export function AdminQuizzes() {
  const [courses, setCourses] = useState([]);
  const [quizzesByCourse, setQuizzesByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [expanded, setExpanded] = useState({});
  const [showForm, setShowForm] = useState(null); // courseId for form
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizInstructions, setNewQuizInstructions] = useState('');
  const [newQuizPass, setNewQuizPass] = useState('60');
  const [newQuizPublished, setNewQuizPublished] = useState(true);

  const loadAll = async () => {
    const r = await api.get('/courses');
    setCourses(r.data.courses);
    const map = {};
    await Promise.all(r.data.courses.map(async c => {
      const qr = await api.get(`/courses/${c.id}/quizzes`).catch(() => ({ data: { quizzes: [] } }));
      map[c.id] = qr.data.quizzes;
    }));
    setQuizzesByCourse(map);
  };
  useEffect(() => { loadAll().catch(e => setError(messageFrom(e))).finally(() => setLoading(false)); }, []);

  const createQuiz = async (courseId) => {
    setError(''); setNotice('');
    try {
      await api.post(`/courses/${courseId}/quizzes`, { title: newQuizTitle, instructions: newQuizInstructions, pass_percent: Number(newQuizPass), published: newQuizPublished });
      setNotice('Quiz created.'); setShowForm(null); setNewQuizTitle(''); setNewQuizInstructions(''); setNewQuizPass('60');
      await loadAll();
    } catch (e) { setError(messageFrom(e)); }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Delete this quiz and all its questions?')) return;
    try { await api.delete(`/quizzes/${quizId}`); setNotice('Quiz deleted.'); await loadAll(); }
    catch (e) { setError(messageFrom(e)); }
  };

  const togglePublish = async (quiz) => {
    try { await api.put(`/quizzes/${quiz.id}`, { title: quiz.title, instructions: quiz.instructions, pass_percent: quiz.pass_percent, published: !quiz.published }); setNotice(`Quiz ${quiz.published ? 'unpublished' : 'published'}.`); await loadAll(); }
    catch (e) { setError(messageFrom(e)); }
  };

  return (
    <DashboardLayout admin>
      <div className="dash-welcome"><div><div className="eyebrow">KNOWLEDGE CHECK</div><h1>Manage quizzes</h1><p>Create quizzes for your courses and publish them for students.</p></div></div>
      <Alert>{error}</Alert><Alert type="success">{notice}</Alert>
      {loading ? <Loading /> : courses.length
        ? courses.map(c => (
          <div key={c.id} className="quiz-course-section">
            <div className="quiz-course-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={16} /><strong>{c.title}</strong></div>
              <button className="button button-outline button-small" onClick={() => setShowForm(showForm === c.id ? null : c.id)}><Plus size={14} /> Add quiz</button>
            </div>
            {showForm === c.id && (
              <div className="quiz-form-inline">
                <input placeholder="Quiz title" value={newQuizTitle} onChange={e => setNewQuizTitle(e.target.value)} maxLength={180} />
                <input placeholder="Instructions (optional)" value={newQuizInstructions} onChange={e => setNewQuizInstructions(e.target.value)} />
                <input type="number" placeholder="Pass %" min="0" max="100" value={newQuizPass} onChange={e => setNewQuizPass(e.target.value)} style={{ width: 90 }} />
                <label className="checkbox-label"><input type="checkbox" checked={newQuizPublished} onChange={e => setNewQuizPublished(e.target.checked)} /> Published</label>
                <button className="button button-small" onClick={() => createQuiz(c.id)} disabled={!newQuizTitle.trim()}>Create</button>
                <button className="button button-outline button-small" onClick={() => setShowForm(null)}>Cancel</button>
              </div>
            )}
            {(quizzesByCourse[c.id] || []).map(q => (
              <AdminQuizRow key={q.id} quiz={q} onDelete={deleteQuiz} onToggle={togglePublish} onUpdate={loadAll} setNotice={setNotice} setError={setError} />
            ))}
            {!(quizzesByCourse[c.id] || []).length && <p className="muted" style={{ padding: '8px 16px' }}>No quizzes for this course yet.</p>}
          </div>))
        : <Empty title="No courses yet" detail="Create courses first, then add quizzes to them." />}
    </DashboardLayout>
  );
}

function AdminQuizRow({ quiz, onDelete, onToggle, onUpdate, setNotice, setError }) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQ, setLoadingQ] = useState(false);
  const [showAddQ, setShowAddQ] = useState(false);
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState('a');

  const loadQuestions = async () => {
    setLoadingQ(true);
    const r = await api.get(`/quizzes/${quiz.id}/questions`).catch(() => ({ data: { questions: [] } }));
    setQuestions(r.data.questions);
    setLoadingQ(false);
  };

  const toggle = () => { if (!open) loadQuestions(); setOpen(v => !v); };

  const addQuestion = async () => {
    try {
      await api.post(`/quizzes/${quiz.id}/questions`, { question_text: qText, option_a: optA, option_b: optB, option_c: optC, option_d: optD, correct_option: correct });
      setNotice('Question added.'); setQText(''); setOptA(''); setOptB(''); setOptC(''); setOptD(''); setCorrect('a'); setShowAddQ(false); loadQuestions();
    } catch (e) { setError(messageFrom(e)); }
  };

  const deleteQuestion = async (qId) => {
    try { await api.delete(`/quiz-questions/${qId}`); setNotice('Question deleted.'); loadQuestions(); }
    catch (e) { setError(messageFrom(e)); }
  };

  return (
    <div className="admin-quiz-row">
      <div className="admin-quiz-header">
        <div>
          <strong>{quiz.title}</strong>
          <small>{quiz.question_count} question{quiz.question_count !== 1 ? 's' : ''} · Pass: {quiz.pass_percent}%</small>
        </div>
        <div className="admin-course-actions">
          <span className={`status-badge ${quiz.published ? 'published' : 'draft'}`}>{quiz.published ? 'Published' : 'Draft'}</span>
          <button className="icon-button" title={quiz.published ? 'Unpublish' : 'Publish'} onClick={() => onToggle(quiz)}>{quiz.published ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          <button className="icon-button" onClick={toggle} title="Manage questions">{open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
          <button className="icon-button danger" onClick={() => onDelete(quiz.id)} title="Delete quiz"><Trash2 size={17} /></button>
        </div>
      </div>
      {open && (
        <div className="quiz-questions-panel">
          {loadingQ ? <Loading /> : questions.map((q, i) => (
            <div className="admin-question-row" key={q.id}>
              <span className="lesson-number">{i + 1}</span>
              <div style={{ flex: 1 }}>
                <strong>{q.question_text}</strong>
                <div className="q-options">
                  {['a','b','c','d'].map(o => <span key={o} className={q.correct_option === o ? 'correct-opt' : 'opt'}>{o.toUpperCase()}: {q[`option_${o}`]}</span>)}
                </div>
              </div>
              <button className="icon-button danger" onClick={() => deleteQuestion(q.id)} title="Delete question"><Trash2 size={15} /></button>
            </div>))}
          <button className="button button-outline button-small" style={{ margin: '12px 0 0' }} onClick={() => setShowAddQ(v => !v)}><Plus size={14} /> {showAddQ ? 'Cancel' : 'Add question'}</button>
          {showAddQ && (
            <div className="add-question-form">
              <label>Question<input value={qText} onChange={e => setQText(e.target.value)} placeholder="Enter the question" maxLength={2000} /></label>
              <div className="form-row">
                <label>A<input value={optA} onChange={e => setOptA(e.target.value)} placeholder="Option A" maxLength={500} /></label>
                <label>B<input value={optB} onChange={e => setOptB(e.target.value)} placeholder="Option B" maxLength={500} /></label>
              </div>
              <div className="form-row">
                <label>C<input value={optC} onChange={e => setOptC(e.target.value)} placeholder="Option C" maxLength={500} /></label>
                <label>D<input value={optD} onChange={e => setOptD(e.target.value)} placeholder="Option D" maxLength={500} /></label>
              </div>
              <label>Correct answer
                <select value={correct} onChange={e => setCorrect(e.target.value)}>
                  <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
                </select>
              </label>
              <button className="button button-small" onClick={addQuestion} disabled={!qText.trim() || !optA.trim() || !optB.trim() || !optC.trim() || !optD.trim()}>Save question</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
