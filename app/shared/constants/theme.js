import { Platform } from 'react-native';

const NAVY = '#0B1B3A', NAVY2 = '#13306B', GOLD = '#D4A017';
const LIGHT = { dark: false, bg: '#F2F5FB', card: '#FFFFFF', text: '#0F172A', muted: '#64748B', line: '#E3E8F2', soft: '#F6F8FD', primary: '#13306B', onPrimary: '#FFFFFF', gold: '#B7791F', goldBg: '#FBF2D9', ok: '#047857', okBg: '#DCFCE7', bad: '#B91C1C', badBg: '#FEE2E2' };
// Use a dark canvas with visibly lifted surfaces and bright actions, avoiding
// both the nearly black treatment and stark white cards from earlier palettes.
const DARK = { dark: true, bg: '#202A38', card: '#2D3949', text: '#F4F6FA', muted: '#B8C2D0', line: '#465466', soft: '#374457', primary: '#E2B540', onPrimary: '#201A0A', gold: '#E2B540', goldBg: '#514528', ok: '#75E0B5', okBg: '#285342', bad: '#FFAAAA', badBg: '#5A383E' };
const lift = (dark, strong) => Platform.select({
  web: { boxShadow: dark ? '0 10px 30px rgba(0,0,0,.35)' : strong ? '0 18px 50px rgba(15,23,42,.14)' : '0 6px 24px rgba(15,23,42,.06)' },
  default: { shadowColor: '#0f172a', shadowOpacity: dark ? 0.2 : strong ? 0.16 : 0.07, shadowRadius: strong ? 22 : 14, shadowOffset: { width: 0, height: strong ? 10 : 6 }, elevation: strong ? 6 : 2 },
});
const NAV = [
  ['dashboard', 'grid-outline', 'Home', 'Home'],
  ['reservations', 'calendar-outline', 'Reservation', 'Reserve'],
  ['qr', 'qr-code-outline', 'QR Code', 'QR'],
  ['myReservations', 'calendar-outline', 'My Reservations', 'My Res.'],
  ['guide', 'book-outline', 'Access Guide', 'Guide'],
];
const FINANCE_NAV = [
  ['financePending', 'wallet-outline', 'Payment', 'Payment'],
  ['financeHistory', 'time-outline', 'History', 'History'],
];
const SECURITY_NAV = [
  ['securityScan', 'scan-outline', 'Camera Scanner', 'Scanner'],
  ['securityActivity', 'list-outline', 'Locker Activity', 'Activity'],
];
const ADMIN_NAV = [
  ['dashboard', 'grid-outline', 'Dashboard', 'Dashboard'],
  ['adminSlots', 'construct-outline', 'Locker Maintenance', 'Lockers'],
  ['adminLogs', 'list-outline', 'Locker Access Logs', 'Logs'],
  ['adminReservations', 'calendar-outline', 'Reservations', 'Reservations'],
  ['adminUsers', 'people-outline', 'Users', 'Users'],
];
const PROTECTED = ['dashboard', 'slots', 'reservations', 'myReservations', 'qr', 'scan', 'guide', 'profile', 'admin', 'adminSlots', 'adminLogs', 'adminReservations', 'adminUsers', 'finance', 'financePending', 'financeHistory', 'securityScan', 'securityActivity'];
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEB = Platform.OS === 'web';

export { NAVY, NAVY2, GOLD, LIGHT, DARK, lift, NAV, ADMIN_NAV, FINANCE_NAV, SECURITY_NAV, PROTECTED, SLOTS, MON, DAYS, WEB };
