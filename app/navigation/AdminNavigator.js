import React from 'react';
import { AdminDashboard, SlotMaintenance, CabinetAccessLogs, AdminReservations, AdminUsers } from '../screens/admin';

function AdminNavigator({ route }) {
  const screens = {
    dashboard: <AdminDashboard />,
    admin: <AdminDashboard />,
    adminSlots: <SlotMaintenance />,
    adminLogs: <CabinetAccessLogs />,
    adminReservations: <AdminReservations />,
    adminUsers: <AdminUsers />,
  };
  return screens[route.n] || <AdminDashboard />;
}

export default AdminNavigator;
