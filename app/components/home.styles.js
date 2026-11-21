import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  homeScrollViewContent1: { flexGrow: 1 },
  homeSafeAreaView2: { flex: 1 },
  homeView3: { overflow: 'hidden' },
  homeView4: { position: 'absolute', right: -120, top: -120, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(212,160,23,0.10)' },
  homeView5: { position: 'absolute', left: -140, bottom: -160, width: 380, height: 380, borderRadius: 190, backgroundColor: 'rgba(255,255,255,0.04)' },
  homeView8: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeText9: { color: '#fff', fontWeight: '800', fontSize: 17, letterSpacing: 0.6 },
  homeView10: { flexDirection: 'row', gap: 10 },
  homeView13: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(212,160,23,0.14)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginBottom: 20 },
  homeText14: { color: '#f1d27a', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  homeView18: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 30 },
  homeText20: { color: '#fff', fontSize: 26, fontWeight: '800' },
  homeText21: { color: '#8fa3cc', fontSize: 13 },
  homeView22: { flex: 0.85, alignItems: 'center', justifyContent: 'center', height: 380 },
  homeView23: { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: 'rgba(212,160,23,0.08)', borderWidth: 1, borderColor: 'rgba(212,160,23,0.25)' },
  homeView24: { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  homeView25: { backgroundColor: '#f4f6fb' },
  homeText27: { color: '#B7791F', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center' },
  homeView29: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  homeView31: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#FBF2D9', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  homeText32: { color: '#0F172A', fontSize: 16.5, fontWeight: '700', marginBottom: 6 },
  homeText33: { color: '#64748B', lineHeight: 21 },
  homeText41: { color: '#fff', fontWeight: '700', fontSize: 15.5, marginTop: 12 },
  homeView42: { alignItems: 'center', marginTop: 36 },
  homeText43: { color: '#8fa3cc', marginTop: 18, textDecorationLine: 'underline' },
  homeView44: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 20, alignItems: 'center' },
  homeText45: { color: '#6c80ab', fontSize: 12.5 }
});

const dynamicStyles = {
  homeView1: ({ NAVY }) => ({ flex: 1, backgroundColor: NAVY }),
  homeView6: ({ pad2, wide }) => ({ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingTop: 22, paddingBottom: wide ? 90 : 56 }),
  homeView7: ({ wide }) => ({ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: wide ? 70 : 40 }),
  homeView11: ({ wide }) => ({ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 40 }),
  homeView12: ({ wide }) => ({ flex: wide ? 1.15 : undefined }),
  homeText15: ({ wide }) => ({ color: '#fff', fontSize: wide ? 54 : 36, fontWeight: '800', letterSpacing: wide ? -1.8 : -1, lineHeight: wide ? 60 : 42 }),
  homeText16: ({ GOLD }) => ({ color: GOLD }),
  homeText17: ({ wide }) => ({ color: '#aebbd8', fontSize: wide ? 18 : 16, lineHeight: wide ? 28 : 24, marginTop: 18, maxWidth: 540 }),
  homeView19: ({ wide }) => ({ flexDirection: 'row', gap: wide ? 40 : 24, marginTop: 38 }),
  homeView26: ({ pad2, wide }) => ({ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingVertical: wide ? 70 : 44 }),
  homeText28: ({ wide }) => ({ color: '#0F172A', fontSize: wide ? 34 : 26, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginTop: 8, marginBottom: 34 }),
  homeView30: ({ wide }) => ({ flexGrow: 1, flexBasis: wide ? '22%' : '100%', backgroundColor: '#fff', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#e3e8f2' }),
  homeView34: ({ NAVY }) => ({ backgroundColor: NAVY }),
  homeView35: ({ pad2, wide }) => ({ width: '100%', maxWidth: 1180, alignSelf: 'center', paddingHorizontal: pad2, paddingVertical: wide ? 64 : 44 }),
  homeText36: ({ GOLD }) => ({ color: GOLD, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textAlign: 'center' }),
  homeText37: ({ wide }) => ({ color: '#fff', fontSize: wide ? 32 : 25, fontWeight: '800', letterSpacing: -0.8, textAlign: 'center', marginTop: 8, marginBottom: 32 }),
  homeView39: ({ wide }) => ({ flexGrow: 1, flexBasis: wide ? '22%' : '46%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }),
  homeText40: ({ GOLD }) => ({ color: GOLD, fontSize: 13, fontWeight: '800', marginBottom: 12 })
};

export { staticStyles, dynamicStyles };
