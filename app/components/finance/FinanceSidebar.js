import React from 'react';
import SidebarItems from '../common/SidebarItems';
import { FINANCE_NAV } from '../../shared/constants/theme';

function FinanceSidebar(props) {
  return <SidebarItems items={FINANCE_NAV} {...props} />;
}

export default FinanceSidebar;
