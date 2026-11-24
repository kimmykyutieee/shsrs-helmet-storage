import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Pressable, ScrollView, StyleSheet, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../shared/hooks/useApp';
import { NAVY, NAVY2, GOLD, lift, NAV, ADMIN_NAV, FINANCE_NAV, SECURITY_NAV, SLOTS, WEB } from '../shared/constants/theme';
import { today, dt, fd, ft, hm, ymd, stamp } from '../shared/utils/date';
import AdminSidebar from './AdminSidebar';
import FinanceSidebar from './FinanceSidebar';
import RiderSidebar from './RiderSidebar';
import SecuritySidebar from './SecuritySidebar';
import AdminHeader from './AdminHeader';
import FinanceHeader from './FinanceHeader';
import RiderHeader from './RiderHeader';
import RoleHeader from './RoleHeader';
import FinanceProfile from '../screens/finance/FinanceProfile';
import { staticStyles, dynamicStyles, buttonVariant, tagColors, iconBoxColors } from './common.styles';

let headerRefreshInFlight = false;

function Shield({ size = 40 }) {
  return <Image source={require('../assets/helmet-logo.png')} style={{ width: size, height: size }} resizeMode="contain" fadeDuration={0} accessibilityLabel="HelMate logo" />;
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

function Btn({ label, onPress, icon, variant = 'primary', small, style, full, fontFamily }) {
  const { c } = useApp();
  const V = buttonVariant(c, variant);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [dynamicStyles.indexPressable1({ V, full, pressed, small }), style]}>
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={V.fg} /> : null}
      {label ? <Text style={[dynamicStyles.indexText2({ V, small }), fontFamily ? { fontFamily } : null]}>{label}</Text> : null}
    </Pressable>
  );
}

