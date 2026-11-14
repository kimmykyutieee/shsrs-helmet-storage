import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { TOKEN_KEY, THEME_KEY } from './shared/constants/config';
import { NAVY, GOLD, LIGHT, DARK, PROTECTED, lift } from './shared/constants/theme';
import { api, getToken, setToken } from './services/api';
import { Ctx } from './shared/hooks/useApp';
import { mk } from './styles/theme';
import { Shield, InfoModal } from './components/common';
import RootNavigator from './navigation/RootNavigator';

const EMPTY = { me: null, users: [], res: [], blocked: [], log: [], payments: [] };

function Root() {
  const sys = useColorScheme();
  const { width } = useWindowDimensions();
  const [db, setDb] = useState(null);
  const [theme, setTheme] = useState(null);
  const [route, setRoute] = useState({ n: 'home', arg: null });
  const [msg, setMsg] = useState('');
  const [info, setInfo] = useState(null);
  const [netErr, setNetErr] = useState('');
  const timer = useRef(null);

  const refresh = async () => { const d = await api('GET', '/api/data'); setDb(d); return d; };

  const boot = async () => {
    setNetErr('');
    try {
      const [t, th] = await Promise.all([AsyncStorage.getItem(TOKEN_KEY), AsyncStorage.getItem(THEME_KEY)]);
      if (th) setTheme(th);
      setToken(t);
      if (t) {
        try {
          const d = await api('GET', '/api/data');
          setDb(d);
          const user = d.users.find((u) => u.id === d.me);
          setRoute({ n: user?.finance ? 'finance' : 'dashboard', arg: null });
          return;
        }
        catch (e) { if (/reach/i.test(e.message)) throw e; setToken(null); AsyncStorage.removeItem(TOKEN_KEY); }
      } else { await api('GET', '/api/health'); }
      setDb(EMPTY);
    } catch (e) { setNetErr(e.message); }
  };
  useEffect(() => { boot(); }, []);
  useEffect(() => { if (getToken()) api('GET', '/api/data').then(setDb).catch(() => {}); }, [route.n]);

  if (netErr) {
    return (
      <View style={{ flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
        <View style={{ maxWidth: 460, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 26, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <Shield size={44} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>{netErr.startsWith('Cannot reach') ? 'Server not reachable' : 'Database problem'}</Text>
          <Text style={{ color: '#fca5a5' }}>{netErr}</Text>
          <Text style={{ color: '#9fb1d6', lineHeight: 21 }}>{netErr.startsWith('Cannot reach')
            ? "Make sure `npm start` is running in the server folder (and XAMPP MySQL is on). On a phone, PC_IP in App.js must be your PC's Wi-Fi address."
            : 'The API is running but MySQL is not ready. Start MySQL in XAMPP and import schema.sql in phpMyAdmin, then press Retry.'}</Text>
          <TouchableOpacity onPress={boot} style={{ backgroundColor: GOLD, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}><Text style={{ fontWeight: '800', color: '#1a1304' }}>Retry</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  if (!db) return <View style={{ flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', gap: 16 }}><Shield size={56} /><ActivityIndicator color={GOLD} /></View>;

  const nav = (n, arg = null) => setRoute({ n, arg });
  const toast = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 2800); };
  const signIn = async (tok) => {
    setToken(tok);
    await AsyncStorage.setItem(TOKEN_KEY, tok);
    const data = await refresh();
    const user = data.users.find((u) => u.id === data.me);
    nav(user?.finance ? 'finance' : 'dashboard');
  };
  const logout = () => { setToken(null); AsyncStorage.removeItem(TOKEN_KEY); setDb(EMPTY); nav('home'); };
  const me = db.users.find((u) => u.id === db.me);
  const dark = (theme || sys) === 'dark';
  const c = dark ? DARK : LIGHT;
  const s = mk(c);
  const wide = width >= 900;
  const mine = () => db.res.filter((r) => r.uid === db.me).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const toggleTheme = () => { const n = dark ? 'light' : 'dark'; setTheme(n); AsyncStorage.setItem(THEME_KEY, n); };

  let n = route.n;
  if (PROTECTED.includes(n) && !me) n = 'login';
  if ((n === 'login' || n === 'register') && me) n = me.finance ? 'finance' : 'dashboard';
  if (me?.finance && n !== 'finance') n = 'finance';
  if (n === 'finance' && me && !me.finance) n = me.admin ? 'admin' : 'dashboard';
  if (n.startsWith('admin') && me && !me.admin) n = 'dashboard';
  if (me?.admin && ['reservations', 'qr', 'scan', 'guide'].includes(n)) n = 'dashboard';

  const ctx = { db, refresh, signIn, nav, toast, me, c, s, mine, logout, toggleTheme, setInfo, wide, width };
  const manual = [
    ['1', 'Scan ID and register', 'Scan a student ID QR containing a name, 10-digit student ID and course/program, then enter your account details. The payload does not verify school, campus or ID authenticity.'],
    ['2', 'Reserve and pay', 'Choose a slot, date and time, then submit the PHP 25.00 payment method and receipt image.'],
    ['3', 'Wait for verification', 'Finance reviews your payment. Your reservation QR code is released after verification.'],
    ['4', 'Scan', 'Scan the verified code at the cabinet scanner to unlock your slot, then store or retrieve your helmet.'],
    ['5', 'Manage', 'Search, reschedule or cancel reservations, and export the list as a PDF.'],
  ];
  return (
    <Ctx.Provider value={ctx}>
      <StatusBar barStyle={n === 'home' || n === 'login' || n === 'register' ? (n === 'home' ? 'light-content' : dark ? 'light-content' : 'dark-content') : 'light-content'} />
      <RootNavigator route={{ n, arg: route.arg }} me={me} />
      <InfoModal visible={info === 'manual'} title="System manual" onClose={() => setInfo(null)}>
        {manual.map(([i, t, d]) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: c.onPrimary, fontWeight: '800' }}>{i}</Text></View>
            <View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '700' }}>{t}</Text><Text style={[s.muted, { marginTop: 2, lineHeight: 20 }]}>{d}</Text></View>
          </View>
        ))}
      </InfoModal>
      <InfoModal visible={info === 'tutorial'} title="Video tutorials" onClose={() => setInfo(null)}>
        {['Creating your account', 'Booking a storage slot', 'Finding and sharing your QR code', 'Unlocking the cabinet'].map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: c.line }}>
            <Ionicons name="play-circle-outline" size={24} color={c.gold} /><Text style={{ color: c.text, fontWeight: '600' }}>{i + 1}. {t}</Text>
          </View>
        ))}
        <Text style={[s.muted, { marginTop: 14 }]}>Open the Access Guide after logging in for the full step-by-step walkthrough.</Text>
      </InfoModal>
      {msg ? (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: wide ? 36 : 96, left: 20, right: 20, alignItems: 'center' }}>
          <View style={{ backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(212,160,23,0.5)', ...lift(true, true) }}>
            <Ionicons name="checkmark-circle" size={18} color={GOLD} />
            <Text style={{ color: '#fff', fontWeight: '600' }}>{msg}</Text>
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

export default function App() {
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}