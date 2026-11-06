// Helmet Reservation Storage System (SHSRS) — premium UI · React Native (Expo) · works on phone + browser
// Talks to the Node/MySQL API in /shsrs-server.
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal, Alert,
  Image, Share, Platform, StatusBar, KeyboardAvoidingView, ActivityIndicator, useColorScheme, useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

/* ============================== config ============================== */
const TOKEN_KEY = 'shsrs_token';
const THEME_KEY = 'shsrs_theme';
// Web: localhost. Phone (Expo Go): put your PC's Wi-Fi IPv4 here (run `ipconfig`). Android emulator: 10.0.2.2
const PC_IP = '192.168.1.10';
const API_URL = Platform.OS === 'web' ? 'http://localhost:3000' : `http://${PC_IP}:3000`;
let TOKEN = null;
const api = async (method, path, body) => {
  let r;
  try {
    r = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) { throw new Error('Cannot reach the server at ' + API_URL); }
  let j = {};
  try { j = await r.json(); } catch (e) {}
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
};

/* ============================== design tokens ============================== */
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
const ADMIN_NAV = ['admin', 'shield-checkmark-outline', 'Admin Panel', 'Admin'];
const PROTECTED = ['dashboard', 'reservations', 'qr', 'scan', 'guide', 'profile', 'admin'];
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEB = Platform.OS === 'web';

/* ============================== helpers ============================== */
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

