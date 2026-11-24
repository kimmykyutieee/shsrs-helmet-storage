import { StyleSheet } from 'react-native';
import { GOLD, NAVY } from '../shared/constants/theme';

const staticStyles = StyleSheet.create({
  indexView3: { justifyContent: 'center' },
  indexIonicons4: { position: 'absolute', left: 14, zIndex: 1 },
  indexTextInput5: { paddingLeft: 42 },
  indexTextInput6: { paddingRight: 44 },
  indexTouchableOpacity7: { position: 'absolute', right: 12, padding: 4 },
  indexView13: { flex: 1, backgroundColor: 'rgba(5,10,25,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  indexView15: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  indexView17: { flexDirection: 'row', gap: 10 },
  indexTouchableOpacity18: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  indexView21: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  indexView25: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  indexView26: { marginBottom: 16 },
  indexDatePickerContainer: { marginTop: 10, padding: 8, overflow: 'hidden', borderRadius: 14, borderWidth: 1, borderColor: '#DCE3ED', backgroundColor: '#FFFFFF' },
  indexText28: { marginTop: 3 },
  indexView31: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12 },
  indexView34: { marginVertical: 4 },
  indexTouchableOpacity35: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10 },
  indexTouchableOpacity39: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 6, marginBottom: 22 },
  indexText40: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
  indexText41: { color: '#8fa3cc', fontSize: 11.5 },
  indexText42: { color: '#6c80ab', fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8, marginLeft: 8 },
  indexTouchableOpacity43: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)' },
  indexView44: { flex: 1 },
  appHeaderControls: { width: 92, height: 42, flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0 },
  appHeaderProfile: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  appHeaderRefreshButton: { width: 42, height: 42, borderRadius: 21, marginRight: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', flexShrink: 0 },
  indexText45: { color: '#fff', fontWeight: '700', fontSize: 14 },
  indexText46: { color: '#8fa3cc', fontSize: 12 },
  indexTouchableOpacity49: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  indexText50: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
  indexView52: { flexDirection: 'row', paddingTop: 8, paddingBottom: 4 },
  indexTouchableOpacity53: { flex: 1, alignItems: 'center', gap: 3 },
  indexView56: { flexGrow: 1, flexBasis: 210, marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 16 },
});

