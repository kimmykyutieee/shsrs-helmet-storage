import React from 'react';
import { Text, View } from 'react-native';
import { longDate } from '../shared/utils/date';
import { staticStyles, dynamicStyles } from './navigation.styles';

function RoleHeader({ title, subtitle, s, c }) {
  return (
    <View style={staticStyles.roleHeaderView1}>
      <View>
        <Text style={s.eyebrow}>{longDate()}</Text>
        <Text style={dynamicStyles.roleHeaderText2({ c })}>{title}</Text>
        {subtitle ? <Text style={[s.muted, staticStyles.roleHeaderText3]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export default RoleHeader;
