import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  authContentContainer1: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  authView1: { width: '100%', maxWidth: 420 },
  authTouchableOpacity2: { alignItems: 'center', marginBottom: 18 },
  authText4: { marginTop: 6, marginBottom: 26 },
  authCameraView6: { flex: 1 },
  authText8: { textAlign: 'center', marginTop: 10 },
  authView13: { marginTop: 7 },
  authText14: { fontSize: 12 },
  authView16: { marginTop: 12 },
  authView23: { flex: 1, overflow: 'hidden', justifyContent: 'space-between', padding: 48 },
  authView24: { position: 'absolute', right: -100, bottom: -100, width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(212,160,23,0.12)' },
  authTouchableOpacity25: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authText26: { color: '#fff', fontWeight: '800', fontSize: 19, letterSpacing: 0.6 },
  authText27: { color: '#fff', fontSize: 40, fontWeight: '800', letterSpacing: -1.2, lineHeight: 46 },
  authText29: { color: '#aebbd8', fontSize: 16.5, lineHeight: 26, marginTop: 16, maxWidth: 440 },
  authText30: { color: '#6c80ab', fontSize: 12.5 },
});

const dynamicStyles = {
  authText3: ({ c }) => ({ color: c.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.8 }),
  authView5: ({ c }) => ({ height: 280, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: c.gold }),
  authView7: ({ c }) => ({ minHeight: 150, borderRadius: 16, borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 14 }),
  authView9: ({ c }) => ({ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginBottom: 14 }),
  authText10: ({ c }) => ({ color: c.bad, flex: 1, fontWeight: '600' }),
  authView11: ({ c }) => ({ borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, borderRadius: 14, padding: 16, marginBottom: 18 }),
  authText12: ({ c }) => ({ color: c.text, fontWeight: '800', marginBottom: 10 }),
  authText15: ({ c }) => ({ color: c.text, fontWeight: '700', marginTop: 2 }),
  authText19: ({ c }) => ({ color: c.muted, textAlign: 'center', marginTop: 22 }),
  authText20: ({ c }) => ({ color: c.gold, fontWeight: '700' }),
  authText21: ({ c }) => ({ color: c.muted, textAlign: 'center', marginTop: 14, fontSize: 13 }),
  authView22: ({ c }) => ({ flex: 1, flexDirection: 'row', backgroundColor: c.bg }),
  authText28: ({ GOLD }) => ({ color: GOLD })
};

export { staticStyles, dynamicStyles };
