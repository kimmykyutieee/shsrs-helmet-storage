import React from 'react';
import { View, Text } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { today, fd, ft } from '../../shared/utils/date';
import { Layout, Tag } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/slots.styles';

function SlotAvailability() {
  const { db, me, s, c } = useApp();
  const date = today();
  const slots = db.slots || [];

  return (
    <Layout cur={me.security ? 'securitySlots' : 'slots'} title="Lockers" subtitle="Current locker availability.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Locker bank</Text>
        <Text style={[s.cardSub, staticStyles.slotAvailabilityText1]}>
          Availability for each locker is shown below.
        </Text>
        {!slots.length ? <Text style={s.empty}>No lockers are configured.</Text> : slots.map((slot) => {
          const reservations = (db.slotReservations || [])
            .filter((item) => Number(item.slot) === Number(slot.slot) && (item.date >= date || Number(item.stored) === 1))
            .sort((a, b) => (Number(b.stored) - Number(a.stored)) || (a.date + a.time).localeCompare(b.date + b.time));
          const reservation = reservations.find((item) => Number(item.stored) === 1) || reservations.find((item) => item.date === date) || reservations[0];
          const occupiedByStoredHelmet = Number(reservation?.stored) === 1;
          const status = slot.blocked ? 'Maintenance' : occupiedByStoredHelmet ? 'Occupied · Helmet stored' : reservation ? `Reserved${reservation.status ? ` · ${reservation.status}` : ''}` : 'Available';
          const kind = slot.blocked ? 'bad' : reservation ? 'gold' : 'ok';
          return (
            <View key={slot.slot} style={dynamicStyles.slotAvailabilityView2({ c })}>
              <View style={dynamicStyles.slotAvailabilityView3({ c })}>
                <Text style={dynamicStyles.slotAvailabilityText4({ c })}>{slot.slot}</Text>
              </View>
              <View style={staticStyles.slotAvailabilityView5}>
                <Text style={dynamicStyles.slotAvailabilityText6({ c })}>Locker {slot.slot}</Text>
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
