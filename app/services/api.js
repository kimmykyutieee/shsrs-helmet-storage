import { API_URL } from '../shared/constants/config';

let TOKEN = null;

const setToken = (token) => { TOKEN = token; };
const getToken = () => TOKEN;
const api = async (method, path, body, isFormData = false) => {
  let r;
  try {
    const headers = { ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) };
    const requestBody = isFormData ? body : body ? JSON.stringify(body) : undefined;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    r = await fetch(API_URL + path, {
      method,
      headers,
      body: requestBody,
    });
  } catch (_e) { throw new Error('Cannot reach the server at ' + API_URL); }
  let j = {};
  try { j = await r.json(); } catch (_e) {}
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
};

export { api, getToken, setToken };
