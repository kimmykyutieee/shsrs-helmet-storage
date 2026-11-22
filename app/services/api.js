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
  } catch (error) {
    const errorDetails = {};
    if (error && typeof error === 'object') {
      ['name', 'message', 'stack', 'code', 'errno', 'syscall', 'address', 'port', 'domain', 'nativeStackAndroid'].forEach((key) => {
        if (error[key] !== undefined) errorDetails[key] = error[key];
      });
      if (error.cause instanceof Error) {
        errorDetails.cause = {
          name: error.cause.name,
          message: error.cause.message,
          stack: error.cause.stack,
        };
      }
    } else {
      errorDetails.message = String(error);
    }
    console.error('[api] Fetch request failed', { apiUrl: API_URL, path, error: errorDetails });
    throw error;
  }
  let j = {};
  try { j = await r.json(); } catch (_e) {}
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
};

export { api, getToken, setToken };
