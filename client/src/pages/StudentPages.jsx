import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlarmClock, ArrowRight, Bookmark, BookOpen, CheckCircle2, Clock3, Download, GraduationCap, Target, UserRound } from 'lucide-react';
import { DashboardLayout } from '../components/Layout';
import CourseCard from '../components/CourseCard';
import { Alert, Empty, Loading } from '../components/States';
import { ProgressBar, AssignmentStatusBadge } from '../components/SharedComponents';
import { useAuth } from '../context/AuthContext';
import api, { messageFrom } from '../services/api';

// ── Feature 3: Assignment Due-Date Reminders panel ──
function AssignmentReminders() {
  const [assignments, setAssignments] = useState([]);
  const [serverTime, setServerTime] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assignments/reminders')
      .then(r => { setAssignments(r.data.assignments); setServerTime(r.data.serverTime); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = serverTime ? new Date(serverTime) : new Date();

  const categorize = (a) => {
    if (a.submission_id) return 'submitted';
    if (!a.due_date) return 'upcoming';
    const due = new Date(a.due_date);
    if (due < now) return 'overdue';
    const dueToday = due.toDateString() === now.toDateString();
    if (dueToday) return 'today';
    return 'upcoming';
  };

  const overdue = assignments.filter(a => categorize(a) === 'overdue');
  const today = assignments.filter(a => categorize(a) === 'today');
  const upcoming = assignments.filter(a => categorize(a) === 'upcoming');
  const submitted = assignments.filter(a => categorize(a) === 'submitted');

  if (loading) return <Loading />;
  if (!assignments.length) return (
    <div className="reminders-empty">
      <AlarmClock size={22} />
      <p>No assignments to track. Enroll in a course to get started.</p>
    </div>
  );

  const Section = ({ title, items, cls }) => items.length === 0 ? null : (
    <div className={`reminder-section ${cls}`}>
      <div className="reminder-section-title">{title} <span className="reminder-count">{items.length}</span></div>
      {items.map(a => (
        <div className="reminder-item" key={a.id}>
          <div className="reminder-item-main">
            <strong>{a.title}</strong>
            <small>{a.course_title}</small>
          </div>
          <div className="reminder-item-right">
            <AssignmentStatusBadge assignment={a} serverTime={serverTime} />
            {a.due_date && <span className="reminder-due">{new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="reminders-panel">
      <Section title="Overdue" items={overdue} cls="overdue" />
      <Section title="Due today" items={today} cls="today" />
      <Section title="Upcoming" items={upcoming} cls="upcoming" />
      <Section title="Submitted" items={submitted} cls="submitted" />
    </div>
  );
}

// ── Student Dashboard ──
export function StudentDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    Promise.all([
      api.get('/enrollments/my'),
      api.get('/favorites')
    ]).then(([ec, fv]) => {
      setCourses(ec.data.courses);
      setFavorites(new Set(fv.data.favorites.map(f => f.id)));
    }).catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  }, []);

  const toggleFavorite = async (course) => {
    try {
      if (favorites.has(course.id)) { await api.delete(`/favorites/${course.id}`); setFavorites(s => { const n = new Set(s); n.delete(course.id); return n; }); }
      else { await api.post(`/favorites/${course.id}`); setFavorites(s => new Set([...s, course.id])); }
    } catch { /* silent */ }
  };

  const completed = courses.filter(c => c.progress === 100).length;
  const lessons = courses.reduce((n, c) => n + Number(c.completed_count || 0), 0);

  return (
    <DashboardLayout>
      <div className="dash-welcome">
        <div>
          <div className="eyebrow">YOUR LEARNING SPACE</div>
          <h1>Welcome back, {user?.name?.split(' ')[0] || 'learner'} <span className="wave">✦</span></h1>
          <p>Every lesson is progress. Ready for the next one?</p>
        </div>
        <Link className="button" to="/courses">Explore courses <ArrowRight size={17} /></Link>
      </div>
      <Alert>{error}</Alert>
      <div className="metric-grid">
        <div className="metric-card"><span className="metric-icon metric-purple"><BookOpen /></span><div><small>Enrolled courses</small><strong>{loading ? '—' : courses.length}</strong></div></div>
        <div className="metric-card"><span className="metric-icon metric-green"><CheckCircle2 /></span><div><small>Completed courses</small><strong>{loading ? '—' : completed}</strong></div></div>
        <div className="metric-card"><span className="metric-icon metric-orange"><Target /></span><div><small>Lessons completed</small><strong>{loading ? '—' : lessons}</strong></div></div>
      </div>

      <div className="dash-section-heading">
        <div><h2>Pick up where you left off</h2><p>Your enrolled courses and learning progress.</p></div>
        <Link className="text-link" to="/my-courses">View all <ArrowRight size={16} /></Link>
      </div>
      {loading ? <Loading /> : courses.length
        ? <div className="course-grid">{courses.slice(0, 3).map(c => <CourseCard key={c.id} course={c} enrolled isFavorite={favorites.has(c.id)} onToggleFavorite={toggleFavorite} />)}</div>
        : <div className="welcome-empty"><span className="welcome-empty-icon"><GraduationCap size={30} /></span><h3>Your learning journey starts here.</h3><p>Browse the course library and enroll in your first course.</p><Link className="button" to="/courses">Explore courses <ArrowRight size={17} /></Link></div>}

      {/* Feature 3: Reminders panel */}
      <div className="dash-section-heading" style={{ marginTop: 40 }}>
        <div><h2>Assignment tracker</h2><p>Stay on top of upcoming and overdue work.</p></div>
        <AlarmClock size={18} color="var(--purple)" />
      </div>
      <AssignmentReminders />
    </DashboardLayout>
  );
}

export function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    Promise.all([api.get('/enrollments/my'), api.get('/favorites')])
      .then(([ec, fv]) => { setCourses(ec.data.courses); setFavorites(new Set(fv.data.favorites.map(f => f.id))); })
      .catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  }, []);

  const toggleFavorite = async (course) => {
    try {
      if (favorites.has(course.id)) { await api.delete(`/favorites/${course.id}`); setFavorites(s => { const n = new Set(s); n.delete(course.id); return n; }); }
      else { await api.post(`/favorites/${course.id}`); setFavorites(s => new Set([...s, course.id])); }
    } catch { /* silent */ }
  };

  return (
    <DashboardLayout>
      <div className="dash-page-title">
        <div className="eyebrow">YOUR LIBRARY</div>
        <h1>My courses</h1>
        <p>Keep learning, one lesson at a time.</p>
      </div>
      <Alert>{error}</Alert>
      {loading ? <Loading /> : courses.length
        ? <div className="course-grid">{courses.map(c => (
            <div key={c.id}>
              <CourseCard course={c} enrolled isFavorite={favorites.has(c.id)} onToggleFavorite={toggleFavorite} />
              <div style={{ padding: '0 4px 10px' }}>
                <ProgressBar completed={c.completed_count ?? 0} total={c.lesson_count ?? 0} />
              </div>
            </div>))}
          </div>
        : <Empty title="Your library is waiting" detail="Enroll in a course to see your learning progress here." />}
    </DashboardLayout>
  );
}

// ── Feature 2: Learning page with progress bar + Feature 3: assignment status ──
export function LearningPage() {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [subText, setSubText] = useState({});
  const [subUrl, setSubUrl] = useState({});
  const [notice, setNotice] = useState('');
  const [certBusy, setCertBusy] = useState(false);
  const [serverTime] = useState(new Date().toISOString());

  const load = async () => {
    try {
      const r = await api.get('/enrollments/my');
      setCourses(r.data.courses);
      if (r.data.courses.length) {
        const c = r.data.courses.find(x => String(x.id) === String(courseId)) || selected || r.data.courses[0];
        setSelected(c);
        const [l, p, a] = await Promise.all([
          api.get(`/courses/${c.id}/lessons`),
          api.get(`/courses/${c.id}/progress`),
          api.get(`/courses/${c.id}/assignments`)
        ]);
        setLessons(l.data.lessons);
        setProgress(p.data.progress);
        setAssignments(a.data.assignments);
      }
    } catch (e) { setError(messageFrom(e)); }
  };

  useEffect(() => { load(); }, [courseId]);

  const choose = async c => {
    setSelected(c); setNotice(''); setError('');
    try {
      const [l, p, a] = await Promise.all([api.get(`/courses/${c.id}/lessons`), api.get(`/courses/${c.id}/progress`), api.get(`/courses/${c.id}/assignments`)]);
      setLessons(l.data.lessons); setProgress(p.data.progress); setAssignments(a.data.assignments);
    } catch (e) { setError(messageFrom(e)); }
  };

  const toggle = async lesson => {
    setBusy(true);
    try {
      const current = progress.find(p => p.lesson_id === lesson.id);
      await api.put(`/lessons/${lesson.id}/progress`, { completed: !current?.completed });
      const r = await api.get(`/courses/${selected.id}/progress`);
      setProgress(r.data.progress);
      setNotice('Progress saved. Keep going!');
    } catch (e) { setError(messageFrom(e)); } finally { setBusy(false); }
  };

  const submit = async a => {
    setError(''); setNotice('');
    try {
      await api.post(`/assignments/${a.id}/submissions`, { submission_text: subText[a.id] || '', submission_url: subUrl[a.id] || '' });
      setNotice(`Submitted "${a.title}" successfully.`);
      const r = await api.get(`/courses/${selected.id}/assignments`);
      setAssignments(r.data.assignments);
    } catch (e) { setError(messageFrom(e)); }
  };

  const downloadCert = async () => {
    setCertBusy(true);
    try {
      const r = await api.get(`/courses/${selected.id}/certificate`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = `certificate-${selected.id}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      const text = e.response?.data instanceof Blob ? await e.response.data.text() : null;
      setError(text ? JSON.parse(text).message : messageFrom(e));
    } finally { setCertBusy(false); }
  };

  const done = progress.filter(p => p.completed).length;
  const total = progress.length;
  const pct = total > 0 ? Math.round(done * 100 / total) : 0;

  return (
    <DashboardLayout>
      <div className="dash-page-title">
        <div className="eyebrow">LEARNING ROOM</div>
        <h1>Keep your momentum.</h1>
        <p>Open a lesson, mark it complete, and keep moving forward.</p>
      </div>
      <Alert>{error}</Alert>
      <Alert type="success">{notice}</Alert>
      {!courses.length
        ? <Empty title="No courses to learn yet" detail="Enroll in a course from the course catalogue first." />
        : <div className="learning-layout">
            <aside className="learning-course-list">
              <h3>My learning</h3>
              {courses.map(c => (
                <button className={`learning-course-option ${selected?.id === c.id ? 'selected' : ''}`} key={c.id} onClick={() => choose(c)}>
                  <span className="learning-option-icon"><BookOpen size={17} /></span>
                  <span><strong>{c.title}</strong><small>{c.progress || 0}% complete</small></span>
                </button>))}
            </aside>
            <div className="learning-main">
              <div className="learning-title-row">
                <div><div className="eyebrow">COURSE CONTENT</div><h2>{selected?.title}</h2></div>
                <div className="completion-number">{pct}%<small>complete</small></div>
              </div>
              {/* Feature 2: progress bar */}
              <div style={{ marginBottom: 8 }}>
                <ProgressBar completed={done} total={total} />
              </div>
              {pct === 100 && (
                <div className="cert-available-banner">
                  <GraduationCap size={20} /> You've completed this course!
                  <button className="button button-small" onClick={downloadCert} disabled={certBusy}><Download size={15} /> {certBusy ? 'Generating…' : 'Download Certificate'}</button>
                </div>
              )}
              <div className="lesson-learning-list">
                {lessons.map((l, i) => {
                  const p = progress.find(x => x.lesson_id === l.id);
                  return (
                    <article className={`learning-lesson ${p?.completed ? 'is-complete' : ''}`} key={l.id}>
                      <div className="lesson-leading">{p?.completed ? <CheckCircle2 size={21} /> : <span>{String(i + 1).padStart(2, '0')}</span>}</div>
                      <div className="lesson-learning-copy">
                        <h3>{l.title}</h3>
                        <p>{l.content}</p>
                        {l.video_url && <a href={l.video_url} target="_blank" rel="noreferrer">Open lesson video ↗</a>}
                      </div>
                      <button className={p?.completed ? 'button button-outline button-tiny' : 'button button-tiny'} disabled={busy} onClick={() => toggle(l)}>
                        {p?.completed ? 'Completed' : 'Mark complete'}
                      </button>
                    </article>);
                })}
              </div>

              {/* Feature 3: Assignment status in learning room */}
              <section className="assignment-section">
                <div className="eyebrow">PRACTICE WHAT YOU LEARN</div>
                <h2>Assignments</h2>
                {assignments.length
                  ? assignments.map(a => (
                      <div className="assignment-card" key={a.id}>
                        <div className="assignment-card-head">
                          <div>
                            <h3>{a.title}</h3>
                            <p>{a.instructions}</p>
                          </div>
                          <span className="points-badge">{a.max_score} pts</span>
                        </div>
                        <div className="assignment-due">
                          <AssignmentStatusBadge assignment={a} serverTime={serverTime} />
                          {a.due_date && <span style={{ marginLeft: 8 }}>Due {new Date(a.due_date).toLocaleString()}</span>}
                          {a.score !== null && a.score !== undefined && <span className="grade-badge" style={{ marginLeft: 8 }}>Grade: {a.score}/{a.max_score}</span>}
                        </div>
                        {a.feedback && <p className="feedback-note"><strong>Instructor feedback:</strong> {a.feedback}</p>}
                        {!a.submission_id && (
                          <>
                            <label>Submission text<textarea rows="3" placeholder="Write your answer or paste your solution…" value={subText[a.id] || ''} onChange={e => setSubText(s => ({ ...s, [a.id]: e.target.value }))} /></label>
                            <label>Or link to your work<input placeholder="https://github.com/your-project" value={subUrl[a.id] || ''} onChange={e => setSubUrl(s => ({ ...s, [a.id]: e.target.value }))} /></label>
                            <button className="button button-small" onClick={() => submit(a)}>Submit assignment <ArrowRight size={16} /></button>
                          </>
                        )}
                        {a.submission_id && !a.score && <p className="muted small" style={{ marginTop: 8 }}>✓ Submitted — awaiting grading</p>}
                      </div>))
                  : <p className="muted">No assignments for this course yet.</p>}
              </section>
            </div>
          </div>}
    </DashboardLayout>
  );
}

// ── Feature 4: Favorites page ──
export function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favSet, setFavSet] = useState(new Set());

  useEffect(() => {
    api.get('/favorites').then(r => { setFavorites(r.data.favorites); setFavSet(new Set(r.data.favorites.map(f => f.id))); })
      .catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  }, []);

  const remove = async (course) => {
    try {
      await api.delete(`/favorites/${course.id}`);
      setFavorites(f => f.filter(x => x.id !== course.id));
      setFavSet(s => { const n = new Set(s); n.delete(course.id); return n; });
    } catch (e) { setError(messageFrom(e)); }
  };

  return (
    <DashboardLayout>
      <div className="dash-page-title">
        <div className="eyebrow">SAVED COURSES</div>
        <h1>My favorites</h1>
        <p>Courses you've bookmarked for later.</p>
      </div>
      <Alert>{error}</Alert>
      {loading ? <Loading /> : favorites.length
        ? <div className="course-grid">{favorites.map(c => <CourseCard key={c.id} course={c} isFavorite={favSet.has(c.id)} onToggleFavorite={remove} />)}</div>
        : <Empty title="No favorites yet" detail="Browse courses and click the heart icon to save a course here." />}
    </DashboardLayout>
  );
}

export function Profile() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => setName(user?.name || ''), [user]);
  const save = async e => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { await api.put('/users/me', { name }); await refresh(); setNotice('Your profile has been updated.'); }
    catch (e) { setError(messageFrom(e)); } finally { setBusy(false); }
  };
  return (
    <DashboardLayout>
      <div className="dash-page-title">
        <div className="eyebrow">ACCOUNT SETTINGS</div>
        <h1>Your profile</h1>
        <p>Manage the details associated with your LearnSpace account.</p>
      </div>
      <div className="profile-card">
        <div className="profile-banner">
          <div className="profile-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div><h2>{user?.name}</h2><p>{user?.email}</p></div>
        </div>
        <div className="profile-form-wrap">
          <Alert>{error}</Alert>
          <Alert type="success">{notice}</Alert>
          <form className="form-stack" onSubmit={save}>
            <label>Full name<input value={name} onChange={e => setName(e.target.value)} maxLength={100} required /></label>
            <label>Email address<input value={user?.email || ''} disabled /><span className="form-hint">Email address cannot be changed from this page.</span></label>
            <label>Account role<input value={user?.role === 'admin' ? 'Administrator' : 'Student'} disabled /></label>
            <button className="button" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
