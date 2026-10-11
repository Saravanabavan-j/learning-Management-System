import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', withCredentials: true, headers: { 'Content-Type': 'application/json' } });
export function messageFrom(error) { return error?.response?.data?.message || 'Could not complete the request. Check your connection and try again.'; }
export default api;
