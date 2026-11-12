import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { today, isPast, greet, fd, ft } from '../../shared/utils/date';
import { Layout, Stat, Gradient, Btn, LogList } from '../../components/common';

function Dashboard() {
  const { db, me, mine, nav, s, c, wide } = useApp();
  const r = mine(); const up = r.filter((x) => !isPast(x)); const nx = up[0];
  const freeToday = 12 - new Set(db.res.filter((x) => x.date === today()).map((x) => x.slot)).size;
  const recent = db.log.filter((x) => x.uid === db.me).slice().reverse().slice(0, 4);
  return (
    <Layout cur="dashboard" title={`${greet()}, ${me.name.split(' ')[0]}`} subtitle="Here's what's happening with your helmet storage.">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
        <Stat icon="calendar-outline" value={up.length} label="Upcoming reservations" />
        <Stat icon="lock-open-outline" value={freeToday} label="Slots free today" tone="ok" />
        <Stat icon="time-outline" value={nx ? `Slot ${nx.slot}` : 'None'} label={nx ? `${fd(nx.date)}, ${ft(nx.time)}` : 'Next reservation'} tone="gold" />
      </View>
      {nx && nx.date === today() && (
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: c.goldBg, borderRadius: 14, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: c.gold }}>
          <Ionicons name="notifications" size={20} color={c.gold} />
          <Text style={{ color: c.text, flex: 1, fontWeight: '600' }}>Reminder: Slot {nx.slot} is reserved today at {ft(nx.time)}.</Text>
        </View>
      )}
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ flex: wide ? 1.2 : undefined, width: wide ? undefined : '100%' }}>
          <View style={{ borderRadius: 20, overflow: 'hidden', padding: 26, marginBottom: 18 }}>
            <Gradient id="nx" from="#0B1B3A" to="#1b3f8a" />
            <Text style={{ color: '#f1d27a', fontSize: 11.5, fontWeight: '800', letterSpacing: 1.6 }}>NEXT RESERVATION</Text>
            {nx ? (
              <>
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8 }}>Slot {nx.slot}</Text>
                <Text style={{ color: '#aebbd8', marginTop: 4, fontSize: 15 }}>{fd(nx.date)} · {ft(nx.time)}</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
                  <Btn variant="gold" icon="qr-code-outline" label="Show QR code" onPress={() => nav('qr', nx.id)} />
                  <Btn variant="ghostDark" icon="calendar-outline" label="Manage" onPress={() => nav('reservations')} />
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 8 }}>No upcoming reservation</Text>
                <Text style={{ color: '#aebbd8', marginTop: 6, marginBottom: 18 }}>Pick a slot, date and time to get your QR code.</Text>
                <Btn variant="gold" icon="add" label="Reserve a slot" onPress={() => nav('reservations')} />
              </>
            )}
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Recent cabinet activity</Text>
            <Text style={[s.cardSub, { marginBottom: 6 }]}>Your latest store and retrieve actions.</Text>
            <LogList list={recent} />
          </View>
        </View>
      </View>
    </Layout>
  );
}

export default Dashboard;
