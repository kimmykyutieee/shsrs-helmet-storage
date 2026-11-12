import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOLD } from '../../shared/constants/theme';

function SidebarItems({ items, cur, nav }) {
  return items.map(([key, icon, label]) => {
    const active = key === cur;
    return (
      <TouchableOpacity key={key} onPress={() => nav(key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 4, backgroundColor: active ? 'rgba(212,160,23,0.14)' : 'transparent' }}>
        <Ionicons name={icon} size={19} color={active ? GOLD : '#9fb1d6'} />
        <Text style={{ color: active ? '#fff' : '#b8c6e4', fontWeight: active ? '700' : '500', fontSize: 14.5 }}>{label}</Text>
        {active ? <View style={{ marginLeft: 'auto', width: 4, height: 18, borderRadius: 2, backgroundColor: GOLD }} /> : null}
      </TouchableOpacity>
    );
  });
}

export default SidebarItems;
