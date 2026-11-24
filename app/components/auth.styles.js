import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  authContentContainer1: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  authView1: { width: '100%', maxWidth: 430, padding: 26, borderRadius: 20, borderWidth: 1 },
  authBrand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 30 },
  authText4: { fontFamily: 'NunitoSans', marginTop: 6, marginBottom: 22, lineHeight: 20, textAlign: 'left' },
  authCameraView6: { flex: 1 },
  authText8: { fontFamily: 'NunitoSans', textAlign: 'center', marginTop: 10, lineHeight: 20 },
  authView13: { marginTop: 8 },
  authText14: { fontFamily: 'NunitoSans', fontSize: 12 },
  authView16: { marginTop: 12 },
  authView23: { flex: 1, overflow: 'hidden', justifyContent: 'space-between', paddingHorizontal: 56, paddingVertical: 48 },
  authView24: { position: 'absolute', right: -115, bottom: -130, width: 420, height: 420, borderRadius: 210, backgroundColor: 'rgba(212,160,23,0.12)' },
  authBrandWide: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  authText26: { color: '#fff', fontFamily: 'OutfitBold', fontSize: 27, letterSpacing: -0.4 },
  authText27: { color: '#fff', fontFamily: 'PoppinsBold', fontSize: 38, letterSpacing: -1.2, lineHeight: 45, maxWidth: 500 },
  authText29: { color: '#c1cce0', fontFamily: 'NunitoSans', fontSize: 15, lineHeight: 24, marginTop: 14, maxWidth: 440 },
  authText30: { color: '#8d9bb6', fontFamily: 'NunitoSans', fontSize: 12 },
});

const dynamicStyles = {
  authCard: ({ c }) => ({
    backgroundColor: c.card,
    borderColor: c.line,
    shadowColor: '#0B1B3A',
    shadowOpacity: c.dark ? 0.16 : 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  }),
  authFormArea: ({ c }) => ({ flex: 1, backgroundColor: c.bg }),
  authText3: ({ c }) => ({ color: c.text, fontFamily: 'PoppinsBold', fontSize: 25, letterSpacing: -0.6 }),
  authBrandTitle: ({ c }) => ({ color: c.text, fontFamily: 'OutfitBold', fontSize: 27, letterSpacing: -0.35 }),
  authView5: ({ c }) => ({ height: 240, borderRadius: 14, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: c.gold }),
  authView7: ({ c }) => ({ minHeight: 130, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center', padding: 18, marginBottom: 14 }),
  authView9: ({ c }) => ({ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginBottom: 14 }),
  authText10: ({ c }) => ({ color: c.bad, flex: 1, fontFamily: 'NunitoSansSemiBold' }),
  authView11: ({ c }) => ({ borderWidth: 1, borderColor: c.line, backgroundColor: c.soft, borderRadius: 14, padding: 14, marginBottom: 16 }),
  authText12: ({ c }) => ({ color: c.text, fontFamily: 'NunitoSansExtraBold', marginBottom: 10 }),
  authText15: ({ c }) => ({ color: c.text, fontFamily: 'NunitoSansBold', marginTop: 2 }),
  authText19: ({ c }) => ({ color: c.muted, fontFamily: 'NunitoSans', textAlign: 'center', marginTop: 22 }),
  authText20: ({ c }) => ({ color: c.gold, fontFamily: 'NunitoSansBold' }),
  authView22: ({ c }) => ({ flex: 1, flexDirection: 'row', backgroundColor: c.bg }),
  authText28: ({ GOLD }) => ({ color: GOLD }),
};

export { staticStyles, dynamicStyles };
