import React from 'react';
import { Text, View } from 'react-native';
import { longDate } from '../../shared/utils/date';

function RoleHeader({ title, subtitle, s, c }) {
  return (
    <View style={{ paddingHorizontal: 32, paddingTop: 28, paddingBottom: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <View>
        <Text style={s.eyebrow}>{longDate()}</Text>
        <Text style={{ color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 }}>{title}</Text>
        {subtitle ? <Text style={[s.muted, { marginTop: 4 }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default RoleHeader;
