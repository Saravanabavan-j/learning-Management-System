// Shared reusable components for new features
import { Star, StarHalf } from 'lucide-react';

// ── Progress Bar component ──
export function ProgressBar({ completed, total, showLabel = true }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="progress-bar-wrap">
      <div className="progress-track" style={{ height: 8 }}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {showLabel && (
        <div className="progress-bar-label">
          <span>{completed} of {total} lesson{total !== 1 ? 's' : ''} completed</span>
          <strong>{pct}%</strong>
        </div>
      )}
    </div>
  );
}

// ── Star Rating display ──
export function StarDisplay({ rating, size = 15, showNumber = false }) {
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <span className="star-display" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <Star key={i} size={size} fill="#f5a623" stroke="none" />;
        if (i === full && hasHalf) return <StarHalf key={i} size={size} fill="#f5a623" stroke="none" />;
        return <Star key={i} size={size} fill="none" stroke="#d1d5db" />;
      })}
      {showNumber && <span className="star-number">{Number(rating).toFixed(1)}</span>}
    </span>
  );
}

// ── Interactive Star Rating picker ──
export function StarPicker({ value, onChange }) {
  return (
    <span className="star-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
          className={`star-btn ${n <= value ? 'active' : ''}`}
          onClick={() => onChange(n)}
        >
          <Star size={24} fill={n <= value ? '#f5a623' : 'none'} stroke={n <= value ? '#f5a623' : '#d1d5db'} />
        </button>
      ))}
    </span>
  );
}

// ── Assignment status label ──
export function AssignmentStatusBadge({ assignment, serverTime }) {
  const now = serverTime ? new Date(serverTime) : new Date();
  if (assignment.submission_id) {
    const graded = assignment.score !== null && assignment.score !== undefined;
    return <span className={`status-badge ${graded ? 'published' : 'pending-badge'}`}>{graded ? `Graded: ${assignment.score}/${assignment.max_score}` : 'Submitted'}</span>;
  }
  if (!assignment.due_date) return <span className="status-badge draft">No deadline</span>;
  const due = new Date(assignment.due_date);
  const isToday = due.toDateString() === now.toDateString();
  const isOverdue = due < now;
  if (isOverdue) return <span className="status-badge overdue-badge">Overdue</span>;
  if (isToday) return <span className="status-badge due-today-badge">Due today</span>;
  return <span className="status-badge upcoming-badge">Upcoming</span>;
}
