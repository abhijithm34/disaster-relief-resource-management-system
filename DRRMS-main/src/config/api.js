export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const apiFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});

  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    if (window.location.pathname !== '/') window.location.assign('/');
  }
  return response;
};

export const logout = async () => {
  try {
    await apiFetch(`${API_URL}/logout`, { method: 'POST' });
  } finally {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }
};
