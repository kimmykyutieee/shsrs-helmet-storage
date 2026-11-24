import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  appView2: { maxWidth: 460, width: '100%', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 26, gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  appText3: { color: '#fff', fontSize: 20, fontWeight: '800' },
  appTextBrand: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 0.4, textAlign: 'center', marginTop: -4 },
  appText4: { color: '#fca5a5' },
  appText5: { color: '#9fb1d6', lineHeight: 21 },
  appText7: { fontWeight: '800', color: '#1a1304' },
  appView9: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  appView12: { flex: 1 },
  appText14: { marginTop: 2, lineHeight: 20 },
  appText17: { marginTop: 14 },
  appText20: { color: '#fff', fontWeight: '600' }
});

const dynamicStyles = {
  appView1: ({ NAVY }) => ({ flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', padding: 28 }),
  appTouchableOpacity6: ({ GOLD }) => ({ backgroundColor: GOLD, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }),
  appView8: ({ NAVY }) => ({ flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', gap: 16 }),
  appView10: ({ c }) => ({ width: 28, height: 28, borderRadius: 14, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }),
  appText11: ({ c }) => ({ color: c.onPrimary, fontWeight: '800' }),
  appText13: ({ c }) => ({ color: c.text, fontWeight: '700' }),
  appView15: ({ c }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: c.line }),
  appText16: ({ c }) => ({ color: c.text, fontWeight: '600' }),
  appView18: ({ wide }) => ({ position: 'absolute', bottom: wide ? 36 : 96, left: 20, right: 20, alignItems: 'center' }),
  appView19: ({ NAVY, lift }) => ({ backgroundColor: NAVY, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(212,160,23,0.5)', ...lift(true, true) })
};

export { staticStyles, dynamicStyles };