const confirmBox = (title, msg, yesLabel, onYes) => {
  if (WEB) { if (window.confirm(`${title}\n\n${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'No', style: 'cancel' }, { text: yesLabel, style: 'destructive', onPress: onYes }]);
};
const shareText = async (message, toast, title) => {
  if (WEB) {
    try {
      if (navigator.share) await navigator.share({ title, text: message });
      else { await navigator.clipboard.writeText(message); toast('Copied to clipboard.'); }
    } catch (e) { if (!e || e.name !== 'AbortError') toast('Sharing is not available.'); }
    return;
  }
  try { await Share.share({ title, message }); } catch (e) { toast('Sharing is not available.'); }
};
const sharePdf = async (html, toast) => {
  if (WEB) { await Print.printAsync({ html }); return; }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  else toast('Sharing is not available on this device.');
};

/* ============================== context + styles ============================== */
const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

const mk = (c) => StyleSheet.create({
  fill: { flex: 1, backgroundColor: c.bg },
  card: { backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 18, padding: 22, marginBottom: 18, ...lift(c.dark) },
  cardTitle: { color: c.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  cardSub: { color: c.muted, fontSize: 13.5, marginTop: 3, lineHeight: 19 },
  text: { color: c.text, fontSize: 15 },
  muted: { color: c.muted, fontSize: 14 },
  eyebrow: { color: c.gold, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  label: { color: c.text, fontWeight: '600', fontSize: 13.5, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, color: c.text, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, minHeight: 48 },
  err: { color: c.bad, fontSize: 13, marginTop: 2, marginBottom: 8, fontWeight: '500' },
  fld: { marginBottom: 16 },
  empty: { color: c.muted, textAlign: 'center', padding: 26, lineHeight: 21 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  divider: { height: 1, backgroundColor: c.line, marginVertical: 18 },
});

/* ============================== primitives ============================== */
function Shield({ size = 40 }) {
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
      <Defs>
        <LinearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#f7e07a" /><Stop offset="0.5" stopColor="#d4a017" /><Stop offset="1" stopColor="#8a6508" />
        </LinearGradient>
      </Defs>
      <Path d="M50 4 92 18v38c0 28-18 44-42 52C26 100 8 84 8 56V18z" fill="url(#sg)" />
      <Path d="M50 12 84 24v32c0 22-14 36-34 43C30 92 16 78 16 56V24z" fill="none" stroke="#ffffff66" strokeWidth="1.5" />
      <Path d="M27 66c-1-18 8-30 24-30 14 0 24 9 24 24v8c0 2-1 3-3 3H30c-2 0-3-2-3-5z" fill="#0b0b0d" />
      <Path d="M33 62c2-9 9-14 18-13" fill="none" stroke="#ddd" strokeWidth="3" strokeLinecap="round" />
      <Path d="M38 66h36" stroke="#ddd" strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

function Gradient({ id, from = NAVY, to = NAVY2, style }) {
  return (
    <Svg style={[StyleSheet.absoluteFill, style]} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={from} /><Stop offset="1" stopColor={to} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function Btn({ label, onPress, icon, variant = 'primary', small, style, full }) {
  const { c } = useApp();
  const V = {
    primary: { bg: c.primary, fg: c.onPrimary, bd: c.primary },
    gold: { bg: GOLD, fg: '#1a1304', bd: GOLD },
    outline: { bg: 'transparent', fg: c.text, bd: c.line },
    soft: { bg: c.soft, fg: c.text, bd: c.line },
    danger: { bg: c.bad, fg: '#fff', bd: c.bad },
    light: { bg: '#fff', fg: NAVY, bd: '#fff' },
    ghostDark: { bg: 'transparent', fg: '#fff', bd: 'rgba(255,255,255,0.28)' },
  }[variant];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{
      backgroundColor: V.bg, borderColor: V.bd, borderWidth: 1, borderRadius: 12,
      paddingHorizontal: small ? 12 : 20, paddingVertical: small ? 8 : 13, minHeight: small ? 36 : 46,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1,
      alignSelf: full ? 'stretch' : 'auto',
    }, style]}>
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={V.fg} /> : null}
      {label ? <Text style={{ color: V.fg, fontWeight: '700', fontSize: small ? 13 : 14.5, letterSpacing: 0.1 }}>{label}</Text> : null}
    </Pressable>
  );
}

function Field({ label, icon, secure, ...p }) {
  const { s, c } = useApp();
  const [show, setShow] = useState(false);
  return (
    <View style={s.fld}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={{ justifyContent: 'center' }}>
        {icon ? <Ionicons name={icon} size={18} color={c.muted} style={{ position: 'absolute', left: 14, zIndex: 1 }} /> : null}
        <TextInput style={[s.input, icon && { paddingLeft: 42 }, secure && { paddingRight: 44 }]} placeholderTextColor={c.muted} autoCapitalize="none" secureTextEntry={secure && !show} {...p} />
        {secure ? (
          <TouchableOpacity onPress={() => setShow(!show)} style={{ position: 'absolute', right: 12, padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Tag({ text, kind = 'mute' }) {
  const { c } = useApp();
  const K = { ok: [c.okBg, c.ok], gold: [c.goldBg, c.gold], bad: [c.badBg, c.bad], mute: [c.soft, c.muted] }[kind];
  return <Text style={{ backgroundColor: K[0], color: K[1], paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, overflow: 'hidden', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 }}>{text}</Text>;
}

function Avatar({ u, size = 36, ring }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: NAVY2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: ring ? 2 : 0, borderColor: GOLD }}>
      {u.photo ? <Image source={{ uri: u.photo }} style={{ width: size, height: size }} />
        : <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{u.name[0].toUpperCase()}</Text>}
    </View>
  );
}

function IconBox({ icon, tone = 'primary', size = 46 }) {
  const { c } = useApp();
  const bg = tone === 'gold' ? c.goldBg : tone === 'ok' ? c.okBg : c.soft;
  const fg = tone === 'gold' ? c.gold : tone === 'ok' ? c.ok : c.primary;
  return <View style={{ width: size, height: size, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={size * 0.46} color={fg} /></View>;
}

function InfoModal({ visible, title, onClose, children }) {
  const { c } = useApp();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(5,10,25,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <View style={{ backgroundColor: c.card, borderRadius: 20, padding: 24, maxHeight: '86%', width: '100%', maxWidth: 520, ...lift(c.dark, true) }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: c.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={c.muted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DateTimeFields({ date, time, onDate, onTime }) {
  const { s, c } = useApp();
  const [show, setShow] = useState(null);
  const ios = Platform.OS === 'ios';
  if (WEB) {
    const st = { flex: 1, padding: '12px 14px', fontSize: 15, borderRadius: 12, border: `1px solid ${c.line}`, background: c.soft, color: c.text, colorScheme: c.dark ? 'dark' : 'light', minHeight: 48, boxSizing: 'border-box', fontFamily: 'inherit' };
    return (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {React.createElement('input', { type: 'date', value: date, min: today(), onChange: (e) => onDate(e.target.value), style: st })}
        {React.createElement('input', { type: 'time', value: time, onChange: (e) => onTime(e.target.value), style: st })}
      </View>
    );
  }
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const Box = ({ k, text, ph, icon }) => (
    <TouchableOpacity style={[s.input, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }]} onPress={() => setShow(show === k ? null : k)}>
      <Ionicons name={icon} size={17} color={c.muted} />
      <Text style={{ color: text ? c.text : c.muted, fontSize: 15 }}>{text || ph}</Text>
    </TouchableOpacity>
  );
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Box k="d" text={date ? fd(date) : ''} ph="Select date" icon="calendar-outline" />
        <Box k="t" text={time ? ft(time) : ''} ph="Select time" icon="time-outline" />
      </View>
      {show === 'd' && (
        <DateTimePicker value={date ? dt(date, '00:00') : new Date()} mode="date" minimumDate={midnight}
          display={ios ? 'inline' : 'default'} themeVariant={c.dark ? 'dark' : 'light'}
          onChange={(e, v) => { if (!ios) setShow(null); if (e.type !== 'dismissed' && v) onDate(ymd(v)); }} />
      )}
      {show === 't' && (
        <DateTimePicker value={time ? dt(today(), time) : new Date()} mode="time"
          display={ios ? 'spinner' : 'default'} themeVariant={c.dark ? 'dark' : 'light'}
          onChange={(e, v) => { if (!ios) setShow(null); if (e.type !== 'dismissed' && v) onTime(hm(v)); }} />
      )}
    </View>
  );
}

function SlotGrid({ taken, blocked, sel, onSel, admin, onAdminTap }) {
  const { c } = useApp();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
      {SLOTS.map((n) => {
        const isBlocked = blocked.includes(n);
        const dis = !admin && (isBlocked || taken.has(n));
        const on = admin ? isBlocked : sel === n;
        const status = isBlocked ? 'Maintenance' : taken.has(n) ? 'Reserved' : 'Available';
        const fg = on ? c.onPrimary : dis ? c.muted : c.text;
        return (
          <Pressable key={n} disabled={dis} onPress={() => (admin ? onAdminTap(n) : onSel(n))}
            style={({ pressed }) => ({
              width: '31%', flexGrow: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 2, borderWidth: 1.5,
              borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primary : dis ? c.soft : c.card, opacity: pressed ? 0.85 : 1,
            })}>
            <Ionicons name={isBlocked ? 'construct-outline' : dis ? 'lock-closed-outline' : on ? 'checkmark-circle' : 'lock-open-outline'} size={18} color={fg} />
            <Text style={{ color: fg, fontWeight: '800', fontSize: 17, marginTop: 2, textDecorationLine: dis && !isBlocked ? 'line-through' : 'none' }}>Slot {n}</Text>
            <Text style={{ fontSize: 11, color: on ? c.onPrimary : c.muted, opacity: on ? 0.85 : 1, fontWeight: '600' }}>{admin ? (isBlocked ? 'Maintenance' : 'Active') : status}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ============================== layout (sidebar on desktop · tab bar on phone) ============================== */
function Layout({ cur, title, subtitle, children }) {
  const { c, s, me, nav, logout, toggleTheme, wide } = useApp();
  const [menu, setMenu] = useState(false);
  const items = NAV.concat(me.admin ? [ADMIN_NAV] : []);

  const content = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: wide ? 32 : 16, paddingBottom: wide ? 60 : 30 }}>
      <View style={{ width: '100%', maxWidth: 1120, alignSelf: 'center' }}>
        {wide ? null : (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }}>{title}</Text>
            {subtitle ? <Text style={[s.muted, { marginTop: 3 }]}>{subtitle}</Text> : null}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );

  const sheet = (
    <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
      <Pressable onPress={() => setMenu(false)} style={{ flex: 1, backgroundColor: 'rgba(5,10,25,0.5)', justifyContent: wide ? 'flex-end' : 'flex-start', alignItems: wide ? 'flex-start' : 'flex-end', padding: wide ? 20 : 12, paddingTop: wide ? 20 : 64 }}>
        <View style={{ backgroundColor: c.card, borderRadius: 16, minWidth: 220, padding: 8, borderWidth: 1, borderColor: c.line, ...lift(c.dark, true) }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 }}>
            <Avatar u={me} size={38} />
            <View><Text style={{ color: c.text, fontWeight: '700' }}>{me.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{me.email}</Text></View>
          </View>
          <View style={[s.divider, { marginVertical: 4 }]} />
          {[['person-outline', 'Profile', () => nav('profile')], [c.dark ? 'sunny-outline' : 'moon-outline', c.dark ? 'Light mode' : 'Dark mode', toggleTheme], ['log-out-outline', 'Log out', logout]].map(([ico, label, fn]) => (
            <TouchableOpacity key={label} onPress={() => { setMenu(false); fn(); }} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10 }}>
              <Ionicons name={ico} size={18} color={label === 'Log out' ? c.bad : c.text} /><Text style={{ color: label === 'Log out' ? c.bad : c.text, fontWeight: '600' }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
        <View style={{ width: 264, backgroundColor: NAVY, padding: 18, justifyContent: 'space-between' }}>
          <View>
            <TouchableOpacity onPress={() => nav('dashboard')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 6, marginBottom: 22 }}>
              <Shield size={34} />
              <View><Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 }}>SHSRS</Text><Text style={{ color: '#8fa3cc', fontSize: 11.5 }}>Helmet Storage System</Text></View>
            </TouchableOpacity>
            <Text style={{ color: '#6c80ab', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8, marginLeft: 8 }}>MENU</Text>
            {items.map(([k, ico, label]) => {
              const on = k === cur;
              return (
                <TouchableOpacity key={k} onPress={() => nav(k)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, backgroundColor: on ? 'rgba(212,160,23,0.14)' : 'transparent' }}>
                  <Ionicons name={ico} size={19} color={on ? GOLD : '#9fb1d6'} />
                  <Text style={{ color: on ? '#fff' : '#b8c6e4', fontWeight: on ? '700' : '500', fontSize: 14.5 }}>{label}</Text>
                  {on ? <View style={{ marginLeft: 'auto', width: 4, height: 18, borderRadius: 2, backgroundColor: GOLD }} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity onPress={() => setMenu(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <Avatar u={me} size={38} ring />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{me.name}</Text>
              <Text style={{ color: '#8fa3cc', fontSize: 12 }}>{me.admin ? 'Administrator' : 'Rider'}</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={18} color="#8fa3cc" />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: 32, paddingTop: 28, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              <Text style={s.eyebrow}>{longDate()}</Text>
              <Text style={{ color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 }}>{title}</Text>
              {subtitle ? <Text style={[s.muted, { marginTop: 4 }]}>{subtitle}</Text> : null}
            </View>
          </View>
          {content}
        </View>
        {sheet}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={{ backgroundColor: NAVY, paddingHorizontal: 16, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={() => nav('dashboard')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Shield size={28} /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>SHSRS</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenu(true)}><Avatar u={me} size={36} ring /></TouchableOpacity>
      </View>
      {content}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line }}>
        <View style={{ flexDirection: 'row', paddingTop: 8, paddingBottom: 4 }}>
          {items.map(([k, ico, , short]) => {
            const on = k === cur;
            return (
              <TouchableOpacity key={k} onPress={() => nav(k)} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, backgroundColor: on ? c.goldBg : 'transparent' }}>
                  <Ionicons name={ico} size={21} color={on ? c.gold : c.muted} />
                </View>
                <Text style={{ fontSize: 10.5, fontWeight: on ? '800' : '600', color: on ? c.text : c.muted }}>{short}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
      {sheet}
    </SafeAreaView>
  );
}

/* ============================== landing ============================== */
function Home() {
  const { db, nav, setInfo, width } = useApp();
  const wide = width >= 900;
  const features = [
    ['qr-code-outline', 'QR-secured access', 'Every reservation generates a unique QR code that unlocks only your slot.'],
    ['grid-outline', '12 smart slots', 'Pick a slot, date and time. Live availability prevents double bookings.'],
    ['notifications-outline', 'Smart reminders', 'See your next reservation and same-day reminders on your dashboard.'],
    ['shield-checkmark-outline', 'Admin controls', 'Maintenance mode, full access logs and CSV exports for administrators.'],
  ];
  const steps = [['person-add-outline', 'Create an account'], ['calendar-outline', 'Reserve a slot'], ['qr-code-outline', 'Scan your QR code'], ['lock-open-outline', 'Store your helmet']];
  const pad2 = wide ? 56 : 22;
  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ overflow: 'hidden' }}>
            <Gradient id="hero" from="#08122b" to="#17397f" />
            <View style={{ position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(212,160,23,0.10)' }} />
            <View style={{ position: 'absolute', left: -140, bottom: -160, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(255,255,255,0.04)' }} />
            <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingTop: 22, paddingBottom: wide ? 90 : 56 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wide ? 70 : 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Shield size={32} /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.6 }}>SHSRS</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {db.me ? <Btn small variant="ghostDark" label="Dashboard" onPress={() => nav('dashboard')} /> : (
                    <>
                      <Btn small variant="ghostDark" label="Log in" onPress={() => nav('login')} />
                      <Btn small variant="gold" label="Register" onPress={() => nav('register')} />
                    </>
                  )}
                </View>
              </View>
              <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 40 }}>
                <View style={{ flex: wide ? 1.15 : undefined }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(212,160,23,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginBottom: 20 }}>
                    <Ionicons name="shield-checkmark" size={14} color={GOLD} />
                    <Text style={{ color: '#f1d27a', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>SMART HELMET STORAGE</Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: wide ? 54 : 36, fontWeight: '800', letterSpacing: wide ? -1.8 : -1, lineHeight: wide ? 60 : 42 }}>
                    Secure helmet storage, <Text style={{ color: GOLD }}>reserved in seconds.</Text>
                  </Text>
                  <Text style={{ color: '#aebbd8', fontSize: wide ? 18 : 16, lineHeight: wide ? 28 : 24, marginTop: 18, maxWidth: 540 }}>
                    Manage and reserve safety helmets efficiently. Book a cabinet slot, get your personal QR code, and unlock it with a single scan.
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 30 }}>
                    <Btn variant="gold" icon="arrow-forward" label="Reserve now" onPress={() => nav(db.me ? 'reservations' : 'login')} />
                    <Btn variant="ghostDark" icon="book-outline" label="System manual" onPress={() => setInfo('manual')} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: wide ? 40 : 24, marginTop: 38 }}>
                    {[['12', 'Secure slots'], ['QR', 'One-scan access'], ['Live', 'Availability']].map(([a, b]) => (
                      <View key={b}><Text style={{ color: '#fff', fontSize: 26, fontWeight: '800' }}>{a}</Text><Text style={{ color: '#8fa3cc', fontSize: 13 }}>{b}</Text></View>
                    ))}
                  </View>
                </View>
                {wide ? (
                  <View style={{ flex: 0.85, alignItems: 'center', justifyContent: 'center', height: 380 }}>
                    <View style={{ position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(212,160,23,0.08)', borderWidth: 1, borderColor: 'rgba(212,160,23,0.25)' }} />
                    <View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }} />
                    <Shield size={170} />
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: '#f4f6fb' }}>
            <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingVertical: wide ? 70 : 44 }}>
              <Text style={{ color: '#B7791F', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center' }}>WHY SHSRS</Text>
              <Text style={{ color: '#0F172A', fontSize: wide ? 34 : 26, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginTop: 8, marginBottom: 34 }}>Everything you need to store a helmet safely</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {features.map(([ico, t, d]) => (
                  <View key={t} style={{ flexGrow: 1, flexBasis: wide ? '22%' : '100%', backgroundColor: '#fff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#e3e8f2' }}>
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: '#FBF2D9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Ionicons name={ico} size={22} color="#B7791F" /></View>
                    <Text style={{ color: '#0F172A', fontSize: 16.5, fontWeight: '700', marginBottom: 6 }}>{t}</Text>
                    <Text style={{ color: '#64748B', lineHeight: 21 }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: NAVY }}>
            <View style={{ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingVertical: wide ? 64 : 44 }}>
              <Text style={{ color: GOLD, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center' }}>HOW IT WORKS</Text>
              <Text style={{ color: '#fff', fontSize: wide ? 32 : 25, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginTop: 8, marginBottom: 32 }}>Four simple steps</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                {steps.map(([ico, t], i) => (
                  <View key={t} style={{ flexGrow: 1, flexBasis: wide ? '22%' : '46%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Text style={{ color: GOLD, fontSize: 13, fontWeight: '800', marginBottom: 12 }}>0{i + 1}</Text>
                    <Ionicons name={ico} size={26} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15.5, marginTop: 12 }}>{t}</Text>
                  </View>
                ))}
              </View>
              <View style={{ alignItems: 'center', marginTop: 36 }}>
                <Btn variant="gold" label={db.me ? 'Go to dashboard' : 'Get started'} icon="arrow-forward" onPress={() => nav(db.me ? 'dashboard' : 'register')} />
                <Text onPress={() => setInfo('tutorial')} style={{ color: '#8fa3cc', marginTop: 18, textDecorationLine: 'underline' }}>Watch video tutorials ↗</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ color: '#6c80ab', fontSize: 12.5 }}>© 2026 Helmet Reservation Storage System</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ============================== auth ============================== */
function Auth({ reg }) {
  const { signIn, nav, toast, s, c, width } = useApp();
  const wide = width >= 900;
  const [f, setF] = useState({ n: '', e: '', p: '', c: '' });
  const [er, setEr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));

  const submit = async () => {
    const e = f.e.trim().toLowerCase();
    if (reg) {
      if (!f.n.trim()) return setEr('Please enter your name.');
      if (!okMail(e)) return setEr('Please enter a valid email address.');
      if (f.p.length < 8) return setEr('Password must be at least 8 characters.');
      if (f.p !== f.c) return setEr('Passwords do not match.');
    }
    setBusy(true); setEr('');
    try {
      const r = reg
        ? await api('POST', '/api/register', { name: f.n.trim(), email: e, password: f.p })
        : await api('POST', '/api/login', { email: e, password: f.p });
      await signIn(r.token);
      if (reg) toast('Account created. Welcome!');
    } catch (x) { setEr(x.message); }
    setBusy(false);
  };

  const form = (
    <View style={{ width: '100%', maxWidth: 420 }}>
      {!wide && (
        <TouchableOpacity onPress={() => nav('home')} style={{ alignItems: 'center', marginBottom: 18 }}><Shield size={50} /></TouchableOpacity>
      )}
      <Text style={{ color: c.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 }}>{reg ? 'Create your account' : 'Welcome back'}</Text>
      <Text style={[s.muted, { marginTop: 6, marginBottom: 26 }]}>{reg ? 'Register to start reserving helmet storage slots.' : 'Log in to manage your reservations.'}</Text>
      {reg && <Field label="Full name" icon="person-outline" value={f.n} onChangeText={set('n')} autoCapitalize="words" placeholder="Juan Dela Cruz" />}
      <Field label="Email" icon="mail-outline" value={f.e} onChangeText={set('e')} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" />
      <Field label="Password" icon="lock-closed-outline" secure value={f.p} onChangeText={set('p')} placeholder="At least 8 characters" onSubmitEditing={reg ? undefined : submit} />
      {reg && <Field label="Confirm password" icon="lock-closed-outline" secure value={f.c} onChangeText={set('c')} placeholder="Repeat password" onSubmitEditing={submit} />}
      {er ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginBottom: 14 }}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={{ color: c.bad, flex: 1, fontWeight: '600' }}>{er}</Text></View> : null}
      <Btn full label={busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'} icon={busy ? undefined : 'arrow-forward'} onPress={busy ? undefined : submit} />
      <Text style={{ color: c.muted, textAlign: 'center', marginTop: 22 }}>
        {reg ? 'Already registered? ' : 'Need an account? '}
        <Text onPress={() => nav(reg ? 'login' : 'register')} style={{ color: c.gold, fontWeight: '700' }}>{reg ? 'Log in' : 'Register'}</Text>
      </Text>
      <Text onPress={() => nav('home')} style={{ color: c.muted, textAlign: 'center', marginTop: 14, fontSize: 13 }}>← Back to home</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: c.bg }}>
      {wide && (
        <View style={{ flex: 1, overflow: 'hidden', justifyContent: 'space-between', padding: 48 }}>
          <Gradient id="authbg" from="#08122b" to="#17397f" />
          <View style={{ position: 'absolute', right: -100, bottom: -100, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(212,160,23,0.12)' }} />
          <TouchableOpacity onPress={() => nav('home')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Shield size={38} /><Text style={{ color: '#fff', fontWeight: '800', fontSize: 19, letterSpacing: 0.6 }}>SHSRS</Text></TouchableOpacity>
          <View>
            <Text style={{ color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, lineHeight: 46 }}>Your helmet, <Text style={{ color: GOLD }}>safe</Text> and always within reach.</Text>
            <Text style={{ color: '#aebbd8', fontSize: 16.5, lineHeight: 26, marginTop: 16, maxWidth: 440 }}>Reserve a cabinet slot, receive a personal QR code and unlock your storage in one scan.</Text>
          </View>
          <Text style={{ color: '#6c80ab', fontSize: 12.5 }}>© 2026 Helmet Reservation Storage System</Text>
        </View>
      )}
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">{form}</ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ============================== dashboard ============================== */
function Stat({ icon, value, label, tone }) {
  const { c, s } = useApp();
  return (
    <View style={[s.card, { flexGrow: 1, flexBasis: 210, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16 }]}>
      <IconBox icon={icon} tone={tone} size={52} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.6 }}>{value}</Text>
        <Text style={s.muted}>{label}</Text>
      </View>
    </View>
  );
}

function Dashboard() {
  const { db, me, mine, nav, s, c, wide } = useApp();
  const r = mine(); const up = r.filter((x) => !isPast(x)); const nx = up[0];
  const freeToday = 12 - new Set(db.res.filter((x) => x.date === today()).map((x) => x.slot)).size;
  const recent = db.log.filter((x) => x.uid === db.me).slice().reverse().slice(0, 4);
  return (
    <Layout cur="dashboard" title={`${greet()}, ${me.name.split(' ')[0]}`} subtitle="Here's what's happening with your helmet storage.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <Stat icon="calendar-outline" value={up.length} label="Upcoming reservations" />
        <Stat icon="lock-open-outline" value={freeToday} label="Slots free today" tone="ok" />
        <Stat icon="time-outline" value={nx ? `Slot ${nx.slot}` : 'None'} label={nx ? `${fd(nx.date)}, ${ft(nx.time)}` : 'Next reservation'} tone="gold" />
      </View>
      {nx && nx.date === today() && (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.goldBg, borderRadius: 14, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: c.gold }}>
          <Ionicons name="notifications" size={20} color={c.gold} />
          <Text style={{ color: c.text, flex: 1, fontWeight: '600' }}>Reminder: Slot {nx.slot} is reserved today at {ft(nx.time)}.</Text>
        </View>
      )}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1.2 : undefined, width: wide ? undefined : '100%' }}>
          <View style={{ borderRadius: 20, overflow: 'hidden', padding: 26, marginBottom: 18 }}>
            <Gradient id="nx" from="#0B1B3A" to="#1b3f8a" />
            <Text style={{ color: '#f1d27a', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.6 }}>NEXT RESERVATION</Text>
            {nx ? (
              <>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 }}>Slot {nx.slot}</Text>
                <Text style={{ color: '#aebbd8', marginTop: 4, fontSize: 15 }}>{fd(nx.date)} · {ft(nx.time)}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                  <Btn variant="gold" icon="qr-code-outline" label="Show QR code" onPress={() => nav('qr', nx.id)} />
                  <Btn variant="ghostDark" icon="calendar-outline" label="Manage" onPress={() => nav('reservations')} />
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 8 }}>No upcoming reservation</Text>
                <Text style={{ color: '#aebbd8', marginTop: 6, marginBottom: 18 }}>Pick a slot, date and time to get your QR code.</Text>
                <Btn variant="gold" icon="add" label="Reserve a slot" onPress={() => nav('reservations')} />
              </>
            )}
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Recent cabinet activity</Text>
            <Text style={[s.cardSub, { marginBottom: 6 }]}>Your latest store and retrieve actions.</Text>
            <LogList list={recent} />
          </View>
        </View>
      </View>
    </Layout>
  );
}

/* ============================== reservations ============================== */
function Reservations() {
  const { db, refresh, me, mine, nav, toast, s, c, wide } = useApp();
  const [sel, setSel] = useState(0);
  const [rd, setRd] = useState(''); const [rt, setRt] = useState('');
  const [qi, setQi] = useState(''); const [q, setQ] = useState('');
  const [er, setEr] = useState('');
  const [edit, setEdit] = useState(null);
  const [nd, setNd] = useState(''); const [nt, setNt] = useState(''); const [er3, setEr3] = useState('');

  const taken = new Set(rd ? db.res.filter((r) => r.date === rd).map((r) => r.slot) : []);
  const eff = db.blocked.includes(sel) || taken.has(sel) ? 0 : sel;
  const rows = mine().filter((r) => `slot ${r.slot} ${r.date} ${fd(r.date)} ${ft(r.time)}`.toLowerCase().includes(q.toLowerCase()));

  const book = async () => {
    if (!eff) return setEr('Please select a slot.');
    if (!rd) return setEr('Please choose a date.');
    if (!rt) return setEr('Please choose a time.');
    if (dt(rd, rt) < new Date()) return setEr('Please choose a future date and time.');
    try {
      const r = await api('POST', '/api/reservations', { slot: eff, date: rd, time: rt });
      await refresh();
      toast(`Slot ${eff} reserved for ${fd(rd)}.`);
      setSel(0); setRd(''); setRt(''); setEr('');
      nav('qr', r.id);
    } catch (x) { setEr(x.message); refresh().catch(() => {}); }
  };

  const cancel = (id) => confirmBox('Cancel reservation', 'Cancel this reservation?', 'Yes, cancel', async () => {
    try { await api('DELETE', '/api/reservations/' + id); await refresh(); toast('Reservation cancelled.'); } catch (x) { toast(x.message); }
  });

  const openEdit = (r) => { setEdit(r); setNd(r.date); setNt(r.time); setEr3(''); };
  const saveEdit = async () => {
    if (!nd || !nt) return setEr3('Choose a date and time.');
    if (dt(nd, nt) < new Date()) return setEr3('Choose a future date and time.');
    try { await api('PUT', '/api/reservations/' + edit.id, { date: nd, time: nt }); await refresh(); setEdit(null); toast('Reservation rescheduled.'); }
    catch (x) { setEr3(x.message); }
  };

  const pdf = async () => {
    const r = mine();
    if (!r.length) return toast('No reservations to export.');
    const td = 'style="padding:10px;border-bottom:1px solid #e3e8f2"';
    const html = `<html><body style="font-family:Helvetica,Arial;padding:32px;color:#0f172a"><div style="border-bottom:3px solid #d4a017;padding-bottom:12px;margin-bottom:18px"><h2 style="margin:0;color:#0b1b3a">Helmet Reservation Storage System</h2><p style="margin:6px 0 0;color:#64748b">Reservations for ${esc(me.name)} (${esc(me.email)}) · Generated ${esc(new Date().toLocaleString())}</p></div><table style="width:100%;border-collapse:collapse"><thead><tr>${['ID', 'Slot', 'Date', 'Time', 'Status'].map((h) => `<th style="text-align:left;padding:10px;background:#0b1b3a;color:#fff">${h}</th>`).join('')}</tr></thead><tbody>${r.map((x) => `<tr><td ${td}>#${x.id}</td><td ${td}>Slot ${x.slot}</td><td ${td}>${fd(x.date)}</td><td ${td}>${ft(x.time)}</td><td ${td}>${isPast(x) ? 'Completed' : 'Upcoming'}</td></tr>`).join('')}</tbody></table></body></html>`;
    try { await sharePdf(html, toast); } catch (e) { toast('Could not create the PDF.'); }
  };

  return (
    <Layout cur="reservations" title="Reservations" subtitle="Book a cabinet slot and manage your reservations.">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ width: wide ? 440 : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>1 · Select a slot</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Choose any available cabinet slot.</Text>
            <SlotGrid taken={taken} blocked={db.blocked} sel={eff} onSel={setSel} />
            <Text style={s.cardTitle}>2 · Pick date &amp; time</Text>
            <Text style={[s.cardSub, { marginBottom: 12 }]}>Availability updates for the date you choose.</Text>
            <DateTimeFields date={rd} time={rt} onDate={setRd} onTime={setRt} />
            {er ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginTop: 14 }}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={{ color: c.bad, flex: 1, fontWeight: '600' }}>{er}</Text></View> : null}
            <View style={{ marginTop: 18 }}><Btn full icon="checkmark-circle-outline" label="Confirm booking" onPress={book} /></View>
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
              <View><Text style={s.cardTitle}>Current reservations</Text><Text style={s.cardSub}>{rows.length} shown</Text></View>
              <Btn small variant="outline" icon="download-outline" label="PDF" onPress={pdf} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Ionicons name="search-outline" size={17} color={c.muted} style={{ position: 'absolute', left: 13, zIndex: 1 }} />
                <TextInput style={[s.input, { paddingLeft: 38 }]} placeholder="Search slot or date…" placeholderTextColor={c.muted} value={qi} onChangeText={setQi} onSubmitEditing={() => setQ(qi)} returnKeyType="search" />
              </View>
              <Btn variant="soft" label="Search" onPress={() => setQ(qi)} />
            </View>
            {rows.length ? rows.map((r) => (
              <View key={r.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, marginBottom: 10, backgroundColor: c.soft, flexDirection: 'row', overflow: 'hidden' }}>
                <View style={{ width: 5, backgroundColor: isPast(r) ? c.line : GOLD }} />
                <View style={{ flex: 1, padding: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>Slot {r.slot} <Text style={{ color: c.muted, fontWeight: '600', fontSize: 13 }}> #{r.id}</Text></Text>
                    <View style={s.row}>{r.stored ? <Tag kind="gold" text="Stored" /> : null}<Tag kind={isPast(r) ? 'mute' : 'ok'} text={isPast(r) ? 'Completed' : 'Upcoming'} /></View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={s.row}><Ionicons name="calendar-outline" size={14} color={c.muted} /><Text style={s.muted}>{fd(r.date)}</Text></View>
                    <View style={s.row}><Ionicons name="time-outline" size={14} color={c.muted} /><Text style={s.muted}>{ft(r.time)}</Text></View>
                  </View>
                  <View style={[s.row, { marginTop: 12 }]}>
                    <Btn small variant="outline" icon="qr-code-outline" label="QR" onPress={() => nav('qr', r.id)} />
                    {!isPast(r) && <Btn small variant="outline" icon="create-outline" label="Reschedule" onPress={() => openEdit(r)} />}
                    <Btn small variant="outline" icon="trash-outline" onPress={() => cancel(r.id)} />
                  </View>
                </View>
              </View>
            )) : (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <IconBox icon="calendar-outline" tone="gold" size={56} />
                <Text style={s.empty}>{q ? 'No reservations match your search.' : 'No reservations yet.\nPick a slot, date and time to get started.'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <InfoModal visible={!!edit} title={edit ? `Reschedule Slot ${edit.slot}` : ''} onClose={() => setEdit(null)}>
        <DateTimeFields date={nd} time={nt} onDate={setNd} onTime={setNt} />
        {er3 ? <Text style={[s.err, { marginTop: 10 }]}>{er3}</Text> : null}
        <View style={{ marginTop: 16 }}><Btn full label="Save changes" onPress={saveEdit} /></View>
      </InfoModal>
    </Layout>
  );
}

/* ============================== QR ============================== */
function QRScreen({ id }) {
  const { mine, nav, toast, s, c } = useApp();
  const r = mine();
  const x = id ? r.find((v) => v.id === id) : r.filter((v) => !isPast(v))[0] || r[r.length - 1];
  const ref = useRef(null);
  const value = x ? `SHSRS|R${x.id}|S${x.slot}|${x.date}|${x.time}|${x.uid}` : '';

  const download = () => {
    if (!ref.current) return;
    ref.current.toDataURL(async (b64) => {
      if (WEB) {
        const a = document.createElement('a');
        a.href = 'data:image/png;base64,' + b64; a.download = `reservation-${x.id}-qr.png`;
        document.body.appendChild(a); a.click(); a.remove();
        return toast('QR code download started.');
      }
      const html = `<html><body style="font-family:Helvetica,Arial;text-align:center;padding:40px;color:#0f172a"><h2 style="color:#0b1b3a">Helmet Reservation Storage System</h2><img src="data:image/png;base64,${b64}" width="300" height="300"/><h1>Reservation #${x.id}</h1><p>Slot ${x.slot} · ${fd(x.date)} · ${ft(x.time)}</p></body></html>`;
      try { await sharePdf(html, toast); } catch (e) { toast('Could not save the QR code.'); }
    });
  };
  const share = async () => {
    await shareText(`My helmet storage reservation: Slot ${x.slot}, ${fd(x.date)} at ${ft(x.time)} (ID ${x.id}).`, toast, 'Helmet Reservation');
  };
  const Info = ({ label, value: v }) => (
    <View style={{ flex: 1, minWidth: 90 }}><Text style={{ color: c.muted, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.8 }}>{label}</Text><Text style={{ color: c.text, fontSize: 16, fontWeight: '800', marginTop: 3 }}>{v}</Text></View>
  );

  return (
    <Layout cur="qr" title="QR Code" subtitle="Show this pass at the cabinet scanner.">
      {!x ? (
        <View style={[s.card, { alignItems: 'center', padding: 36 }]}>
          <IconBox icon="qr-code-outline" tone="gold" size={60} />
          <Text style={s.empty}>You have no reservations yet, so there is no QR code to show.</Text>
          <Btn label="Make a reservation" onPress={() => nav('reservations')} />
        </View>
      ) : (
        <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <View style={{ backgroundColor: c.card, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.line, ...lift(c.dark, true) }}>
            <View style={{ padding: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
              <Gradient id="tk" from="#08122b" to="#17397f" />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Shield size={30} /><View><Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Access Pass</Text><Text style={{ color: '#8fa3cc', fontSize: 12 }}>Helmet Storage</Text></View></View>
              <Tag kind={isPast(x) ? 'mute' : 'gold'} text={isPast(x) ? 'COMPLETED' : x.stored ? 'STORED' : 'VALID'} />
            </View>
            <View style={{ alignItems: 'center', padding: 26 }}>
              <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#e3e8f2' }}>
                <QRCode value={value} size={210} getRef={(r2) => (ref.current = r2)} />
              </View>
              <Text style={{ color: c.muted, marginTop: 14, fontSize: 13 }}>Scan this code at the cabinet to unlock it.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 14, height: 28, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: c.bg, borderWidth: 1, borderLeftWidth: 0, borderColor: c.line }} />
              <View style={{ flex: 1, borderTopWidth: 2, borderStyle: 'dashed', borderColor: c.line }} />
              <View style={{ width: 14, height: 28, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, backgroundColor: c.bg, borderWidth: 1, borderRightWidth: 0, borderColor: c.line }} />
            </View>
            <View style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 22 }}>
                <Info label="RESERVATION" value={`#${x.id}`} /><Info label="SLOT" value={`Slot ${x.slot}`} />
                <Info label="DATE" value={fd(x.date)} /><Info label="TIME" value={ft(x.time)} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Btn style={{ flex: 1 }} variant="primary" icon="download-outline" label="Download" onPress={download} />
                <Btn style={{ flex: 1 }} variant="outline" icon="share-social-outline" label="Share" onPress={share} />
              </View>
            </View>
          </View>
        </View>
      )}
    </Layout>
  );
}

