import { Link, NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Bookmark, GraduationCap, LayoutDashboard, LogOut, Menu, UserRound, X, Brain, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const signOut = async () => { await logout(); navigate('/'); };
  const links = [
    { to: '/', label: 'Home' },
    { to: '/courses', label: 'Explore courses' },
    ...(user ? [{ to: user.role === 'admin' ? '/admin' : '/dashboard', label: 'Dashboard' }, { to: '/profile', label: 'Profile' }] : [])
  ];
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/"><span className="brand-icon"><GraduationCap size={22} /></span><span>learn<span className="brand-accent">space</span></span></Link>
        <button className="mobile-menu" aria-label="Toggle navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {links.map(l => <NavLink key={l.to} to={l.to} onClick={() => setMenuOpen(false)}>{l.label}</NavLink>)}
          {user ? <button className="nav-logout" onClick={signOut}><LogOut size={16} /> Log out</button> : <><Link className="nav-login" to="/login">Log in</Link><Link className="button button-small" to="/register">Get started</Link></>}
        </nav>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="footer-brand"><GraduationCap size={20} /> LearnSpace</div>
        <span>Small steps. Big skills.</span>
        <span>© {new Date().getFullYear()} LearnSpace LMS</span>
      </footer>
    </div>
  );
}

export function DashboardLayout({ children, admin = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const studentItems = [
    { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { to: '/my-courses', label: 'My courses', icon: BookOpen },
    { to: '/favorites', label: 'Favorites', icon: Bookmark },
    { to: '/quizzes', label: 'Quizzes', icon: Brain },
    { to: '/profile', label: 'My profile', icon: UserRound }
  ];
  const adminItems = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/courses', label: 'Manage courses', icon: BookOpen },
    { to: '/admin/quizzes', label: 'Quizzes', icon: Brain },
    { to: '/admin/students', label: 'Students', icon: UserRound }
  ];
  const items = admin ? adminItems : studentItems;
  return (
    <div className="dashboard-wrap">
      <aside className="sidebar">
        <div className="sidebar-label">WORKSPACE</div>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink end key={to} to={to} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} />{label}
          </NavLink>
        ))}
        <div className="sidebar-bottom">
          <div className="avatar">{user?.name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="user-mini">
            <strong>{user?.name}</strong>
            <small>{admin ? 'Administrator' : 'Student'}</small>
          </div>
          <button title="Log out" className="icon-button" onClick={async () => { await logout(); navigate('/'); }}><LogOut size={17} /></button>
        </div>
      </aside>
      <section className="dashboard-content">{children}</section>
    </div>
  );
}
