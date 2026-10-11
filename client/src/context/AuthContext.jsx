import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { try { const { data } = await api.get('/auth/me'); setUser(data.user); } catch { setUser(null); } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const login = async (credentials) => { const { data } = await api.post('/auth/login', credentials); setUser(data.user); return data; };
  const register = async (values) => { const { data } = await api.post('/auth/register', values); setUser(data.user); return data; };
  const logout = async () => { try { await api.post('/auth/logout'); } finally { setUser(null); } };
  return <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthContext.Provider>;
}
export function useAuth() { return useContext(AuthContext); }
