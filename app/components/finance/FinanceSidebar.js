import React from 'react';
import SidebarItems from '../common/SidebarItems';

const items = [['finance', 'wallet-outline', 'Finance', 'Finance']];

function FinanceSidebar(props) {
  return <SidebarItems items={items} {...props} />;
}

export default FinanceSidebar;
