import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  adminDashboardView1: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 18 },
  adminReservationsView1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 },
  adminReservationsView3: { flex: 1 },
  adminReservationsView6: { marginTop: 6 },
  adminUsersText1: { marginBottom: 6 },
  adminUsersView5: { justifyContent: 'flex-end' },
  adminLogsTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  adminLogsTab: { flex: 1, minWidth: 140, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  adminLogPaymentHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  adminLogPaymentRow: { borderTopWidth: 1, paddingTop: 14, marginTop: 12, gap: 4 },
  adminUsersIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminUsersActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  adminUsersModalField: { marginTop: 12 },
  adminUsersRoleOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  adminUsersRoleOption: { minHeight: 40, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  adminUsersModalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 18, marginBottom: 8 },
  slotMaintenanceText1: { marginBottom: 16 }
});

const dynamicStyles = {
  adminReservationsView2: ({ c, index, reservations }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: index === reservations.length - 1 ? 0 : 1, borderColor: c.line }),
  adminReservationsText4: ({ c }) => ({ color: c.text, fontWeight: '700' }),
  adminReservationsText5: ({ c }) => ({ color: c.muted, fontWeight: '500' }),
  adminUsersView2: ({ c, db, index }) => ({ flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingVertical: 12, borderBottomWidth: index === db.users.length - 1 ? 0 : 1, borderColor: c.line }),
  adminUsersText4: ({ c }) => ({ color: c.text, fontWeight: '600' }),
  adminLogPaymentRow: ({ c }) => ({ borderColor: c.line }),
  adminUsersRoleOption: ({ c, selected, disabled }) => ({
    borderColor: selected ? c.gold : c.line,
    backgroundColor: selected ? c.goldBg : c.card,
    opacity: disabled ? 0.7 : 1,
  })
};

export { staticStyles, dynamicStyles };
