import { Platform } from 'react-native';

const TOKEN_KEY = 'shsrs_token';
const THEME_KEY = 'shsrs_theme';
const PAYMENT_AMOUNT = 25;
const PAYMENT_CURRENCY = 'PHP';
const PAYMENT_STATUS_LABELS = { Pending: 'Pending Verification', Verified: 'Approved', Rejected: 'Rejected' };
// Web: localhost. Phone (Expo Go): put your PC's Wi-Fi IPv4 here (run `ipconfig`). Android emulator: 10.0.2.2
const PC_IP = '172.20.10.8';
const API_URL = Platform.OS === 'web' ? 'http://localhost:3000' : `http://${PC_IP}:3000`;

export { TOKEN_KEY, THEME_KEY, PC_IP, API_URL, PAYMENT_AMOUNT, PAYMENT_CURRENCY, PAYMENT_STATUS_LABELS };
