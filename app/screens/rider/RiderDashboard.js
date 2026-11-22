import React from 'react';
import { View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { today, greet } from '../../shared/utils/date';
import { Layout, Stat, Btn } from '../../components';
import { staticStyles } from '../../components/rider.styles';

function Dashboard() {
  const { db, me, mine, nav } = useApp();
  const reservations = mine();
  const takenToday = new Set((db.slotReservations || []).filter((x) => x.date === today()).map((x) => x.slot));
  const freeToday = (db.slots || []).filter((slot) => !slot.blocked && !takenToday.has(slot.slot)).length;
  return (
    <Layout cur="dashboard" title={`${greet()}, ${me.name.split(' ')[0]}!`} subtitle="here's what's happening with your helmet storage.">
      <View style={staticStyles.riderDashboardView1}>
        <Stat icon="calendar-outline" value={reservations.length} label="My reservations" />
        <Stat icon="lock-open-outline" value={freeToday} label="Slots free today" tone="ok" />
      </View>
      <View style={staticStyles.riderDashboardActions}>
        <Btn icon="add" variant="gold" label="Reserve a slot" onPress={() => nav('reservations')} />
        <Btn icon="calendar-outline" variant="outline" label="My Reservations" onPress={() => nav('myReservations')} />
      </View>
    </Layout>
  );
}

export default Dashboard;
