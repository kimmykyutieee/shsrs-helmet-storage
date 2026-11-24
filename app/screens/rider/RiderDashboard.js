import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { today, greet } from '../../shared/utils/date';
import { Layout, Btn } from '../../components';
import { staticStyles } from '../../components/rider.styles';

function SummaryRow({ icon, label, value }) {
  const { c } = useApp();
  return (
    <View style={staticStyles.riderHomeSummaryRow}>
      <View style={[staticStyles.riderHomeSummaryIcon, { backgroundColor: c.soft }]}>
        <Ionicons name={icon} size={19} color={c.primary} />
      </View>
      <Text style={[staticStyles.riderHomeSummaryLabel, { color: c.text }]}>{label}</Text>
      <Text style={[staticStyles.riderHomeSummaryValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

function Dashboard() {
  const { db, me, mine, nav, c, s } = useApp();
  const reservations = mine().filter((reservation) => !['Cancelled', 'Expired', 'Pending Refund Verification'].includes(reservation.status));
  const takenToday = new Set((db.slotReservations || []).filter((x) => x.date === today()).map((x) => x.slot));
  const freeToday = (db.slots || []).filter((slot) => !slot.blocked && !takenToday.has(slot.slot)).length;

  return (
    <Layout cur="dashboard" title={`${greet()}, ${me.name.split(' ')[0]}!`} subtitle="Your reservations and available lockers.">
      <View style={staticStyles.riderHomePrimaryAction}>
        <Btn full icon="add" variant="gold" label="Reserve a locker" onPress={() => nav('reservations')} />
      </View>

      <Text style={[staticStyles.riderHomeSectionTitle, { color: c.muted }]}>OVERVIEW</Text>
      <View style={[s.card, staticStyles.riderHomeSummaryCard]}>
        <SummaryRow icon="calendar-outline" value={reservations.length} label="My reservations" />
        <View style={[staticStyles.riderHomeSummaryDivider, { backgroundColor: c.line }]} />
        <SummaryRow icon="lock-open-outline" value={freeToday} label="Lockers available today" />
      </View>
    </Layout>
  );
}

export default Dashboard;