const dynamicStyles = {
  indexContentContainer1: ({ wide }) => ({ padding: wide ? 32 : 16, paddingBottom: wide ? 60 : 30 }),
  indexPressable1: ({ V, full, pressed, small }) => ({
      backgroundColor: V.bg, borderColor: V.bd, borderWidth: 1, borderRadius: 12,
      paddingHorizontal: small ? 12 : 20, paddingVertical: small ? 8 : 13, minHeight: small ? 36 : 46,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.85 : 1,
      alignSelf: full ? 'stretch' : 'auto',
    }),
  indexText2: ({ V, small }) => ({ color: V.fg, fontFamily: 'NunitoSansBold', fontWeight: '700', fontSize: small ? 13 : 14.5, letterSpacing: 0.1 }),
  indexText8: ({ K }) => ({ backgroundColor: K[0], color: K[1], fontFamily: 'NunitoSansBold', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, overflow: 'hidden', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.3 }),
  indexView9: ({ GOLD, NAVY2, ring, size }) => ({ width: size, height: size, borderRadius: size / 2, backgroundColor: NAVY2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: ring ? 2 : 0, borderColor: GOLD }),
  indexImage10: ({ size }) => ({ width: size, height: size }),
  indexText11: ({ size }) => ({ color: '#fff', fontFamily: 'NunitoSansBold', fontWeight: '700', fontSize: size * 0.4 }),
  indexView12: ({ bg, size }) => ({ width: size, height: size, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }),
  indexView14: ({ c, lift }) => ({ backgroundColor: c.card, borderRadius: 20, padding: 24, maxHeight: '86%', width: '100%', maxWidth: 520, ...lift(c.dark, true) }),
  indexText16: ({ c }) => ({ color: c.text, fontFamily: 'NunitoSansExtraBold', fontSize: 19, fontWeight: '800' }),
  indexText19: ({ c, text }) => ({ color: text ? c.text : c.muted, fontFamily:'NunitoSans', fontSize: 15 }),
  indexPressable22: ({ c, dis, on, pressed }) => ({
              width: '31%', flexGrow: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 2, borderWidth: 1.5,
              borderColor: on ? c.primary : c.line, backgroundColor: on ? c.primary : dis ? c.soft : c.card, opacity: pressed ? 0.85 : 1,
            }),
  indexText23: ({ dis, fg, isBlocked }) => ({ color: fg, fontFamily: 'NunitoSansExtraBold', fontWeight: '800', fontSize: 17, marginTop: 2, textDecorationLine: dis && !isBlocked ? 'line-through' : 'none' }),
  indexText24: ({ c, on }) => ({ fontSize: 11, color: on ? c.onPrimary : c.muted, opacity: on ? 0.85 : 1, fontWeight: '600' }),
  indexText27: ({ c }) => ({ color: c.text, fontFamily: 'NunitoSansExtraBold', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 }),
  indexPressable29: ({ wide }) => ({ flex: 1, backgroundColor: 'rgba(5,10,25,0.5)', justifyContent: wide ? 'flex-end' : 'flex-start', alignItems: wide ? 'flex-start' : 'flex-end', padding: wide ? 20 : 12, paddingTop: wide ? 20 : 64 }),
  indexView30: ({ c, lift }) => ({ backgroundColor: c.card, borderRadius: 16, minWidth: 220, padding: 8, borderWidth: 1, borderColor: c.line, ...lift(c.dark, true) }),
  indexText32: ({ c }) => ({ color: c.text, fontFamily:'NunitoSansBold', fontWeight: '700' }),
  indexText33: ({ c }) => ({ color: c.muted, fontFamily:'NunitoSans', fontSize: 12 }),
  indexText36: ({ c, label }) => ({ color: label === 'Log out' ? c.bad : c.text, fontFamily:'NunitoSansSemiBold', fontWeight: '600' }),
  indexView37: ({ c }) => ({ flex: 1, flexDirection: 'row', backgroundColor: c.bg }),
  indexView38: ({ NAVY }) => ({ width: 264, backgroundColor: NAVY, padding: 18, justifyContent: 'space-between' }),
  indexView48: ({ NAVY }) => ({ backgroundColor: NAVY, paddingHorizontal: 16, height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }),
  indexSafeAreaView51: ({ c }) => ({ backgroundColor: c.card, borderTopWidth: 1, borderColor: c.line }),
  indexView54: ({ c, on }) => ({ paddingHorizontal: 14, paddingVertical: 4, borderRadius: 14, backgroundColor: on ? c.goldBg : 'transparent' }),
  indexText55: ({ c, on }) => ({ fontFamily:on ? 'NunitoSansExtraBold' : 'NunitoSansSemiBold', fontSize: 10.5, fontWeight: on ? '800' : '600', color: on ? c.text : c.muted }),
  indexText58: ({ c }) => ({ color: c.text, fontFamily:'NunitoSansExtraBold', fontSize: 26, fontWeight: '800', letterSpacing: -0.6 }),
  indexView59: ({ c, i, list }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: i === list.length - 1 ? 0 : 1, borderColor: c.line }),
  indexText61: ({ c }) => ({ color: c.text, fontFamily:'NunitoSansSemiBold', fontWeight: '600' }),
  indexStyle62: ({ c }) => ({ flex: 1, padding: '12px 14px', fontSize: 15, borderRadius: 12, border: `1px solid ${c.line}`, background: c.soft, color: c.text, colorScheme: 'light', minHeight: 48, boxSizing: 'border-box', fontFamily: 'NunitoSans' })
};

const buttonVariant = (c, variant) => ({
  primary: { bg: c.primary, fg: c.onPrimary, bd: c.primary },
  gold: { bg: c.dark ? c.primary : GOLD, fg: c.dark ? c.onPrimary : '#1a1304', bd: c.dark ? c.primary : GOLD },
  outline: { bg: 'transparent', fg: c.text, bd: c.line },
  soft: { bg: c.soft, fg: c.text, bd: c.line },
  danger: { bg: c.bad, fg: '#fff', bd: c.bad },
  light: { bg: '#fff', fg: NAVY, bd: '#fff' },
  ghostDark: { bg: 'transparent', fg: '#fff', bd: 'rgba(255,255,255,0.28)' },
})[variant];

const tagColors = (c, kind) => ({
  ok: [c.okBg, c.ok],
  gold: [c.goldBg, c.gold],
  bad: [c.badBg, c.bad],
  mute: [c.soft, c.muted],
})[kind];

const iconBoxColors = (c, tone) => ({
  bg: tone === 'gold' ? c.goldBg : tone === 'ok' ? c.okBg : c.soft,
  fg: tone === 'gold' ? c.gold : tone === 'ok' ? c.ok : c.primary,
});

export { staticStyles, dynamicStyles, buttonVariant, tagColors, iconBoxColors };
