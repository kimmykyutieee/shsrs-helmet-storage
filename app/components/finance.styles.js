import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  financeDashboardImage2: { width: '100%', height: 420 },
  financeDashboardTabs: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1, borderRadius: 14, marginBottom: 16 },
  financeDashboardTab: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8, borderWidth: 1, borderRadius: 11 },
  financeDashboardTabCount: { minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  financeHistoryView1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 10 },
  financeHistoryView3: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  financeHistoryText4: { marginTop: 6 },
  paymentVerificationView2: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  paymentVerificationText3: { marginTop: 2 },
  paymentVerificationPressable4: { marginTop: 2, alignSelf: 'flex-start' },
  paymentVerificationView7: { marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  financeQueueCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10, gap: 8 },
  financeQueueHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  financeQueueList: { gap: 10 },
  financeQueueSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 },
  financeQueueSectionTitle: { flex: 1, minWidth: 0, gap: 2 },
  financeSectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 12, borderBottomWidth: 1, marginBottom: 2 },
  financeSectionHeadingCopy: { flex: 1, minWidth: 0, gap: 2 },
  financeCountBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, overflow: 'hidden', fontWeight: '700' },
  financeRecordHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  financeRecordIdentity: { flex: 1, minWidth: 0, gap: 3 },
  financeRecordDetails: { gap: 8, paddingTop: 10, borderTopWidth: 1 },
  financeRecordDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  financeRecordDetailValue: { flex: 1, textAlign: 'right', fontWeight: '600' },
  financeRecordAmount: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  financeRecordActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1 },
  financeModalSection: { borderWidth: 1, borderRadius: 14, padding: 13, gap: 10, marginTop: 12 },
  financeModalLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  financeQueueHint: { marginTop: -3, marginBottom: 4 },
  financeHistoryCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  financeHistoryCardDetails: { borderTopWidth: 1, paddingTop: 9, marginTop: 4, gap: 5 },
  financeQueueEmpty: { alignItems: 'center', gap: 10, padding: 22, borderRadius: 15 }
});

const dynamicStyles = {
  financeDashboardView1: ({ c }) => ({ borderColor: c.gold }),
  financeRecordCard: ({ c }) => ({ borderWidth:1, borderColor:c.line, backgroundColor:c.card, borderRadius:16, padding:14, marginBottom:2, gap:11 }),
  financeRecordSection: ({ c }) => ({ borderTopWidth:1, borderColor:c.line }),
  financeRecordAmount: ({ c, emphasis = false }) => ({ color:c.text, fontFamily:'NunitoSansExtraBold', fontSize:emphasis ? 20 : 15, fontWeight:'800' }),
  financeCountBadge: ({ c, active = false }) => ({ backgroundColor:active ? c.goldBg : c.soft, color:active ? c.text : c.muted }),
  financeModalSection: ({ c }) => ({ backgroundColor:c.soft, borderColor:c.line }),
  financeHistoryView2: ({ c }) => ({ borderWidth: 1, borderColor: c.line, backgroundColor:c.card, borderRadius: 15, padding: 14, marginBottom: 10, gap: 5 }),
  financeProfileText1: ({ c }) => ({ color: c.text, fontFamily:'NunitoSansBold', fontWeight: '700' }),
  financeProfileText2: ({ c }) => ({ color: c.muted, fontFamily:'NunitoSans', fontSize: 12 }),
  paymentVerificationView1: ({ c }) => ({ borderColor: c.line, backgroundColor:c.card }),
  paymentVerificationView5: ({ c }) => ({ width: 100, height: 100, borderRadius: 10, backgroundColor: c.soft, justifyContent: 'center', alignItems: 'center' }),
  paymentVerificationText6: ({ c }) => ({ color: c.primary, fontWeight: '700' }),
  paymentVerificationAmount: ({ c }) => ({ color:c.text, fontFamily:'NunitoSansExtraBold', fontWeight:'800', fontSize:17 }),
  financeHistoryAmount: ({ c }) => ({ color:c.text, fontFamily:'NunitoSansExtraBold', fontSize:15, fontWeight:'800' })
};

export { staticStyles, dynamicStyles };
