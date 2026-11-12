import React from 'react';
import SidebarItems from '../common/SidebarItems';
import { ADMIN_NAV } from '../../shared/constants/theme';

function AdminSidebar(props) {
  return <SidebarItems items={ADMIN_NAV} {...props} />;
}

export default AdminSidebar;