/* ============================== guide ============================== */
function Guide() {
  const { s, c } = useApp();
  const steps = [
    ['walk-outline', 'Go to your reserved storage cabinet', 'Head to the cabinet area at your reserved time.'],
    ['qr-code-outline', 'Scan the QR code on the cabinet scanner', 'Hold your QR pass in front of the scanner.'],
    ['lock-open-outline', 'Cabinet will automatically unlock', 'Your slot opens up to 30 minutes before your reserved time.'],
    ['shield-checkmark-outline', 'Store or retrieve your helmet safely', 'Close the door — scanning again toggles between storing and retrieving.'],
  ];
  return (
    <Layout cur="guide" title="Cabinet Access Guide" subtitle="How to use your reserved storage cabinet.">
      <View style={[s.card, { maxWidth: 720 }]}>
        <Text style={s.eyebrow}>How to use</Text>
        <Text style={{ color: c.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 4, marginBottom: 22 }}>Four steps to your helmet</Text>
        {steps.map(([ico, t, d], i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={ico} size={20} color={c.onPrimary} /></View>
              {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, minHeight: 24, backgroundColor: c.line, marginVertical: 4 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 22, paddingTop: 2 }}>
              <Text style={{ color: c.gold, fontWeight: '800', fontSize: 12, letterSpacing: 1 }}>STEP {i + 1}</Text>
              <Text style={{ color: c.text, fontWeight: '700', fontSize: 16, marginTop: 2 }}>{t}</Text>
              <Text style={[s.muted, { marginTop: 4, lineHeight: 20 }]}>{d}</Text>
            </View>
          </View>
        ))}
      </View>
    </Layout>
  );
}

