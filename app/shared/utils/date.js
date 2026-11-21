import { DAYS, MON } from '../constants/theme';

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const today = () => ymd(new Date());
const dt = (d, t) => {
  const [y, m, da] = d.split('-').map(Number);
  const [h, mi] = (t || '00:00').split(':').map(Number);
  return new Date(y, m - 1, da, h, mi);
};
const fd = (d) => { const [y, m, da] = d.split('-').map(Number); return `${MON[m - 1]} ${da}, ${y}`; };
const ft = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
const isPast = (r) => dt(r.date, r.time) < new Date();
const stamp = (ts) => { const d = new Date(ts); return `${MON[d.getMonth()]} ${d.getDate()}, ${ft(hm(d))}`; };
const okMail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const longDate = () => { const d = new Date(); return `${DAYS[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}`; };

export { pad, ymd, hm, today, dt, fd, ft, isPast, stamp, okMail, esc, greet, longDate };
