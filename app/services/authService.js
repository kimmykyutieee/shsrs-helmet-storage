import { api } from './api';

const register = (data) => api('POST', '/api/register', data);
const login = (data) => api('POST', '/api/login', data);
const requestPasswordReset = (email) => api('POST', '/api/password-reset-requests', { email });
const completePasswordReset = (email, code, next) => api('PUT', '/api/password-reset-requests/password', { email, code, next });

export { register, login, requestPasswordReset, completePasswordReset };
