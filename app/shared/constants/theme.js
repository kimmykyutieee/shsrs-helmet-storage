import { Platform } from 'react-native';

const NAVY = '#0B1B3A', NAVY2 = '#13306B', GOLD = '#D4A017';
const LIGHT = { dark: false, bg: '#F2F5FB', card: '#FFFFFF', text: '#0F172A', muted: '#64748B', line: '#E3E8F2', soft: '#F6F8FD', primary: '#13306B', onPrimary: '#FFFFFF', gold: '#B7791F', goldBg: '#FBF2D9', ok: '#047857', okBg: '#DCFCE7', bad: '#B91C1C', badBg: '#FEE2E2' };
const DARK = { dark: true, bg: '#080E1C', card: '#101A30', text: '#E8ECF5', muted: '#93A0BA', line: '#1E2A47', soft: '#0D1627', primary: '#E0B23A', onPrimary: '#0B1220', gold: '#E5B53C', goldBg: '#2A2410', ok: '#34D399', okBg: '#0F3D2E', bad: '#F87171', badBg: '#3F1D1D' };
const lift = (dark, strong) => Platform.select({
  web: { boxShadow: dark ? '0 10px 30px rgba(0,0,0,.35)' : strong ? '0 18px 50px rgba(15,23,42,.14)' : '0 6px 24px rgba(15,23,42,.06)' },
  default: { shadowColor: '#0f172a', shadowOpacity: dark ? 0.4 : strong ? 0.16 : 0.07, shadowRadius: strong ? 22 : 14, shadowOffset: { width: 0, height: strong ? 10 : 6 }, elevation: strong ? 6 : 2 },
});
const NAV = [
  ['dashboard', 'grid-outline', 'Dashboard', 'Overview'],
  ['reservations', 'calendar-outline', 'Reservations', 'Reserve'],
  ['qr', 'qr-code-outline', 'QR Code', 'QR'],
  ['scan', 'scan-outline', 'Cabinet Scanner', 'Scan'],
  ['guide', 'book-outline', 'Access Guide', 'Guide'],
];
const ADMIN_NAV = [
  ['dashboard', 'grid-outline', 'Dashboard', 'Dashboard'],
  ['adminSlots', 'construct-outline', 'Slot Maintenance', 'Slots'],
  ['adminLogs', 'list-outline', 'Cabinet Access Logs', 'Logs'],
  ['adminReservations', 'calendar-outline', 'Reservations', 'Reservations'],
  ['adminUsers', 'people-outline', 'Users', 'Users'],
];
const PROTECTED = ['dashboard', 'reservations', 'qr', 'scan', 'guide', 'profile', 'admin', 'adminSlots', 'adminLogs', 'adminReservations', 'adminUsers', 'finance'];
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEB = Platform.OS === 'web';

export { NAVY, NAVY2, GOLD, LIGHT, DARK, lift, NAV, ADMIN_NAV, PROTECTED, SLOTS, MON, DAYS, WEB };
