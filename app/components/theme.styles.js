import { StyleSheet } from 'react-native';
import { lift } from '../shared/constants/theme';

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

export { mk };
