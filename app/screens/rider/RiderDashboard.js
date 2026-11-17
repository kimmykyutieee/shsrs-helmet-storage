import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { today, isPast, greet, fd, ft } from '../../shared/utils/date';
import { Layout, Stat, Gradient, Btn, LogList } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/rider.styles';

function Dashboard() {
  const { db, me, mine, nav, s, c, wide } = useApp();
  const r = mine(); const up = r.filter((x) => !isPast(x)); const nx = up[0];
  const takenToday = new Set((db.slotReservations || []).filter((x) => x.date === today()).map((x) => x.slot));
  const freeToday = (db.slots || []).filter((slot) => !slot.blocked && !takenToday.has(slot.slot)).length;
  const recent = db.log.filter((x) => x.uid === db.me).slice().reverse().slice(0, 4);
  return (
    <Layout cur="dashboard" title="Home" subtitle={`${greet()}, ${me.name.split(' ')[0]} — here's what's happening with your helmet storage.`}>
      <View style={staticStyles.riderDashboardView1}>
        <Stat icon="calendar-outline" value={up.length} label="Upcoming reservations" />
        <Stat icon="lock-open-outline" value={freeToday} label="Slots free today" tone="ok" />
        <Stat icon="time-outline" value={nx ? `Slot ${nx.slot}` : 'None'} label={nx ? `${fd(nx.date)}, ${ft(nx.time)}` : 'Next reservation'} tone="gold" />
      </View>
      {nx && nx.date === today() && (
        <View style={dynamicStyles.riderDashboardView2({ c })}>
          <Ionicons name="notifications" size={20} color={c.gold} />
          <Text style={dynamicStyles.riderDashboardText3({ c })}>Reminder: Slot {nx.slot} is reserved today at {ft(nx.time)}.</Text>
        </View>
      )}
      <View style={dynamicStyles.cabinetScannerView1({ wide })}>
        <View style={dynamicStyles.riderDashboardView5({ wide })}>
          <View style={staticStyles.riderDashboardView6}>
            <Gradient id="nx" from="#0B1B3A" to="#1b3f8a" />
            <Text style={staticStyles.riderDashboardText7}>NEXT RESERVATION</Text>
            {nx ? (
              <>
                <Text style={staticStyles.riderDashboardText8}>Slot {nx.slot}</Text>
                <Text style={staticStyles.riderDashboardText9}>{fd(nx.date)} · {ft(nx.time)}</Text>
                <View style={staticStyles.riderDashboardView10}>
                  <Btn variant="gold" icon="qr-code-outline" label="Show QR code" onPress={() => nav('qr', nx.id)} />
                  <Btn variant="ghostDark" icon="calendar-outline" label="Manage" onPress={() => nav('myReservations')} />
                </View>
              </>
            ) : (
              <>
                <Text style={staticStyles.riderDashboardText11}>No upcoming reservation</Text>
                <Text style={staticStyles.riderDashboardText12}>Pick a slot, date and time to get your QR code.</Text>
                <Btn variant="gold" icon="add" label="Reserve a slot" onPress={() => nav('reservations')} />
              </>
            )}
          </View>
        </View>
        <View style={dynamicStyles.cabinetScannerView2({ wide })}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Recent cabinet activity</Text>
            <Text style={[s.cardSub, staticStyles.cabinetScannerText17]}>Your latest store and retrieve actions.</Text>
            <LogList list={recent} />
          </View>
        </View>
      </View>
    </Layout>
  );
}

export default Dashboard;
