import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { setFinanceRole } from '../../services/userService';
import { confirmBox } from '../../shared/utils/actions';
import { Layout, Avatar, Btn, Tag } from '../../components/common';

function AdminUsers() {
  const { db, refresh, toast, s, c } = useApp();
  const [busyUser, setBusyUser] = useState(null);
  const updateFinanceRole = (user) => {
    const finance = !user.finance;
    confirmBox(
      finance ? 'Assign Finance role' : 'Remove Finance role',
      `${finance ? 'Assign' : 'Remove'} the Finance role ${finance ? 'to' : 'from'} ${user.name}?`,
      finance ? 'Make Finance' : 'Remove Finance',
      async () => {
        setBusyUser(user.id);
        try {
          await setFinanceRole(user.id, finance);
          await refresh();
          toast(`${user.name} ${finance ? 'is now' : 'is no longer'} a Finance user.`);
        } catch (error) { toast(error.message); }
        setBusyUser(null);
      },
    );
  };

  return (
    <Layout cur="adminUsers" title="Users" subtitle="Manage user roles and Finance access.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Users</Text>
        <Text style={[s.cardSub, { marginBottom: 6 }]}>{db.users.length} registered</Text>
        {db.users.map((user, index) => (
          <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: index === db.users.length - 1 ? 0 : 1, borderColor: c.line }}>
            <Avatar u={user} size={38} />
            <View style={{ flex: 1 }}><Text style={{ color: c.text, fontWeight: '600' }}>{user.name}</Text><Text style={s.muted}>{user.email}</Text></View>
            <Tag kind={user.admin || user.finance ? 'gold' : 'mute'} text={user.admin ? 'Admin' : user.finance ? 'Finance' : 'Rider'} />
            {!user.admin ? <Btn small variant="outline" label={user.finance ? 'Remove Finance' : 'Make Finance'} onPress={busyUser === user.id ? undefined : () => updateFinanceRole(user)} /> : null}
          </View>
        ))}
      </View>
    </Layout>
  );
}

export default AdminUsers;
