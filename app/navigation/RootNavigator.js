import React from 'react';
import Home from '../screens/home/Home';
import Auth from '../screens/auth/Auth';
import Profile from '../screens/profile/Profile';
import AdminNavigator from './AdminNavigator';
import FinanceNavigator from './FinanceNavigator';
import RiderNavigator from './RiderNavigator';

function RootNavigator({ route, me }) {
  if (route.n === 'home') return <Home />;
  if (route.n === 'login') return <Auth reg={false} key="l" />;
  if (route.n === 'register') return <Auth reg key="r" />;
  if (route.n === 'profile') return me && !me.finance ? <Profile /> : null;
  if (!me) return <Home />;
  if (me.admin) return <AdminNavigator route={route} />;
  if (me.finance) return <FinanceNavigator route={route} />;
  return <RiderNavigator route={route} />;
}

export default RootNavigator;