/* ============================== scanner ============================== */
function LogList({ list, who }) {
  const { db, s, c } = useApp();
  if (!list.length) return <Text style={s.empty}>No cabinet activity yet.</Text>;
  const nm = (id) => (db.users.find((x) => x.id === id) || { name: 'Deleted user' }).name;
  return list.map((x, i) => (
    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderColor: c.line }}>
      <IconBox icon={x.act === 'Stored' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} tone={x.act === 'Stored' ? 'gold' : 'primary'} size={40} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.text, fontWeight: '600' }}>Reservation #{x.rid} · Slot {x.slot}{who ? ` · ${nm(x.uid)}` : ''}</Text>
        <Text style={s.muted}>{stamp(x.ts)}</Text>
      </View>
      <Tag kind={x.act === 'Stored' ? 'gold' : 'mute'} text={x.act} />
    </View>
  ));
}

function Scan() {
  const { db, refresh, mine, s, c, wide } = useApp();
  const [v, setV] = useState('');
  const [res, setRes] = useState(null);
  const [cam, setCam] = useState(false);
  const [perm, askPerm] = useCameraPermissions();
  const lock = useRef(false);
  const up = mine().filter((r) => !isPast(r) || r.date === today());
  const log = db.log.filter((x) => x.uid === db.me).slice().reverse();

  const doScan = async (raw) => {
    try {
      const r = await api('POST', '/api/scan', { code: String(raw) });
      setRes({ ok: r.ok, title: r.title, msg: r.msg });
      await refresh();
    } catch (x) { setRes({ ok: false, title: 'Error', msg: x.message }); }
  };
  const onCode = ({ data }) => {
    if (lock.current) return;
    lock.current = true; setCam(false); setV(data); doScan(data);
    setTimeout(() => { lock.current = false; }, 1500);
  };
  const openCam = async () => {
    if (!perm?.granted) { const p = await askPerm(); if (!p.granted) return setRes({ ok: false, title: 'Camera blocked', msg: 'Allow camera access to scan, or enter the ID manually.' }); }
    setRes(null); setCam(true);
  };

  return (
    <Layout cur="scan" title="Cabinet Scanner" subtitle="Scan your QR pass to unlock your slot.">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Scan your QR code</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Use the camera, or enter a reservation ID to simulate the cabinet reader.</Text>
            {cam ? (
              <View style={{ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: GOLD }}>
                <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onCode} />
              </View>
            ) : null}
            <Btn full icon={cam ? 'close' : 'camera-outline'} label={cam ? 'Close camera' : 'Scan with camera'} onPress={() => (cam ? setCam(false) : openCam())} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 18 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.line }} /><Text style={{ color: c.muted, fontSize: 12.5, fontWeight: '600' }}>OR ENTER MANUALLY</Text><View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Reservation ID or QR text" placeholderTextColor={c.muted} value={v} onChangeText={setV} autoCapitalize="none" onSubmitEditing={() => doScan(v)} />
              <Btn variant="soft" icon="scan-outline" label="Scan" onPress={() => doScan(v)} />
            </View>
            {up.length ? (
              <View style={[s.row, { marginTop: 12 }]}>
                {up.map((r) => <Btn key={r.id} small variant="outline" label={`#${r.id} · Slot ${r.slot}`} onPress={() => { setV(String(r.id)); doScan(r.id); }} />)}
              </View>
            ) : null}
            {res ? (
              <View style={{ marginTop: 20, padding: 20, borderRadius: 16, backgroundColor: res.ok ? c.okBg : c.badBg, alignItems: 'center', gap: 4 }}>
                <Ionicons name={res.ok ? 'checkmark-circle' : 'close-circle'} size={44} color={res.ok ? c.ok : c.bad} />
                <Text style={{ color: res.ok ? c.ok : c.bad, fontWeight: '800', fontSize: 17 }}>{res.title}</Text>
                <Text style={[s.muted, { textAlign: 'center', color: res.ok ? c.ok : c.bad }]}>{res.msg}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}><Text style={s.cardTitle}>Cabinet activity</Text><Text style={[s.cardSub, { marginBottom: 6 }]}>Your store and retrieve history.</Text><LogList list={log} /></View>
        </View>
      </View>
    </Layout>
  );
}

