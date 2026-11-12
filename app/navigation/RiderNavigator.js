import React from 'react';
import RiderDashboard from '../screens/rider/RiderDashboard';
import RiderReservations from '../screens/rider/RiderReservations';
import RiderQRCode from '../screens/rider/RiderQRCode';
import CabinetScanner from '../screens/rider/CabinetScanner';
import AccessGuide from '../screens/rider/AccessGuide';

function RiderNavigator({ route }) {
  const screens = {
    dashboard: <RiderDashboard />,
    reservations: <RiderReservations />,
    qr: <RiderQRCode id={route.arg} key={route.arg || 'q'} />,
    scan: <CabinetScanner />,
    guide: <AccessGuide />,
  };
  return screens[route.n] || <RiderDashboard />;
}

export default RiderNavigator;
