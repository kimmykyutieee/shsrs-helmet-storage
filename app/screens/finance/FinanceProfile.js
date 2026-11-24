import React from 'react';
import { Text, View } from 'react-native';
import { dynamicStyles } from '../../components/finance.styles';

function FinanceProfile({ user, Avatar, c }) {
  return (
    <>
      <Avatar u={user} size={38} />
      <View><Text style={dynamicStyles.financeProfileText1({ c })}>{user.name}</Text><Text style={dynamicStyles.financeProfileText2({ c })}>{user.email}</Text></View>
    </>
  );
}

export default FinanceProfile;
