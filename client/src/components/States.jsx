import { LoaderCircle, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
export function Loading({ label = 'Loading your learning space…' }) { return <div className="loading-state"><LoaderCircle className="spin" size={28}/><span>{label}</span></div>; }
export function Empty({ title = 'Nothing here yet', detail = 'When there is something to show, it will appear here.' }) { return <div className="empty-state"><span className="empty-icon"><BookOpen size={25}/></span><h3>{title}</h3><p>{detail}</p></div>; }
export function Alert({ children, type = 'error' }) { if (!children) return null; const Icon = type === 'success' ? CheckCircle2 : AlertCircle; return <div className={`alert ${type}`} role="status"><Icon size={18}/><span>{children}</span></div>; }
