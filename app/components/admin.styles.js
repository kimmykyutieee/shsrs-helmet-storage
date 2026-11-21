import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  adminDashboardView1: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 18 },
  adminReservationsView1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 },
  adminReservationsView3: { flex: 1 },
  adminReservationsView6: { marginTop: 6 },
  adminUsersText1: { marginBottom: 6 },
  adminUsersView5: { justifyContent: 'flex-end' },
  slotMaintenanceText1: { marginBottom: 16 }
});

const dynamicStyles = {
  adminReservationsView2: ({ c, index, reservations }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: index === reservations.length - 1 ? 0 : 1, borderColor: c.line }),
  adminReservationsText4: ({ c }) => ({ color: c.text, fontWeight: '700' }),
  adminReservationsText5: ({ c }) => ({ color: c.muted, fontWeight: '500' }),
  adminUsersView2: ({ c, db, index }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: index === db.users.length - 1 ? 0 : 1, borderColor: c.line }),
  adminUsersText4: ({ c }) => ({ color: c.text, fontWeight: '600' })
};

export { staticStyles, dynamicStyles };
