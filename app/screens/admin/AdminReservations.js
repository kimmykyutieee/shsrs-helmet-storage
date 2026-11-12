import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { cancelAnyReservation } from '../../services/reservationService';
import { isPast, fd, ft } from '../../shared/utils/date';
import { shareText, confirmBox } from '../../shared/utils/actions';
import { WEB } from '../../shared/constants/theme';
import { Layout, Btn, Tag } from '../../components/common';

function AdminReservations() {
  const { db, refresh, toast, s, c } = useApp();
  const reservations = db.res.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const userName = (id) => (db.users.find((user) => user.id === id) || { name: 'Deleted user' }).name;
  const cancel = (id) => confirmBox('Cancel reservation', 'Cancel this reservation?', 'Yes, cancel', async () => {
    try { await cancelAnyReservation(id); await refresh(); toast('Reservation cancelled.'); }
    catch (error) { toast(error.message); }
  });
  const exportCSV = async () => {
    const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
    const csv = ['ID,Rider,Slot,Date,Time,Stored', ...db.res.map((reservation) => [
      reservation.id, quote(userName(reservation.uid)), reservation.slot, reservation.date, reservation.time,
      reservation.stored ? 'yes' : 'no',
    ].join(','))].join('\n');
    if (WEB) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      link.download = 'reservations.csv';
      document.body.appendChild(link); link.click(); link.remove();
      return toast('CSV download started.');
    }
    await shareText(csv, toast, 'reservations.csv');
  };

  return (
    <Layout cur="adminReservations" title="Reservations" subtitle="Review and manage reservations.">
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10 }}>
          <View><Text style={s.cardTitle}>All reservations</Text><Text style={s.cardSub}>{reservations.length} total</Text></View>
          <Btn small variant="outline" icon="download-outline" label="Export CSV" onPress={exportCSV} />
        </View>
        {reservations.length ? reservations.map((reservation, index) => (
          <View key={reservation.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: index === reservations.length - 1 ? 0 : 1, borderColor: c.line }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontWeight: '700' }}>Slot {reservation.slot} · {userName(reservation.uid)} <Text style={{ color: c.muted, fontWeight: '500' }}>#{reservation.id}</Text></Text>
              <Text style={s.muted}>{fd(reservation.date)} · {ft(reservation.time)}</Text>
              <View style={[s.row, { marginTop: 6 }]}>
                {reservation.stored ? <Tag kind="gold" text="Stored" /> : null}
                <Tag kind={isPast(reservation) ? 'mute' : 'ok'} text={isPast(reservation) ? 'Completed' : 'Upcoming'} />
              </View>
            </View>
            <Btn small variant="outline" icon="trash-outline" onPress={() => cancel(reservation.id)} />
          </View>
        )) : <Text style={s.empty}>No reservations yet.</Text>}
      </View>
    </Layout>
  );
}

export default AdminReservations;
