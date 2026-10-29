import axios from 'axios';

// Same-origin '/api' works in dev (Vite proxy) and production (Express serves the app).
const api = axios.create({ baseURL: '/api', withCredentials: true });
export default api;
