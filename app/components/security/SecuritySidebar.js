import React from 'react';
import SidebarItems from '../common/SidebarItems';
import { SECURITY_NAV } from '../../shared/constants/theme';

function SecuritySidebar(props) {
  return <SidebarItems items={SECURITY_NAV} {...props} />;
}

export default SecuritySidebar;
