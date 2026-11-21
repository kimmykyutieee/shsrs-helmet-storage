import React from 'react';
import SidebarItems from './SidebarItems';
import { NAV } from '../shared/constants/theme';

function RiderSidebar(props) {
  return <SidebarItems items={NAV} {...props} />;
}

export default RiderSidebar;
