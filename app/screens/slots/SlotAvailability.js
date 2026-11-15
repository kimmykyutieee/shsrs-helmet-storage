import React from 'react';
import { View, Text } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { today, fd, ft } from '../../shared/utils/date';
import { Layout, Tag } from '../../components/common';

function SlotAvailability() {
  const { db, me, s, c } = useApp();
  const date = today();
  const slots = db.slots || [];

  return (
    <Layout cur={me.security ? 'securitySlots' : 'slots'} title="Slots" subtitle="Live availability from the configured cabinet slots.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Prototype cabinet</Text>
        <Text style={[s.cardSub, { marginBottom: 16 }]}>
          The system currently models one physical prototype cabinet. Slot numbers below are read from the database.
        </Text>
        {!slots.length ? <Text style={s.empty}>No cabinet slots are configured.</Text> : slots.map((slot) => {
          const reservations = (db.slotReservations || [])
            .filter((item) => Number(item.slot) === Number(slot.slot) && item.date >= date)
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
          const reservation = reservations.find((item) => item.date === date) || reservations[0];
          const status = slot.blocked ? 'Maintenance' : reservation ? `Reserved${reservation.status ? ` · ${reservation.status}` : ''}` : 'Available';
          const kind = slot.blocked ? 'bad' : reservation ? 'gold' : 'ok';
          return (
            <View key={slot.slot} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: c.line }}>
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.text, fontSize: 16, fontWeight: '800' }}>{slot.slot}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '700' }}>Prototype cabinet · Slot {slot.slot}</Text>
                <Text style={s.muted}>{reservation ? `${fd(reservation.date)} · ${ft(reservation.time)}` : `Available on ${fd(date)}`}</Text>
              </View>
              <Tag text={status} kind={kind} />
            </View>
          );
        })}
      </View>
    </Layout>
  );
}

export default SlotAvailability;
