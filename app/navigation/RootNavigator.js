import React from 'react';
import Home from '../screens/home/Home';
import Auth from '../screens/auth/Auth';
import Profile from '../screens/profile/Profile';
import AdminNavigator from './AdminNavigator';
import FinanceNavigator from './FinanceNavigator';
import RiderNavigator from './RiderNavigator';
import SecurityNavigator from './SecurityNavigator';

function RootNavigator({ route, me }) {
  if (route.n === 'home') return <Home />;
  if (route.n === 'login') return <Auth reg={false} key="l" />;
  if (route.n === 'register') return <Auth reg key="r" />;
  if (route.n === 'profile') return me && !me.finance && !me.security ? <Profile /> : null;
  if (!me) return <Home />;
  if (me.admin) return <AdminNavigator route={route} />;
  if (me.finance) return <FinanceNavigator route={route} />;
  if (me.security) return <SecurityNavigator route={route} />;
  return <RiderNavigator route={route} />;
}

export default RootNavigator;
