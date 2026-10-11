import { ArrowUpRight, BookOpen, Heart, Star, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StarDisplay } from './SharedComponents';

export default function CourseCard({ course, enrolled = false, isFavorite = false, onToggleFavorite = null }) {
  const image = course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80';
  const difficultyLabel = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  return (
    <article className="course-card">
      <Link className="course-image-wrap" to={`/courses/${course.id}`}>
        <img className="course-image" src={image} alt="" loading="lazy" />
        <span className="course-chip">{enrolled ? `${course.progress ?? 0}% complete` : (difficultyLabel[course.difficulty] || 'Course')}</span>
        {course.category && <span className="course-category-chip">{course.category}</span>}
      </Link>
      <div className="course-card-body">
        <div className="eyebrow">{course.instructor || 'LearnSpace instructor'}</div>
        <h3><Link to={`/courses/${course.id}`}>{course.title}</Link></h3>
        <p>{course.description}</p>
        {(course.avg_rating > 0) && (
          <div className="course-rating-row">
            <StarDisplay rating={Number(course.avg_rating)} size={13} />
            <span className="rating-text">{Number(course.avg_rating).toFixed(1)} ({course.review_count ?? 0})</span>
          </div>
        )}
        <div className="course-meta">
          <span><BookOpen size={15} />{course.lesson_count ?? 0} lessons</span>
          <span><Users size={15} />{course.student_count ?? 0} learners</span>
        </div>
        {enrolled && <div className="progress-track"><span style={{ width: `${course.progress ?? 0}%` }} /></div>}
        <div className="course-card-actions">
          <Link className="course-action" to={`/courses/${course.id}`}>
            {enrolled ? 'Continue learning' : 'Explore course'} <ArrowUpRight size={17} />
          </Link>
          {onToggleFavorite && (
            <button
              className={`favorite-btn ${isFavorite ? 'active' : ''}`}
              onClick={e => { e.preventDefault(); onToggleFavorite(course); }}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Heart size={16} fill={isFavorite ? '#ef4444' : 'none'} stroke={isFavorite ? '#ef4444' : 'currentColor'} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
