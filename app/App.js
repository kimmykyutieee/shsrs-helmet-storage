import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ActivityIndicator, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { TOKEN_KEY, THEME_KEY } from './shared/constants/config';
import { NAVY, GOLD, LIGHT, DARK, PROTECTED, lift } from './shared/constants/theme';
import { api, getToken, setToken } from './services/api';
import { Ctx } from './shared/hooks/useApp';
import { mk } from './components/theme.styles';
import { Shield, InfoModal } from './components';
import { staticStyles, dynamicStyles } from './components/app.styles';
import RootNavigator from './navigation/RootNavigator';

const EMPTY = { me: null, users: [], res: [], slotReservations: [], slots: [], blocked: [], log: [], payments: [] };
const homeRoute = (user) => user?.admin ? 'dashboard' : user?.finance ? 'financePending' : user?.security ? 'securityScan' : 'dashboard';

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
          setRoute({ n: homeRoute(user), arg: null });
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
      <View style={dynamicStyles.appView1({ NAVY })}>
        <View style={staticStyles.appView2}>
          <Shield size={44} />
          <Text style={staticStyles.appText3}>{netErr.startsWith('Cannot reach') ? 'Server not reachable' : 'Database problem'}</Text>
          <Text style={staticStyles.appText4}>{netErr}</Text>
          <Text style={staticStyles.appText5}>{netErr.startsWith('Cannot reach')
            ? "Make sure `npm start` is running in the server folder (and XAMPP MySQL is on). On a phone, PC_IP in App.js must be your PC's Wi-Fi address."
            : 'The API is running but MySQL is not ready. Start MySQL in XAMPP and import schema.sql in phpMyAdmin, then press Retry.'}</Text>
          <TouchableOpacity onPress={boot} style={dynamicStyles.appTouchableOpacity6({ GOLD })}><Text style={staticStyles.appText7}>Retry</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  if (!db) return <View style={dynamicStyles.appView8({ NAVY })}><Shield size={56} /><ActivityIndicator color={GOLD} /></View>;

  const nav = (n, arg = null) => setRoute({ n, arg });
  const toast = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 2800); };
  const signIn = async (tok) => {
    setToken(tok);
    await AsyncStorage.setItem(TOKEN_KEY, tok);
    const data = await refresh();
    const user = data.users.find((u) => u.id === data.me);
    nav(homeRoute(user));
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
  if ((n === 'login' || n === 'register') && me) n = homeRoute(me);
  const financeRoutes = ['finance', 'financePending', 'financeHistory'];
  const securityRoutes = ['securityScan', 'securityActivity'];
  if (me?.finance && !financeRoutes.includes(n)) n = 'financePending';
  if (me?.security && !securityRoutes.includes(n)) n = 'securityScan';
  if (financeRoutes.includes(n) && me && !me.finance) n = me.admin ? 'admin' : me.security ? 'securityScan' : 'dashboard';
  if (securityRoutes.includes(n) && me && !me.security) n = me.admin ? 'admin' : me.finance ? 'financePending' : 'dashboard';
  if (n.startsWith('admin') && me && !me.admin) n = 'dashboard';
  if (me?.admin && ['slots', 'reservations', 'myReservations', 'qr', 'scan', 'guide'].includes(n)) n = 'dashboard';

  const ctx = { db, refresh, signIn, nav, toast, me, c, s, mine, logout, toggleTheme, setInfo, wide, width };
  const manual = [
    ['1', 'Scan ID and register', 'Scan a student ID QR containing a name, 10-digit student ID and course/program, then enter your account details. The payload does not verify school, campus or ID authenticity.'],
    ['2', 'Reserve and pay', 'Choose a slot, date and time, then submit the PHP 25.00 payment method and receipt image.'],
    ['3', 'Wait for verification', 'Finance reviews your payment. Your reservation QR code is released after verification.'],
    ['4', 'Security scan', 'Security staff verify the rider QR code with the Camera Scanner before the helmet is stored or retrieved.'],
    ['5', 'Manage', 'Search, reschedule or cancel reservations, and export the list as a PDF.'],
  ];
  return (
    <Ctx.Provider value={ctx}>
      <StatusBar barStyle={n === 'home' || n === 'login' || n === 'register' ? (n === 'home' ? 'light-content' : dark ? 'light-content' : 'dark-content') : 'light-content'} />
      <RootNavigator route={{ n, arg: route.arg }} me={me} />
      <InfoModal visible={info === 'manual'} title="System manual" onClose={() => setInfo(null)}>
        {manual.map(([i, t, d]) => (
          <View key={i} style={staticStyles.appView9}>
            <View style={dynamicStyles.appView10({ c })}><Text style={dynamicStyles.appText11({ c })}>{i}</Text></View>
            <View style={staticStyles.appView12}><Text style={dynamicStyles.appText13({ c })}>{t}</Text><Text style={[s.muted, staticStyles.appText14]}>{d}</Text></View>
          </View>
        ))}
      </InfoModal>
      <InfoModal visible={info === 'tutorial'} title="Video tutorials" onClose={() => setInfo(null)}>
        {['Creating your account', 'Booking a storage slot', 'Finding and sharing your QR code', 'Unlocking the cabinet'].map((t, i) => (
          <View key={t} style={dynamicStyles.appView15({ c })}>
            <Ionicons name="play-circle-outline" size={24} color={c.gold} /><Text style={dynamicStyles.appText16({ c })}>{i + 1}. {t}</Text>
          </View>
        ))}
        <Text style={[s.muted, staticStyles.appText17]}>Open the Access Guide after logging in for the full step-by-step walkthrough.</Text>
      </InfoModal>
      {msg ? (
        <View pointerEvents="none" style={dynamicStyles.appView18({ wide })}>
          <View style={dynamicStyles.appView19({ NAVY, lift })}>
            <Ionicons name="checkmark-circle" size={18} color={GOLD} />
            <Text style={staticStyles.appText20}>{msg}</Text>
          </View>
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

export default function App() {
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}