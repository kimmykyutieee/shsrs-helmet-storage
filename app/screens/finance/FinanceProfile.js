import React from 'react';
import { Text, View } from 'react-native';

function FinanceProfile({ user, Avatar, c }) {
  return (
    <>
      <Avatar u={user} size={38} />
      <View><Text style={{ color: c.text, fontWeight: '700' }}>{user.name}</Text><Text style={{ color: c.muted, fontSize: 12 }}>{user.email}</Text></View>
    </>
  );
}

export default FinanceProfile;
