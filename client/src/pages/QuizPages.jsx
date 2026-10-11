import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, CheckCircle2, X } from 'lucide-react';
import { DashboardLayout } from '../components/Layout';
import { Alert, Empty, Loading } from '../components/States';
import api, { messageFrom } from '../services/api';

// Student: list all quizzes across enrolled courses
export function StudentQuizzes() {
  const [enrollments, setEnrollments] = useState([]);
  const [quizzesByCourse, setQuizzesByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/enrollments/my').then(async r => {
      setEnrollments(r.data.courses);
      const map = {};
      await Promise.all(r.data.courses.map(async c => {
        const qr = await api.get(`/courses/${c.id}/quizzes`).catch(() => ({ data: { quizzes: [] } }));
        if (qr.data.quizzes.length) map[c.id] = { course: c, quizzes: qr.data.quizzes };
      }));
      setQuizzesByCourse(map);
    }).catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  }, []);

  const hasQuizzes = Object.keys(quizzesByCourse).length > 0;

  return (
    <DashboardLayout>
      <div className="dash-page-title">
        <div className="eyebrow">TEST YOUR KNOWLEDGE</div>
        <h1>Quizzes</h1>
        <p>Practice what you've learned with multiple-choice quizzes.</p>
      </div>
      <Alert>{error}</Alert>
      {loading ? <Loading /> : !hasQuizzes
        ? <Empty title="No quizzes available" detail="Quizzes will appear here when your enrolled courses have published quizzes." />
        : Object.values(quizzesByCourse).map(({ course, quizzes }) => (
            <div key={course.id} className="quiz-course-section">
              <div className="quiz-course-header"><BookOpen size={16} /><strong>{course.title}</strong></div>
              {quizzes.map(q => (
                <div className="quiz-card" key={q.id}>
                  <div className="quiz-card-info">
                    <Brain size={18} className="quiz-icon" />
                    <div>
                      <strong>{q.title}</strong>
                      <small>{q.question_count} question{q.question_count !== 1 ? 's' : ''} · Pass: {q.pass_percent}%</small>
                      {q.instructions && <p className="muted">{q.instructions}</p>}
                    </div>
                  </div>
                  <Link className="button button-small" to={`/quizzes/${q.id}`}>Take quiz <ArrowRight size={15} /></Link>
                </div>))}
            </div>))}
    </DashboardLayout>
  );
}

