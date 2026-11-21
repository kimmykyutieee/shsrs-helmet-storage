import React from 'react';
import { FinanceDashboard, FinanceHistory } from '../screens/finance';

function FinanceNavigator({ route }) {
  if (route.n === 'financeHistory') return <FinanceHistory />;
  return <FinanceDashboard />;
}

export default FinanceNavigator;