/* ============================== profile ============================== */
function Profile() {
  const { me, refresh, logout, toast, s, c, wide } = useApp();
  const [n, setN] = useState(me.name); const [e, setE] = useState(me.email); const [er, setEr] = useState('');
  const [cp, setCp] = useState(''); const [np, setNp] = useState(''); const [cf, setCf] = useState(''); const [er2, setEr2] = useState('');

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true });
    if (r.canceled || !r.assets?.[0]?.base64) return;
    try { await api('PUT', '/api/me/photo', { photo: 'data:image/jpeg;base64,' + r.assets[0].base64 }); await refresh(); toast('Profile photo updated.'); }
    catch (x) { toast(x.message); }
  };
  const rm = async () => { try { await api('PUT', '/api/me/photo', { photo: '' }); await refresh(); } catch (x) { toast(x.message); } };
  const saveProf = async () => {
    const em = e.trim().toLowerCase();
    if (!n.trim()) return setEr('Name is required.');
    if (!okMail(em)) return setEr('Enter a valid email address.');
    try { await api('PUT', '/api/me', { name: n.trim(), email: em }); await refresh(); setEr(''); toast('Profile saved.'); }
    catch (x) { setEr(x.message); }
  };
  const savePw = async () => {
    if (np.length < 8) return setEr2('New password must be at least 8 characters.');
    if (np !== cf) return setEr2('Passwords do not match.');
    try { await api('PUT', '/api/me/password', { current: cp, next: np }); setCp(''); setNp(''); setCf(''); setEr2(''); toast('Password updated.'); }
    catch (x) { setEr2(x.message); }
  };
  const del = () => confirmBox('Delete account', 'Delete your account and all reservations? This cannot be undone.', 'Delete', async () => {
    try { await api('DELETE', '/api/me'); logout(); } catch (x) { toast(x.message); }
  });

  return (
    <Layout cur="profile" title="Profile" subtitle="Manage your account details and security.">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Profile information</Text>
            <Text style={[s.cardSub, { marginBottom: 18 }]}>Update your account's profile information and email address.</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 20 }}>
              <Avatar u={me} size={84} ring />
              <View style={{ gap: 8 }}>
                <Btn small variant="outline" icon="image-outline" label="Upload photo" onPress={pick} />
                {me.photo ? <Btn small variant="outline" label="Remove photo" onPress={rm} /> : null}
              </View>
            </View>
            <Field label="Name" icon="person-outline" value={n} onChangeText={setN} autoCapitalize="words" />
            <Field label="Email" icon="mail-outline" value={e} onChangeText={setE} keyboardType="email-address" />
            {er ? <Text style={s.err}>{er}</Text> : null}
            <Btn label="Save changes" onPress={saveProf} />
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Update password</Text>
            <Text style={[s.cardSub, { marginBottom: 18 }]}>Use a long, random password to stay secure.</Text>
            <Field label="Current password" icon="lock-closed-outline" secure value={cp} onChangeText={setCp} />
            <Field label="New password" icon="key-outline" secure value={np} onChangeText={setNp} />
            <Field label="Confirm password" icon="key-outline" secure value={cf} onChangeText={setCf} />
            {er2 ? <Text style={s.err}>{er2}</Text> : null}
            <Btn label="Update password" onPress={savePw} />
          </View>
          <View style={[s.card, { borderColor: c.bad }]}>
            <Text style={[s.cardTitle, { color: c.bad }]}>Delete account</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Permanently deletes your account and all your reservations.</Text>
            <Btn variant="danger" icon="trash-outline" label="Delete account" onPress={del} />
          </View>
        </View>
      </View>
    </Layout>
  );
}

