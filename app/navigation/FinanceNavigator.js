import React from 'react';
import { FinanceDashboard } from '../screens/finance';

function FinanceNavigator({ route }) {
  return route.n === 'finance' ? <FinanceDashboard /> : null;
}

export default FinanceNavigator;
