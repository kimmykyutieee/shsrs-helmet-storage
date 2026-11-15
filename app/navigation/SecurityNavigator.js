import React from 'react';
import CabinetScanner from '../screens/rider/CabinetScanner';
import SecurityCabinetActivity from '../screens/security/CabinetActivity';

function SecurityNavigator({ route }) {
  if (route.n === 'securityActivity') return <SecurityCabinetActivity />;
  return <CabinetScanner />;
}

export default SecurityNavigator;