// Student: take a quiz
export function TakeQuiz() {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [attempts, setAttempts] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAttempts, setShowAttempts] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/quizzes/${quizId}/questions`),
      api.get(`/quizzes/${quizId}/attempts`)
    ]).then(([qr, ar]) => {
      setQuiz(qr.data.quiz);
      setQuestions(qr.data.questions);
      setAttempts(ar.data.attempts);
    }).catch(e => setError(messageFrom(e))).finally(() => setLoading(false));
  }, [quizId]);

  const select = (questionId, option) => setAnswers(a => ({ ...a, [questionId]: option }));

  const submitQuiz = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError('Please answer all questions before submitting.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const payload = Object.entries(answers).map(([question_id, selected_option]) => ({ question_id: Number(question_id), selected_option }));
      const r = await api.post(`/quizzes/${quizId}/submit`, { answers: payload });
      setResult(r.data);
      // refresh attempts
      const ar = await api.get(`/quizzes/${quizId}/attempts`);
      setAttempts(ar.data.attempts);
    } catch (e) { setError(messageFrom(e)); } finally { setSubmitting(false); }
  };

  if (loading) return <DashboardLayout><Loading /></DashboardLayout>;
  if (error && !quiz) return <DashboardLayout><Alert>{error}</Alert><Link to="/quizzes" className="text-link">← Back to quizzes</Link></DashboardLayout>;

  const optionLabels = { a: 'A', b: 'B', c: 'C', d: 'D' };
  const optionKeys = ['a', 'b', 'c', 'd'];

  return (
    <DashboardLayout>
      <div className="dash-page-title">
        <Link to="/quizzes" className="back-link">← All quizzes</Link>
        <div className="eyebrow">QUIZ</div>
        <h1>{quiz?.title}</h1>
        {quiz?.instructions && <p>{quiz.instructions}</p>}
      </div>
      <Alert>{error}</Alert>

      {/* Previous attempts */}
      {attempts.length > 0 && (
        <div className="quiz-attempts-summary" style={{ marginBottom: 24 }}>
          <button className="text-link" onClick={() => setShowAttempts(v => !v)}>
            {showAttempts ? 'Hide' : 'Show'} previous attempts ({attempts.length})
          </button>
          {showAttempts && (
            <div className="attempts-list">
              {attempts.map((a, i) => (
                <div className={`attempt-row ${a.passed ? 'passed' : 'failed'}`} key={a.id}>
                  <span>Attempt {attempts.length - i}</span>
                  <span>{a.score}/{a.total} ({a.percentage}%)</span>
                  <span className={`status-badge ${a.passed ? 'published' : 'overdue-badge'}`}>{a.passed ? 'Passed' : 'Failed'}</span>
                  <span className="muted">{new Date(a.attempted_at).toLocaleDateString()}</span>
                </div>))}
            </div>
          )}
        </div>
      )}

      {/* Result display */}
      {result && (
        <div className={`quiz-result-card ${result.attempt.passed ? 'passed' : 'failed'}`}>
          <div className="quiz-result-header">
            {result.attempt.passed ? <CheckCircle2 size={28} className="result-icon-pass" /> : <X size={28} className="result-icon-fail" />}
            <div>
              <h2>{result.attempt.passed ? '🎉 You passed!' : 'Keep practicing!'}</h2>
              <p>{result.message}</p>
            </div>
          </div>
          <div className="result-stats">
            <div><strong>{result.attempt.score}</strong><small>Correct</small></div>
            <div><strong>{result.attempt.total - result.attempt.score}</strong><small>Incorrect</small></div>
            <div><strong>{result.attempt.percentage}%</strong><small>Score</small></div>
            <div><strong>{result.attempt.pass_percent}%</strong><small>Required</small></div>
          </div>
          <div className="result-review">
            <h3>Answer review</h3>
            {questions.map((q, i) => {
              const ans = result.answers.find(a => a.question_id === q.id);
              if (!ans) return null;
              return (
                <div className={`review-question ${ans.is_correct ? 'correct' : 'wrong'}`} key={q.id}>
                  <p><strong>Q{i + 1}. {q.question_text}</strong></p>
                  <p>Your answer: <em>{optionLabels[ans.selected_option]}. {q[`option_${ans.selected_option}`]}</em>
                    {!ans.is_correct && <> — Correct: <em>{optionLabels[ans.correct_option]}. {q[`option_${ans.correct_option}`]}</em></>}</p>
                </div>);
            })}
          </div>
          <button className="button button-outline button-small" onClick={() => { setResult(null); setAnswers({}); }}>Try again</button>
        </div>
      )}

      {/* Quiz form */}
      {!result && (
        <div className="quiz-form">
          {questions.map((q, i) => (
            <div className="quiz-question-card" key={q.id}>
              <p className="question-text"><strong>Q{i + 1}.</strong> {q.question_text}</p>
              <div className="options-list">
                {optionKeys.map(opt => (
                  <label key={opt} className={`option-label ${answers[q.id] === opt ? 'selected' : ''}`}>
                    <input type="radio" name={`q-${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => select(q.id, opt)} />
                    <span className="option-letter">{optionLabels[opt]}</span>
                    <span>{q[`option_${opt}`]}</span>
                  </label>))}
              </div>
            </div>))}
          <div className="quiz-submit-row">
            <span className="muted">{Object.keys(answers).length}/{questions.length} answered</span>
            <button className="button" onClick={submitQuiz} disabled={submitting || Object.keys(answers).length < questions.length}>
              {submitting ? 'Submitting…' : 'Submit quiz'} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
