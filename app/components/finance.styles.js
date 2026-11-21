import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  financeDashboardImage2: { width: '100%', height: 420 },
  financeHistoryView1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 },
  financeHistoryView3: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  financeHistoryText4: { marginTop: 6 },
  paymentVerificationView2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  paymentVerificationText3: { marginTop: 8 },
  paymentVerificationPressable4: { marginTop: 12, alignSelf: 'flex-start' },
  paymentVerificationView7: { marginTop: 14 }
});

const dynamicStyles = {
  financeDashboardView1: ({ c }) => ({ borderColor: c.gold }),
  financeHistoryView2: ({ c }) => ({ borderTopWidth: 1, borderColor: c.line, paddingVertical: 12 }),
  financeProfileText1: ({ c }) => ({ color: c.text, fontWeight: '700' }),
  financeProfileText2: ({ c }) => ({ color: c.muted, fontSize: 12 }),
  paymentVerificationView1: ({ c }) => ({ borderTopWidth: 1, borderColor: c.line, paddingTop: 16, marginTop: 12 }),
  paymentVerificationView5: ({ c }) => ({ width: 100, height: 100, borderRadius: 10, backgroundColor: c.soft, justifyContent: 'center', alignItems: 'center' }),
  paymentVerificationText6: ({ c }) => ({ color: c.primary, fontWeight: '700' })
};

export { staticStyles, dynamicStyles };
