import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout, { DashboardLayout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { Home, Courses, CourseDetail, AuthPage, NotFound } from './pages/PublicPages';
import { StudentDashboard, MyCourses, LearningPage, FavoritesPage, Profile } from './pages/StudentPages';
import { AdminDashboard, AdminCourses, AdminCourseForm, AdminStudents, AdminQuizzes } from './pages/AdminPages';
import { StudentQuizzes, TakeQuiz } from './pages/QuizPages';
import { Loading } from './components/States';

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  return children;
}

function PublicLayout({ children }) { return <Layout>{children}</Layout>; }

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/courses" element={<PublicLayout><Courses /></PublicLayout>} />
        <Route path="/courses/:id" element={<PublicLayout><CourseDetail /></PublicLayout>} />
        <Route path="/login" element={<PublicLayout><AuthPage mode="login" /></PublicLayout>} />
        <Route path="/register" element={<PublicLayout><AuthPage mode="register" /></PublicLayout>} />

        {/* Student routes */}
        <Route path="/dashboard" element={<Protected role="student"><StudentDashboard /></Protected>} />
        <Route path="/my-courses" element={<Protected role="student"><MyCourses /></Protected>} />
        <Route path="/learn/:id" element={<Protected role="student"><LearningPage /></Protected>} />
        <Route path="/favorites" element={<Protected role="student"><FavoritesPage /></Protected>} />
        <Route path="/quizzes" element={<Protected role="student"><StudentQuizzes /></Protected>} />
        <Route path="/quizzes/:id" element={<Protected role="student"><TakeQuiz /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />

        {/* Admin routes */}
        <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
        <Route path="/admin/courses" element={<Protected role="admin"><AdminCourses /></Protected>} />
        <Route path="/admin/courses/new" element={<Protected role="admin"><AdminCourseForm /></Protected>} />
        <Route path="/admin/courses/:id" element={<Protected role="admin"><AdminCourseForm /></Protected>} />
        <Route path="/admin/students" element={<Protected role="admin"><AdminStudents /></Protected>} />
        <Route path="/admin/quizzes" element={<Protected role="admin"><AdminQuizzes /></Protected>} />

        {/* 404 */}
        <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
