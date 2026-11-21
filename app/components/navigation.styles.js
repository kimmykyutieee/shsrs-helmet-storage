import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  roleHeaderView1: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  roleHeaderText3: { marginTop: 4 },
  riderHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 32, paddingTop: 28, paddingBottom: 6, gap: 16 },
  riderHeaderTitle: { flex: 1, minWidth: 0 },
  riderHeaderControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  riderHeaderProfile: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  riderHeaderBell: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  riderHeaderBadge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#B91C1C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  riderHeaderBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  riderHeaderBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.4)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  riderHeaderPanel: { width: '100%', maxWidth: 460, maxHeight: '85%', borderRadius: 18, borderWidth: 1, padding: 18, overflow: 'hidden' },
  riderHeaderPanelHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  riderHeaderMarkAll: { alignSelf: 'flex-end', paddingVertical: 8 },
  riderHeaderNotificationList: { flexGrow: 0, flexShrink: 1 },
  riderHeaderNotification: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  riderHeaderNotificationTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  riderHeaderUnreadDot: { width: 8, height: 8, borderRadius: 4 },
  riderHeaderEmpty: { padding: 20 },
  riderHeaderViewAll: { alignItems: 'center', paddingTop: 12 }
});

const dynamicStyles = {
  roleHeaderText2: ({ c }) => ({ color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 }),
  sidebarItemsTouchableOpacity1: ({ active }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, backgroundColor: active ? 'rgba(212,160,23,0.14)' : 'transparent' }),
  sidebarItemsText2: ({ active }) => ({ color: active ? '#fff' : '#b8c6e4', fontWeight: active ? '700' : '500', fontSize: 14.5 }),
  sidebarItemsView3: ({ GOLD }) => ({ marginLeft: 'auto', width: 4, height: 18, borderRadius: 2, backgroundColor: GOLD })
};

export { staticStyles, dynamicStyles };
