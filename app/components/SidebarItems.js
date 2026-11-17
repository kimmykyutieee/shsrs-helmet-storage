import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GOLD } from '../shared/constants/theme';
import { staticStyles, dynamicStyles } from './navigation.styles';

function SidebarItems({ items, cur, nav }) {
  return items.map(([key, icon, label]) => {
    const active = key === cur;
    return (
      <TouchableOpacity key={key} onPress={() => nav(key)} style={dynamicStyles.sidebarItemsTouchableOpacity1({ active })}>
        <Ionicons name={icon} size={19} color={active ? GOLD : '#9fb1d6'} />
        <Text style={dynamicStyles.sidebarItemsText2({ active })}>{label}</Text>
        {active ? <View style={dynamicStyles.sidebarItemsView3({ GOLD })} /> : null}
      </TouchableOpacity>
    );
  });
}

export default SidebarItems;
