import { StyleSheet } from 'react-native';

const staticStyles = StyleSheet.create({
  roleHeaderView1: { paddingHorizontal: 32, paddingTop: 28, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  roleHeaderText3: { marginTop: 4 }
});

const dynamicStyles = {
  roleHeaderText2: ({ c }) => ({ color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 }),
  sidebarItemsTouchableOpacity1: ({ active }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, backgroundColor: active ? 'rgba(212,160,23,0.14)' : 'transparent' }),
  sidebarItemsText2: ({ active }) => ({ color: active ? '#fff' : '#b8c6e4', fontWeight: active ? '700' : '500', fontSize: 14.5 }),
  sidebarItemsView3: ({ GOLD }) => ({ marginLeft: 'auto', width: 4, height: 18, borderRadius: 2, backgroundColor: GOLD })
};

export { staticStyles, dynamicStyles };
