import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, Clock3, Code2, Download, Filter, GraduationCap, PlayCircle, Search, ShieldCheck, Sparkles, Star, Users, X } from 'lucide-react';
import api, { messageFrom } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CourseCard from '../components/CourseCard';
import { Alert, Empty, Loading } from '../components/States';
import { ProgressBar, StarDisplay, StarPicker } from '../components/SharedComponents';

export function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/courses').then(r => setCourses(r.data.courses.slice(0, 3))).catch(() => {}).finally(() => setLoading(false)); }, []);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-kicker"><Sparkles size={15} /> YOUR NEXT CHAPTER STARTS HERE</div>
          <h1>Make learning<br />your <span>superpower.</span></h1>
          <p className="hero-description">Build practical skills, learn from structured courses, track your progress — and earn certificates when you complete a course.</p>
          <div className="hero-actions">
            <Link to="/courses" className="button">Explore courses <ArrowRight size={18} /></Link>
            <Link to="/register" className="button button-outline">Create free account</Link>
          </div>
          <div className="hero-social-proof">
            <div className="avatar-stack"><span>A</span><span>M</span><span>J</span><span>+</span></div>
            <div><strong>Learning that moves you forward</strong><small>Learn at your own pace</small></div>
          </div>
        </div>
        <div className="hero-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="hero-card main-learning-card">
            <div className="learning-card-top">
              <span className="card-icon purple"><Code2 size={23} /></span>
              <span className="live-dot">● In progress</span>
            </div>
            <div className="art-label">YOUR LEARNING PATH</div>
            <h3>Frontend Developer</h3>
            <p>Build skills that matter</p>
            <div className="mini-progress-label"><span>Course progress</span><b>68%</b></div>
            <div className="progress-track"><span style={{ width: '68%' }} /></div>
            <div className="mini-lesson">
              <span className="mini-play"><PlayCircle size={17} /></span>
              <div><strong>React fundamentals</strong><small>Lesson 08 · 12 min</small></div>
              <CheckCircle2 className="complete-icon" size={18} />
            </div>
          </div>
          <div className="floating-card floating-streak"><span className="streak-icon">✦</span><div><strong>Keep it up!</strong><small>Every lesson counts</small></div></div>
          <div className="floating-card floating-course"><span className="floating-course-icon"><BookOpen size={18} /></span><div><strong>Learn by doing</strong><small>Practical projects</small></div></div>
        </div>
        <div className="hero-bottom-glow" />
      </section>
      <section className="stats-strip">
        <div><strong>Learn</strong><span>at your own pace</span></div>
        <div><strong>Track</strong><span>your progress</span></div>
        <div><strong>Quiz</strong><span>test your knowledge</span></div>
        <div><strong>Certify</strong><span>earn completion badges</span></div>
      </section>
      <section className="section section-courses">
        <div className="section-heading">
          <div><div className="eyebrow">START EXPLORING</div><h2>Popular learning paths</h2><p>Courses to help you go from curious to confident.</p></div>
          <Link to="/courses" className="text-link">View all courses <ArrowRight size={17} /></Link>
        </div>
        {loading ? <Loading /> : courses.length ? <div className="course-grid">{courses.map(c => <CourseCard key={c.id} course={c} />)}</div> : <Empty title="Courses are on their way" detail="Set up the database and seed the sample courses to get started." />}
      </section>
      <section className="feature-band">
        <div className="feature-intro">
          <div className="eyebrow light">DESIGNED FOR YOUR PROGRESS</div>
          <h2>More than videos.<br />A better way to learn.</h2>
          <p>Keep your learning organized, test yourself with quizzes, and earn certificates when you finish.</p>
          <Link to="/courses" className="button button-light">Find your course <ArrowRight size={18} /></Link>
        </div>
        <div className="feature-list">
          <div className="feature-item"><span><BookOpen /></span><div><h3>Structured lessons</h3><p>Move through topics in a clear, organized order.</p></div></div>
          <div className="feature-item"><span><CheckCircle2 /></span><div><h3>Progress tracking</h3><p>Mark lessons complete and watch your learning add up.</p></div></div>
          <div className="feature-item"><span><Star /></span><div><h3>Quizzes &amp; certificates</h3><p>Test your knowledge and earn a certificate on completion.</p></div></div>
        </div>
      </section>
      <section className="cta-section">
        <div className="cta-icon"><GraduationCap size={27} /></div>
        <h2>Your next skill is one click away.</h2>
        <p>Start learning today. Your future self will thank you.</p>
        <Link to="/register" className="button">Get started for free <ArrowRight size={18} /></Link>
      </section>
    </>
  );
}