/* ============================== admin ============================== */
function Admin() {
  const { db, refresh, toast, s, c, wide } = useApp();
  const R = db.res.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const nm = (id) => (db.users.find((x) => x.id === id) || { name: 'Deleted user' }).name;
  const block = async (n) => { try { await api('PUT', `/api/admin/slots/${n}/toggle`); await refresh(); } catch (x) { toast(x.message); } };
  const adm = (id) => confirmBox('Cancel reservation', 'Cancel this reservation?', 'Yes, cancel', async () => {
    try { await api('DELETE', '/api/admin/reservations/' + id); await refresh(); toast('Reservation cancelled.'); } catch (x) { toast(x.message); }
  });
  const exportCSV = async () => {
    const q = (x) => '"' + String(x).replace(/"/g, '""') + '"';
    const csv = ['ID,Rider,Slot,Date,Time,Stored', ...db.res.map((r) => [r.id, q(nm(r.uid)), r.slot, r.date, r.time, r.stored ? 'yes' : 'no'].join(','))].join('\n');
    if (WEB) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'reservations.csv';
      document.body.appendChild(a); a.click(); a.remove();
      return toast('CSV download started.');
    }
    await shareText(csv, toast, 'reservations.csv');
  };
  return (
    <Layout cur="admin" title="Admin Panel" subtitle="Manage slots, reservations, users and cabinet access.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <Stat icon="people-outline" value={db.users.length} label="Registered users" />
        <Stat icon="calendar-outline" value={R.filter((r) => !isPast(r)).length} label="Upcoming reservations" tone="ok" />
        <Stat icon="construct-outline" value={db.blocked.length} label="Slots in maintenance" tone="gold" />
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ width: wide ? 440 : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Slot maintenance</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Tap a slot to block or unblock it. Blocked slots cannot be booked.</Text>
            <SlotGrid admin taken={new Set()} blocked={db.blocked} onAdminTap={block} />
          </View>
          <View style={s.card}>
            <Text style={s.cardTitle}>Users</Text>
            <Text style={[s.cardSub, { marginBottom: 6 }]}>{db.users.length} registered</Text>
            {db.users.map((u, i) => (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === db.users.length - 1 ? 0 : 1, borderColor: c.line }}>
                <Avatar u={u} size={38} />
                <View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '600' }}>{u.name}</Text><Text style={s.muted}>{u.email}</Text></View>
                <Tag kind={u.admin ? 'gold' : 'mute'} text={u.admin ? 'Admin' : 'Rider'} />
              </View>
            ))}
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
              <View><Text style={s.cardTitle}>All reservations</Text><Text style={s.cardSub}>{R.length} total</Text></View>
              <Btn small variant="outline" icon="download-outline" label="Export CSV" onPress={exportCSV} />
            </View>
            {R.length ? R.map((r, i) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: i === R.length - 1 ? 0 : 1, borderColor: c.line }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '700' }}>Slot {r.slot} · {nm(r.uid)} <Text style={{ color: c.muted, fontWeight: '500' }}>#{r.id}</Text></Text>
                  <Text style={s.muted}>{fd(r.date)} · {ft(r.time)}</Text>
                  <View style={[s.row, { marginTop: 6 }]}>{r.stored ? <Tag kind="gold" text="Stored" /> : null}<Tag kind={isPast(r) ? 'mute' : 'ok'} text={isPast(r) ? 'Completed' : 'Upcoming'} /></View>
                </View>
                <Btn small variant="outline" icon="trash-outline" onPress={() => adm(r.id)} />
              </View>
            )) : <Text style={s.empty}>No reservations yet.</Text>}
          </View>
          <View style={s.card}><Text style={s.cardTitle}>Cabinet access log</Text><Text style={[s.cardSub, { marginBottom: 6 }]}>Every store and retrieve event.</Text><LogList who list={db.log.slice().reverse()} /></View>
        </View>
      </View>
    </Layout>
  );
}

