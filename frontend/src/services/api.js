// Cliente HTTP central. Em produção, VITE_API_URL aponta para o backend compartilhado.
import axios from 'axios';
import { getToken } from './auth';

const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