// ── Feature 1: Courses with search + category + difficulty filters ──
export function Courses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const { user } = useAuth();

  useEffect(() => {
    api.get('/courses/categories').then(r => setCategories(r.data.categories)).catch(() => {});
    if (user?.role === 'student') {
      api.get('/favorites').then(r => setFavorites(new Set(r.data.favorites.map(f => f.id)))).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() =>
      api.get('/courses', { params: { search, category, difficulty } })
        .then(r => { setCourses(r.data.courses); setError(''); })
        .catch(e => setError(messageFrom(e)))
        .finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [search, category, difficulty]);

  const clearFilters = () => { setSearch(''); setCategory(''); setDifficulty(''); };
  const hasFilters = search || category || difficulty;

  const toggleFavorite = async (course) => {
    if (!user || user.role !== 'student') return;
    try {
      if (favorites.has(course.id)) {
        await api.delete(`/favorites/${course.id}`);
        setFavorites(s => { const n = new Set(s); n.delete(course.id); return n; });
      } else {
        await api.post(`/favorites/${course.id}`);
        setFavorites(s => new Set([...s, course.id]));
      }
    } catch { /* silent */ }
  };

  return (
    <div className="page-container">
      <div className="page-hero">
        <div className="eyebrow">THE COURSE LIBRARY</div>
        <h1>Find your next <span>skill.</span></h1>
        <p>Explore practical courses and learn at a pace that works for you.</p>
        <label className="search-box">
          <Search size={19} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses, skills, topics…" aria-label="Search courses" />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search">×</button>}
        </label>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="filter-group">
          <Filter size={14} />
          <select id="category-filter" value={category} onChange={e => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select id="difficulty-filter" value={difficulty} onChange={e => setDifficulty(e.target.value)} aria-label="Filter by difficulty">
            <option value="">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
        {hasFilters && <button className="clear-filters-btn" onClick={clearFilters}><X size={13} /> Clear filters</button>}
      </div>

      <div className="catalogue-toolbar">
        <span>{loading ? 'Finding courses…' : `${courses.length} course${courses.length === 1 ? '' : 's'} to explore`}</span>
        <span className="catalogue-tag"><Sparkles size={15} /> Learn something new</span>
      </div>
      <Alert>{error}</Alert>
      {loading ? <Loading /> : courses.length
        ? <div className="course-grid">{courses.map(c => <CourseCard key={c.id} course={c} isFavorite={favorites.has(c.id)} onToggleFavorite={user?.role === 'student' ? toggleFavorite : null} />)}</div>
        : <Empty title="No courses found" detail={hasFilters ? 'Try adjusting your filters or clearing them to see all courses.' : 'No courses available yet.'} />}
    </div>
  );
}

// ── Course Detail with progress bar, reviews, and favorites ──
export function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [progress, setProgress] = useState({ percentage: 0, completed: 0, total: 0 });
  const [certBusy, setCertBusy] = useState(false);
  // Reviews
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState('');
  const [myReview, setMyReview] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  const loadReviews = async () => {
    const r = await api.get(`/courses/${id}/reviews`);
    setReviews(r.data.reviews);
    setAvgRating(r.data.avg_rating);
    setReviewCount(r.data.review_count);
    const mine = r.data.reviews.find(rv => rv.is_mine);
    if (mine) { setMyReview(mine); setMyRating(mine.rating); setMyReviewText(mine.review_text || ''); }
  };

  const load = () => Promise.all([
    api.get(`/courses/${id}`),
    user?.role === 'student' ? api.get('/enrollments/my') : Promise.resolve({ data: { courses: [] } })
  ]).then(async ([c, e]) => {
    setCourse(c.data.course);
    const isEnrolled = e.data.courses.some(x => String(x.id) === String(id));
    setEnrolled(isEnrolled);
    if (isEnrolled) {
      const ec = e.data.courses.find(x => String(x.id) === String(id));
      setProgress({ percentage: ec.progress ?? 0, completed: ec.completed_count ?? 0, total: ec.lesson_count ?? 0 });
    }
    await loadReviews();
  }).catch(e => setError(messageFrom(e))).finally(() => setLoading(false));

  useEffect(() => { setLoading(true); load(); }, [id, user]);

  useEffect(() => {
    if (user && course && (enrolled || user.role === 'admin'))
      api.get(`/courses/${id}/assignments`).then(r => setAssignments(r.data.assignments)).catch(() => {});
    if (user?.role === 'student' && course)
      api.get(`/favorites/check/${id}`).then(r => setIsFavorite(r.data.isFavorite)).catch(() => {});
  }, [id, user, course, enrolled]);

  const enroll = async () => {
    setBusy(true); setError('');
    try { await api.post(`/courses/${id}/enroll`); setEnrolled(true); setSuccess('You are enrolled! Your lessons are now ready.'); await load(); }
    catch (e) { setError(messageFrom(e)); } finally { setBusy(false); }
  };

  const toggleFavorite = async () => {
    try {
      if (isFavorite) { await api.delete(`/favorites/${id}`); setIsFavorite(false); }
      else { await api.post(`/favorites/${id}`); setIsFavorite(true); }
    } catch (e) { setError(messageFrom(e)); }
  };

  const downloadCert = async () => {
    setCertBusy(true);
    try {
      const r = await api.get(`/courses/${id}/certificate`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = `certificate-${id}.pdf`; a.click(); URL.revokeObjectURL(url);
    } catch (e) {
      const text = e.response?.data instanceof Blob ? await e.response.data.text() : null;
      setError(text ? JSON.parse(text).message : messageFrom(e));
    } finally { setCertBusy(false); }
  };

  const submitReview = async e => {
    e.preventDefault(); setReviewBusy(true); setReviewNotice('');
    try {
      if (myReview) await api.put(`/courses/${id}/reviews`, { rating: myRating, review_text: myReviewText });
      else await api.post(`/courses/${id}/reviews`, { rating: myRating, review_text: myReviewText });
      setReviewNotice('Review saved!'); await loadReviews();
    } catch (err) { setError(messageFrom(err)); } finally { setReviewBusy(false); }
  };

  const deleteReview = async () => {
    if (!window.confirm('Delete your review?')) return;
    try { await api.delete(`/courses/${id}/reviews`); setMyReview(null); setMyRating(0); setMyReviewText(''); await loadReviews(); }
    catch (err) { setError(messageFrom(err)); }
  };

  if (loading) return <Loading />;
  if (!course) return <div className="page-container"><Alert>{error || 'Course not found.'}</Alert><Link to="/courses" className="text-link">Back to courses</Link></div>;

  const difficultyLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  return (
    <div className="page-container detail-page">
      <Link to="/courses" className="back-link">← All courses</Link>
      <div className="course-detail-hero">
        <div className="detail-copy">
          <div className="eyebrow">LEARNSPACE COURSE</div>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="detail-stats">
            <span><BookOpen size={17} />{course.lesson_count} lessons</span>
            <span><Users size={17} />{course.instructor}</span>
            <span><Clock3 size={17} />Self-paced</span>
            {course.difficulty && <span className={`diff-chip diff-${course.difficulty}`}>{difficultyLabel[course.difficulty]}</span>}
            {course.avg_rating > 0 && <span><StarDisplay rating={Number(course.avg_rating)} size={15} showNumber />&nbsp;({course.review_count})</span>}
          </div>
          {enrolled && (
            <div className="detail-progress-wrap">
              <ProgressBar completed={progress.completed} total={progress.total} />
            </div>
          )}
          {user?.role === 'student' && (
            <div className="detail-cta">
              {enrolled
                ? <><Link className="button" to={`/learn/${id}`}>Continue learning <ArrowRight size={17} /></Link>
                    {progress.percentage === 100 && <button className="button button-outline cert-btn" onClick={downloadCert} disabled={certBusy}><Download size={16} /> {certBusy ? 'Generating…' : 'Download certificate'}</button>}</>
                : <button className="button" onClick={enroll} disabled={busy}>{busy ? 'Enrolling…' : 'Enroll for free'} <ArrowRight size={17} /></button>}
              <button className={`icon-button favorite-icon-btn ${isFavorite ? 'fav-active' : ''}`} onClick={toggleFavorite} aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'} title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                ♥ {isFavorite ? 'Saved' : 'Save'}
              </button>
            </div>
          )}
          {!user && <div className="detail-cta"><Link className="button" to="/login">Log in to enroll <ArrowRight size={17} /></Link></div>}
          <Alert type="success">{success}</Alert>
          <Alert>{error}</Alert>
        </div>
        <img className="detail-image" src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80'} alt="" />
      </div>

      <div className="detail-columns">
        <section className="detail-main">
          <div className="eyebrow">WHAT YOU'LL LEARN</div>
          <h2>A clear path from lesson one.</h2>
          <p className="muted">Work through the lessons, practice with assignments, and track your progress as you learn.</p>
          {enrolled || user?.role === 'admin'
            ? <div className="lesson-list">{(course.lessons || []).map((l, i) => (
                <div className="lesson-row" key={l.id}>
                  <span className="lesson-number">{String(i + 1).padStart(2, '0')}</span>
                  <div><strong>{l.title}</strong><small>{l.content?.slice(0, 95) || 'Course lesson'}{l.content?.length > 95 ? '…' : ''}</small></div>
                  <PlayCircle size={19} />
                </div>))}
              </div>
            : <div className="locked-lessons"><ShieldCheck size={22} /><div><strong>Lessons included</strong><p>Enroll in this course to unlock lesson content and progress tracking.</p></div></div>}

          {/* Reviews Section */}
          <div className="reviews-section">
            <h2>Student reviews</h2>
            <div className="reviews-summary">
              <div className="avg-rating-display">
                <span className="avg-rating-number">{Number(avgRating).toFixed(1)}</span>
                <StarDisplay rating={Number(avgRating)} size={20} />
                <span className="review-count-text">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {user?.role === 'student' && enrolled && (
              <div className="review-form-card">
                <h3>{myReview ? 'Update your review' : 'Leave a review'}</h3>
                <Alert type="success">{reviewNotice}</Alert>
                <form onSubmit={submitReview} className="form-stack">
                  <label>Your rating
                    <StarPicker value={myRating} onChange={setMyRating} />
                  </label>
                  <label>Review (optional)
                    <textarea rows={3} value={myReviewText} onChange={e => setMyReviewText(e.target.value)} placeholder="Share what you thought about this course…" maxLength={3000} />
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="button button-small" disabled={reviewBusy || myRating === 0}>{reviewBusy ? 'Saving…' : myReview ? 'Update review' : 'Submit review'}</button>
                    {myReview && <button type="button" className="button button-outline button-small" onClick={deleteReview}>Delete review</button>}
                  </div>
                </form>
              </div>
            )}

            {reviews.length > 0
              ? <div className="review-list">{reviews.map(r => (
                  <div className="review-card" key={r.id}>
                    <div className="review-header">
                      <div className="reviewer-avatar">{r.student_name?.[0]?.toUpperCase()}</div>
                      <div>
                        <strong>{r.student_name}</strong>
                        <div className="review-meta"><StarDisplay rating={r.rating} size={13} /><small>{new Date(r.updated_at || r.created_at).toLocaleDateString()}</small></div>
                      </div>
                    </div>
                    {r.review_text && <p className="review-text">{r.review_text}</p>}
                  </div>))}
                </div>
              : <p className="muted">No reviews yet. Be the first to leave one!</p>}
          </div>
        </section>

        <aside className="detail-aside">
          <div className="aside-card">
            <span className="aside-icon"><GraduationCap size={22} /></span>
            <h3>Course at a glance</h3>
            <div className="aside-line"><span>Instructor</span><strong>{course.instructor}</strong></div>
            <div className="aside-line"><span>Lessons</span><strong>{course.lesson_count}</strong></div>
            {course.category && <div className="aside-line"><span>Category</span><strong>{course.category}</strong></div>}
            {course.difficulty && <div className="aside-line"><span>Level</span><strong>{difficultyLabel[course.difficulty]}</strong></div>}
            <div className="aside-line"><span>Access</span><strong>Self-paced</strong></div>
            <div className="aside-line"><span>Certificate</span><strong>{enrolled && progress.percentage === 100 ? '✓ Available' : 'On completion'}</strong></div>
          </div>
          {(enrolled || user?.role === 'admin') && (
            <div className="aside-card">
              <h3>Assignments</h3>
              {assignments.length
                ? assignments.map(a => (
                    <div className="assignment-mini" key={a.id}>
                      <strong>{a.title}</strong>
                      <small>{a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : 'No due date'}</small>
                      {a.score !== null && a.score !== undefined && <span className="grade-badge">Score: {a.score}/{a.max_score}</span>}
                    </div>))
                : <p className="muted small">No assignments yet.</p>}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function AuthPage({ mode }) {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (user) navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true }); }, [user, navigate]);
  const submit = async e => {
    e.preventDefault(); setError(''); setBusy(true);
    try { if (mode === 'register') await register({ name, email, password }); else await login({ email, password }); navigate('/dashboard'); }
    catch (e) { setError(messageFrom(e)); } finally { setBusy(false); }
  };
  return (
    <div className="auth-page">
      <div className="auth-side">
        <Link to="/" className="brand brand-light"><span className="brand-icon"><GraduationCap size={22} /></span><span>learn<span className="brand-accent">space</span></span></Link>
        <div className="auth-side-copy">
          <div className="eyebrow light">LEARN SOMETHING THAT LASTS</div>
          <h1>Small steps.<br /><span>Big possibilities.</span></h1>
          <p>Build your skills, celebrate your progress, and make your next move with confidence.</p>
          <div className="auth-benefit"><CheckCircle2 /> Learn at your own pace</div>
          <div className="auth-benefit"><CheckCircle2 /> Earn completion certificates</div>
        </div>
        <div className="auth-side-foot">Your learning journey starts here.</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <Link to="/" className="mobile-auth-brand brand"><span className="brand-icon"><GraduationCap size={22} /></span><span>learn<span className="brand-accent">space</span></span></Link>
          <div className="auth-heading">
            <div className="eyebrow">{mode === 'register' ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</div>
            <h2>{mode === 'register' ? 'Start learning today.' : 'Good to see you again.'}</h2>
            <p>{mode === 'register' ? 'Create your free student account in a few steps.' : 'Log in to pick up where you left off.'}</p>
          </div>
          <Alert>{error}</Alert>
          <form className="form-stack" onSubmit={submit}>
            {mode === 'register' && <label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" required maxLength={100} /></label>}
            <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required maxLength={254} /></label>
            <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : 1} required /></label>
            {mode === 'register' && <p className="form-hint">Use at least 8 characters. Your password is securely hashed.</p>}
            <button className="button auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Log in'} <ArrowRight size={18} /></button>
          </form>
          <p className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'New to LearnSpace?'} <Link to={mode === 'register' ? '/login' : '/register'}>{mode === 'register' ? 'Log in' : 'Create an account'}</Link></p>
          <p className="auth-privacy"><ShieldCheck size={15} /> Your account is protected by secure authentication.</p>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="not-found">
      <div className="not-found-number">404</div>
      <h1>This page took a detour.</h1>
      <p>The page you're looking for doesn't exist or may have moved.</p>
      <Link to="/" className="button">Back to home <ArrowRight size={18} /></Link>
    </div>
  );
}
