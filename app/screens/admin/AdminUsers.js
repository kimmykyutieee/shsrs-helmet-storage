import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { setFinanceRole, setSecurityRole } from '../../services/userService';
import { confirmBox } from '../../shared/utils/actions';
import { Layout, Avatar, Btn, Tag } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/admin.styles';

function AdminUsers() {
  const { db, refresh, toast, s, c } = useApp();
  const [busyUser, setBusyUser] = useState(null);
  const updateRole = (user, role) => {
    const assigned = !user[role];
    const isFinance = role === 'finance';
    const roleName = isFinance ? 'Finance' : 'Security';
    const setRole = isFinance ? setFinanceRole : setSecurityRole;
    confirmBox(
      `${assigned ? 'Assign' : 'Remove'} ${roleName} role`,
      `${assigned ? 'Assign' : 'Remove'} the ${roleName} role ${assigned ? 'to' : 'from'} ${user.name}?`,
      assigned ? `Make ${roleName}` : `Remove ${roleName}`,
      async () => {
        setBusyUser(user.id);
        try {
          await setRole(user.id, assigned);
          await refresh();
          toast(`${user.name} ${assigned ? 'is now' : 'is no longer'} a ${roleName} user.`);
        } catch (error) { toast(error.message); }
        setBusyUser(null);
      },
    );
  };

  return (
    <Layout cur="adminUsers" title="Users" subtitle="Manage Finance and Security role access.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Users</Text>
        <Text style={[s.cardSub, staticStyles.adminUsersText1]}>{db.users.length} registered</Text>
        {db.users.map((user, index) => (
          <View key={user.id} style={dynamicStyles.adminUsersView2({ c, db, index })}>
            <Avatar u={user} size={38} />
            <View style={staticStyles.adminReservationsView3}><Text style={dynamicStyles.adminUsersText4({ c })}>{user.name}</Text><Text style={s.muted}>{user.email}</Text></View>
            <Tag kind={user.admin || user.finance || user.security ? 'gold' : 'mute'} text={user.admin ? 'Admin' : user.finance ? 'Finance' : user.security ? 'Security' : 'Rider'} />
            {!user.admin && !user.finance && !user.security ? (
              <View style={[s.row, staticStyles.adminUsersView5]}>
                <Btn small variant="outline" label="Make Finance" onPress={busyUser === user.id ? undefined : () => updateRole(user, 'finance')} />
                <Btn small variant="outline" label="Make Security" onPress={busyUser === user.id ? undefined : () => updateRole(user, 'security')} />
              </View>
            ) : user.finance ? (
              <Btn small variant="outline" label="Remove Finance" onPress={busyUser === user.id ? undefined : () => updateRole(user, 'finance')} />
            ) : user.security ? (
              <Btn small variant="outline" label="Remove Security" onPress={busyUser === user.id ? undefined : () => updateRole(user, 'security')} />
            ) : null}
          </View>
        ))}
      </View>
    </Layout>
  );
}

export default AdminUsers;
