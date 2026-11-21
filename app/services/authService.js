import { api } from './api';

const register = (data) => api('POST', '/api/register', data);
const login = (data) => api('POST', '/api/login', data);

export { register, login };