/* ============================== root ============================== */
export default function App() {
  return <SafeAreaProvider><Root /></SafeAreaProvider>;
}

const EMPTY = { me: null, users: [], res: [], blocked: [], log: [] };

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
      TOKEN = t;
      if (t) {
        try { const d = await api('GET', '/api/data'); setDb(d); setRoute({ n: 'dashboard', arg: null }); return; }
        catch (e) { if (/reach/i.test(e.message)) throw e; TOKEN = null; AsyncStorage.removeItem(TOKEN_KEY); }
      } else { await api('GET', '/api/health'); }
      setDb(EMPTY);
    } catch (e) { setNetErr(e.message); }
  };
  useEffect(() => { boot(); }, []);
  useEffect(() => { if (TOKEN) api('GET', '/api/data').then(setDb).catch(() => {}); }, [route.n]);

  if (netErr) {
    return (
      <View style={{ flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', padding: 28 }}>
        <View style={{ maxWidth: 460, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 26, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
          <Shield size={44} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Server not reachable</Text>
          <Text style={{ color: '#fca5a5' }}>{netErr}</Text>
          <Text style={{ color: '#9fb1d6', lineHeight: 21 }}>Make sure XAMPP MySQL is running, `npm start` is running in the server folder, and PC_IP in App.js is your PC's Wi-Fi address (phone and PC on the same Wi-Fi).</Text>
          <TouchableOpacity onPress={boot} style={{ backgroundColor: GOLD, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}><Text style={{ fontWeight: '800', color: '#1a1304' }}>Retry</Text></TouchableOpacity>
        </View>
      </View>
    );
  }
  if (!db) return <View style={{ flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', gap: 16 }}><Shield size={56} /><ActivityIndicator color={GOLD} /></View>;

  const nav = (n, arg = null) => setRoute({ n, arg });
  const toast = (m) => { setMsg(m); clearTimeout(timer.current); timer.current = setTimeout(() => setMsg(''), 2800); };
  const signIn = async (tok) => { TOKEN = tok; await AsyncStorage.setItem(TOKEN_KEY, tok); await refresh(); nav('dashboard'); };
  const logout = () => { TOKEN = null; AsyncStorage.removeItem(TOKEN_KEY); setDb(EMPTY); nav('home'); };
  const me = db.users.find((u) => u.id === db.me);
  const dark = (theme || sys) === 'dark';
  const c = dark ? DARK : LIGHT;
  const s = mk(c);
  const wide = width >= 900;
  const mine = () => db.res.filter((r) => r.uid === db.me).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const toggleTheme = () => { const n = dark ? 'light' : 'dark'; setTheme(n); AsyncStorage.setItem(THEME_KEY, n); };

  let n = route.n;
  if (PROTECTED.includes(n) && !me) n = 'login';
  if ((n === 'login' || n === 'register') && me) n = 'dashboard';
  if (n === 'admin' && me && !me.admin) n = 'dashboard';

  const screens = {
    home: <Home />, login: <Auth reg={false} key="l" />, register: <Auth reg key="r" />,
    dashboard: me && <Dashboard />, reservations: me && <Reservations />, qr: me && <QRScreen id={route.arg} key={route.arg || 'q'} />,
    scan: me && <Scan />, guide: me && <Guide />, profile: me && <Profile />, admin: me && <Admin />,
  };

  const ctx = { db, refresh, signIn, nav, toast, me, c, s, mine, logout, toggleTheme, setInfo, wide, width };
  const manual = [
    ['1', 'Register', 'Create an account with your name, email and a password of at least 8 characters.'],
    ['2', 'Reserve', 'Choose one of 12 cabinet slots, pick the date and time, then confirm your booking.'],
    ['3', 'Get your QR code', 'Open the QR Code tab. Every reservation has its own unique code.'],
    ['4', 'Scan', 'Scan the code at the cabinet scanner to unlock your slot, then store or retrieve your helmet.'],
    ['5', 'Manage', 'Search, reschedule or cancel reservations, and export the list as a PDF.'],
  ];
  return (
    <Ctx.Provider value={ctx}>
      <StatusBar barStyle={n === 'home' || n === 'login' || n === 'register' ? (n === 'home' ? 'light-content' : dark ? 'light-content' : 'dark-content') : 'light-content'} />
      {screens[n] || <Home />}
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
