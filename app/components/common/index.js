import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { NAVY, NAVY2, GOLD, lift, NAV, ADMIN_NAV, SLOTS, WEB } from '../../shared/constants/theme';
import { today, dt, fd, ft, hm, ymd, stamp } from '../../shared/utils/date';
import AdminSidebar from '../admin/AdminSidebar';
import FinanceSidebar from '../finance/FinanceSidebar';
import RiderSidebar from '../rider/RiderSidebar';
import AdminHeader from '../admin/AdminHeader';
import FinanceHeader from '../finance/FinanceHeader';
import RiderHeader from '../rider/RiderHeader';
import FinanceProfile from '../../screens/finance/FinanceProfile';

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
  const Sidebar = me.finance ? FinanceSidebar : me.admin ? AdminSidebar : RiderSidebar;
  const Header = me.finance ? FinanceHeader : me.admin ? AdminHeader : RiderHeader;
  const items = me.finance ? [['finance', 'wallet-outline', 'Finance', 'Finance']] : me.admin ? ADMIN_NAV : NAV;

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
            {me.finance ? <FinanceProfile user={me} Avatar={Avatar} c={c} /> : (
              <>
                <Avatar u={me} size={38} />
                <View><Text style={{ color: c.text, fontWeight: '700' }}>{me.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{me.email}</Text></View>
              </>
            )}
          </View>
          <View style={[s.divider, { marginVertical: 4 }]} />
          {[...(me.finance ? [] : [['person-outline', 'Profile', () => nav('profile')]]), [c.dark ? 'sunny-outline' : 'moon-outline', c.dark ? 'Light mode' : 'Dark mode', toggleTheme], ['log-out-outline', 'Log out', logout]].map(([ico, label, fn]) => (
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
            <Sidebar cur={cur} nav={nav} />
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
          <Header title={title} subtitle={subtitle} s={s} c={c} />
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

export { Shield, Gradient, Btn, Field, Tag, Avatar, IconBox, InfoModal, DateTimeFields, SlotGrid, Layout, Stat, LogList };