function Field({ label, icon, secure, fontFamily, labelFontFamily, ...p }) {
  const { s, c } = useApp();
  const [show, setShow] = useState(false);
  return (
    <View style={s.fld}>
      {label ? <Text style={[s.label, labelFontFamily ? { fontFamily: labelFontFamily } : null]}>{label}</Text> : null}
      <View style={staticStyles.indexView3}>
        {icon ? <Ionicons name={icon} size={18} color={c.muted} style={staticStyles.indexIonicons4} /> : null}
        <TextInput style={[s.input, fontFamily ? { fontFamily } : null, icon && staticStyles.indexTextInput5, secure && staticStyles.indexTextInput6]} placeholderTextColor={c.muted} autoCapitalize="none" secureTextEntry={secure && !show} {...p} />
        {secure ? (
          <TouchableOpacity onPress={() => setShow(!show)} style={staticStyles.indexTouchableOpacity7}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function Tag({ text, kind = 'mute' }) {
  const { c } = useApp();
  const K = tagColors(c, kind);
  return <Text style={dynamicStyles.indexText8({ K })}>{text}</Text>;
}

function Avatar({ u, size = 36, ring }) {
  return (
    <View style={dynamicStyles.indexView9({ GOLD, NAVY2, ring, size })}>
      {u.photo ? <Image source={{ uri: u.photo }} style={dynamicStyles.indexImage10({ size })} />
        : <Text style={dynamicStyles.indexText11({ size })}>{u.name[0].toUpperCase()}</Text>}
    </View>
  );
}

function IconBox({ icon, tone = 'primary', size = 46 }) {
  const { c } = useApp();
  const { bg, fg } = iconBoxColors(c, tone);
  return <View style={dynamicStyles.indexView12({ bg, size })}><Ionicons name={icon} size={size * 0.46} color={fg} /></View>;
}

function InfoModal({ visible, title, onClose, children }) {
  const { c } = useApp();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={staticStyles.indexView13}>
        <View style={dynamicStyles.indexView14({ c, lift })}>
          <View style={staticStyles.indexView15}>
            <Text style={dynamicStyles.indexText16({ c })}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={c.muted} /></TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DateTimeFields({ date, time, onDate, onTime, dateOnly = false }) {
  const { s, c } = useApp();
  const [show, setShow] = useState(null);
  const ios = Platform.OS === 'ios';
  if (WEB) {
    const st = dynamicStyles.indexStyle62({ c });
    return (
      <View style={staticStyles.indexView17}>
        {React.createElement('input', { type: 'date', value: date, min: today(), onChange: (e) => onDate(e.target.value), style: st })}
        {        dateOnly ? null : React.createElement('input', { type: 'time', value: time, onChange: (e) => onTime(e.target.value), style: st })}
      </View>
    );
  }
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const renderBox = (k, text, ph, icon) => (
    <TouchableOpacity style={[s.input, staticStyles.indexTouchableOpacity18]} onPress={() => setShow(show === k ? null : k)}>
      <Ionicons name={icon} size={17} color={c.muted} />
      <Text style={dynamicStyles.indexText19({ c, text })}>{text || ph}</Text>
    </TouchableOpacity>
  );
  return (
    <View>
      <View style={staticStyles.indexView17}>
        {renderBox('d', date ? fd(date) : '', 'Select date', 'calendar-outline')}
        {!dateOnly ? renderBox('t', time ? ft(time) : '', 'Select time', 'time-outline') : null}
      </View>
      {show === 'd' && (
        <View style={staticStyles.indexDatePickerContainer}>
          <DateTimePicker value={date ? dt(date, '00:00') : new Date()} mode="date" minimumDate={midnight}
            display={ios ? 'inline' : 'default'} themeVariant="light"
            onChange={(e, v) => { if (!ios) setShow(null); if (e.type !== 'dismissed' && v) onDate(ymd(v)); }} />
        </View>
      )}
      {!dateOnly && show === 't' && (
        <DateTimePicker value={time ? dt(today(), time) : new Date()} mode="time"
          display={ios ? 'spinner' : 'default'} themeVariant="light"
          onChange={(e, v) => { if (!ios) setShow(null); if (e.type !== 'dismissed' && v) onTime(hm(v)); }} />
      )}
    </View>
  );
}

function SlotGrid({ taken, blocked, sel, onSel, admin, onAdminTap, reservationCounts = {} }) {
  const { c } = useApp();
  return (
    <View style={staticStyles.indexView21}>
      {SLOTS.map((n) => {
        const isBlocked = blocked.includes(n);
        const hasReservation = taken.has(n);
        const dis = !admin && (isBlocked || taken.has(n));
        const on = admin ? isBlocked : sel === n;
        const status = isBlocked ? 'Maintenance' : admin && hasReservation
          ? `${reservationCounts[n] || 0} reserved`
          : hasReservation ? 'Reserved' : 'Available';
        const fg = on ? c.onPrimary : dis ? c.muted : c.text;
        return (
          <Pressable key={n} disabled={dis} onPress={() => (admin ? onAdminTap(n) : onSel(n))}
            style={({ pressed }) => (dynamicStyles.indexPressable22({ c, dis, on, pressed }))}>
            <Ionicons name={isBlocked ? 'construct-outline' : hasReservation ? 'calendar-outline' : dis ? 'lock-closed-outline' : on ? 'checkmark-circle' : 'lock-open-outline'} size={18} color={fg} />
            <Text style={dynamicStyles.indexText23({ dis, fg, isBlocked })}>Locker {n}</Text>
            <Text style={dynamicStyles.indexText24({ c, on })}>{status}</Text>
            {admin && isBlocked && hasReservation ? <Text style={dynamicStyles.indexText24({ c, on: false })}>{reservationCounts[n]} reserved</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/* ============================== layout (sidebar on desktop · tab bar on phone) ============================== */
function Layout({ cur, title, subtitle, children, onRefresh, refreshing = false }) {
  const { c, s, me, nav, logout, toggleTheme, wide, refresh, toast } = useApp();
  const [menu, setMenu] = useState(false);
  const isRider = !me.finance && !me.admin && !me.security;
  const Sidebar = me.finance ? FinanceSidebar : me.admin ? AdminSidebar : me.security ? SecuritySidebar : RiderSidebar;
  const Header = me.finance ? FinanceHeader : me.admin ? AdminHeader : me.security ? RoleHeader : RiderHeader;
  const items = me.finance ? FINANCE_NAV : me.admin ? ADMIN_NAV : me.security ? SECURITY_NAV : NAV;
  const refreshAction = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={refreshing ? 'Refreshing data' : 'Refresh data'}
      accessibilityState={{ disabled:refreshing }}
      disabled={refreshing}
      onPress={async () => {
        if (refreshing || headerRefreshInFlight) return;
        headerRefreshInFlight = true;
        try { await (onRefresh || refresh)(); }
        catch (error) { toast(error.message); }
        finally { headerRefreshInFlight = false; }
      }}
      style={staticStyles.appHeaderRefreshButton}
    >
      <Ionicons name={refreshing ? 'time-outline' : 'refresh-outline'} size={21} color={wide ? c.text : '#fff'} />
    </TouchableOpacity>
  );

  const content = (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={dynamicStyles.indexContentContainer1({ wide })}>
      <View style={staticStyles.indexView25}>
        {wide ? null : (
          <View style={staticStyles.indexView26}>
            <Text style={dynamicStyles.indexText27({ c })}>{title}</Text>
            {subtitle ? <Text style={[s.muted, staticStyles.indexText28]}>{subtitle}</Text> : null}
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );

  const sheet = (
    <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
      <Pressable onPress={() => setMenu(false)} style={dynamicStyles.indexPressable29({ wide })}>
        <View style={dynamicStyles.indexView30({ c, lift })}>
          <View style={staticStyles.indexView31}>
            {me.finance ? <FinanceProfile user={me} Avatar={Avatar} c={c} /> : (
              <>
                <Avatar u={me} size={38} />
                <View><Text style={dynamicStyles.indexText32({ c })}>{me.name}</Text><Text style={dynamicStyles.indexText33({ c })}>{me.email}</Text></View>
              </>
            )}
          </View>
          <View style={[s.divider, staticStyles.indexView34]} />
          {[...(me.finance || me.security ? [] : [['person-outline', 'Profile', () => nav('profile')]]), [c.dark ? 'sunny-outline' : 'moon-outline', c.dark ? 'Light mode' : 'Dark mode', toggleTheme], ['log-out-outline', 'Log out', logout]].map(([ico, label, fn]) => (
            <TouchableOpacity key={label} onPress={() => { setMenu(false); fn(); }} style={staticStyles.indexTouchableOpacity35}>
              <Ionicons name={ico} size={18} color={label === 'Log out' ? c.bad : c.text} /><Text style={dynamicStyles.indexText36({ c, label })}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  if (wide) {
    return (
      <View style={dynamicStyles.indexView37({ c })}>
        <View style={dynamicStyles.indexView38({ NAVY })}>
          <View>
            <TouchableOpacity onPress={() => nav('dashboard')} style={staticStyles.indexTouchableOpacity39}>
              <Shield size={34} />
              <View><Text style={staticStyles.indexText40}>HelMate</Text><Text style={staticStyles.indexText41}>Helmet Storage System</Text></View>
            </TouchableOpacity>
            <Text style={staticStyles.indexText42}>MENU</Text>
            <Sidebar cur={cur} nav={nav} />
          </View>
          {!isRider ? (
            <TouchableOpacity onPress={() => setMenu(true)} style={staticStyles.indexTouchableOpacity43}>
              <Avatar u={me} size={38} ring />
              <View style={staticStyles.indexView44}>
                <Text numberOfLines={1} style={staticStyles.indexText45}>{me.name}</Text>
                <Text style={staticStyles.indexText46}>{me.admin ? 'Administrator' : me.finance ? 'Finance' : me.security ? 'Security' : 'Rider'}</Text>
              </View>
              <Ionicons name="ellipsis-horizontal" size={18} color="#8fa3cc" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={staticStyles.indexView44}>
          <Header
            title={title}
            subtitle={subtitle}
            s={s}
            c={c}
            profileControl={isRider ? (
              <TouchableOpacity accessibilityLabel="Open rider account menu" onPress={() => setMenu(true)} style={staticStyles.riderHeaderProfile}>
                <Avatar u={me} size={38} ring />
              </TouchableOpacity>
            ) : null}
            rightControl={refreshAction}
          />
          {content}
        </View>
        {sheet}
      </View>
    );
  }

  return (
    <SafeAreaView style={s.fill} edges={['top']}>
      <View style={dynamicStyles.indexView48({ NAVY })}>
        <TouchableOpacity onPress={() => nav('dashboard')} style={staticStyles.indexTouchableOpacity49}>
          <Shield size={28} /><Text style={staticStyles.indexText50}>HelMate</Text>
        </TouchableOpacity>
        {isRider ? (
          <RiderHeader
            compact
            profileControl={(
              <TouchableOpacity accessibilityLabel="Open rider account menu" onPress={() => setMenu(true)} style={staticStyles.riderHeaderProfile}>
                <Avatar u={me} size={36} ring />
              </TouchableOpacity>
            )}
            rightControl={refreshAction}
          />
        ) : me.finance ? (
          <View style={staticStyles.appHeaderControls}>
            {refreshAction}
            <TouchableOpacity accessibilityLabel="Open finance account menu" onPress={() => setMenu(true)} style={staticStyles.appHeaderProfile}>
              <Avatar u={me} size={36} ring />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={staticStyles.appHeaderControls}>
            {refreshAction}
            <TouchableOpacity accessibilityLabel={`Open ${me.admin ? 'admin' : 'security'} account menu`} onPress={() => setMenu(true)} style={staticStyles.appHeaderProfile}>
              <Avatar u={me} size={36} ring />
            </TouchableOpacity>
          </View>
        )}
      </View>
      {content}
      <SafeAreaView edges={['bottom']} style={dynamicStyles.indexSafeAreaView51({ c })}>
        <View style={staticStyles.indexView52}>
          {items.map(([k, ico, , short]) => {
            const on = k === cur;
            return (
              <TouchableOpacity key={k} onPress={() => nav(k)} style={staticStyles.indexTouchableOpacity53}>
                <View style={dynamicStyles.indexView54({ c, on })}>
                  <Ionicons name={ico} size={21} color={on ? c.gold : c.muted} />
                </View>
                <Text style={dynamicStyles.indexText55({ c, on })}>{short}</Text>
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
    <View style={[s.card, staticStyles.indexView56]}>
      <IconBox icon={icon} tone={tone} size={52} />
      <View style={staticStyles.indexView44}>
        <Text style={dynamicStyles.indexText58({ c })}>{value}</Text>
        <Text style={s.muted}>{label}</Text>
      </View>
    </View>
  );
}

function LogList({ list, who }) {
  const { db, s, c } = useApp();
  if (!list.length) return <Text style={s.empty}>No locker activity yet.</Text>;
  const nm = (id) => (db.users.find((x) => x.id === id) || { name: 'Deleted user' }).name;
  return list.map((x, i) => (
    <View key={i} style={dynamicStyles.indexView59({ c, i, list })}>
      <IconBox icon={x.act === 'Stored' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} tone={x.act === 'Stored' ? 'gold' : 'primary'} size={40} />
      <View style={staticStyles.indexView44}>
        <Text style={dynamicStyles.indexText61({ c })}>Reservation #{x.rid} · Locker {x.slot}{who ? ` · ${nm(x.uid)}` : ''}</Text>
        <Text style={s.muted}>{stamp(x.ts)}</Text>
      </View>
      <Tag kind={x.act === 'Stored' ? 'gold' : 'mute'} text={x.act} />
    </View>
  ));
}

export { Shield, Gradient, Btn, Field, Tag, Avatar, IconBox, InfoModal, DateTimeFields, SlotGrid, Layout, Stat, LogList };



