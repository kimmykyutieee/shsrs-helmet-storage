import React from 'react';
import SidebarItems from '../common/SidebarItems';
import { NAV } from '../../shared/constants/theme';

function RiderSidebar(props) {
  return <SidebarItems items={NAV} {...props} />;
}

export default RiderSidebar;
