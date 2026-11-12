import React from 'react';
import { View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { isPast } from '../../shared/utils/date';
import { Layout, Stat } from '../../components/common';

function AdminDashboard() {
  const { db } = useApp();
  const upcoming = db.res.filter((reservation) => !isPast(reservation)).length;
  return (
    <Layout cur="dashboard" title="Dashboard" subtitle="Administrator system overview.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <Stat icon="people-outline" value={db.users.length} label="Registered users" />
        <Stat icon="calendar-outline" value={upcoming} label="Upcoming reservations" tone="ok" />
        <Stat icon="construct-outline" value={db.blocked.length} label="Slots in maintenance" tone="gold" />
      </View>
    </Layout>
  );
}

export default AdminDashboard;
