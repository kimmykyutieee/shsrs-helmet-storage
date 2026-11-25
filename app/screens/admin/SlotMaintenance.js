import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { toggleSlotMaintenance } from '../../services/cabinetService';
import { isPast, fd, ft } from '../../shared/utils/date';
import { confirmBox } from '../../shared/utils/actions';
import { Layout, SlotGrid, InfoModal, Btn, Tag } from '../../components';
import { staticStyles } from '../../components/admin.styles';

function SlotMaintenance() {
  const { db, refresh, toast, s, c } = useApp();
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const blockedCount = new Set(db.blocked).size;
  const reservationsByLocker = db.res
    .filter((reservation) => !['Cancelled', 'Used', 'Completed'].includes(reservation.status)
      && (Number(reservation.stored) === 1 || reservation.status === 'Active' || (!isPast(reservation) && reservation.status !== 'Expired')))
    .sort((a, b) => (Number(b.stored) - Number(a.stored)) || (a.date + a.time).localeCompare(b.date + b.time))
    .reduce((groups, reservation) => {
      const slot = Number(reservation.slot);
      if (!groups[slot]) groups[slot] = [];
      const rider = db.users.find((user) => user.id === reservation.uid);
      groups[slot].push({ ...reservation, riderName:rider?.name || 'Rider' });
      return groups;
    }, {});
  const reservedLockers = new Set(Object.keys(reservationsByLocker).map(Number));
  const reservationCounts = Object.fromEntries(Object.entries(reservationsByLocker).map(([slot, reservations]) => [slot, reservations.length]));
  const toggle = (slot) => {
    const isBlocked = db.blocked.includes(slot);
    confirmBox(
      isBlocked ? 'Remove maintenance' : 'Put locker under maintenance',
      isBlocked ? `Make Locker ${slot} available again?` : `Mark Locker ${slot} as under maintenance?`,
      isBlocked ? 'Make available' : 'Put under maintenance',
      async () => {
        setMaintenanceBusy(true);
        try {
          await toggleSlotMaintenance(slot);
          await refresh();
          setSelectedLocker(null);
          toast(isBlocked ? 'Locker is available again.' : 'Locker marked for maintenance.');
        } catch (error) { toast(error.message); }
        finally { setMaintenanceBusy(false); }
      },
    );
  };
  const selectedReservations = selectedLocker == null ? [] : (reservationsByLocker[selectedLocker] || []);
  const selectedBlocked = selectedLocker != null && db.blocked.includes(selectedLocker);

  return (
    <Layout cur="adminSlots" title="Locker Maintenance" subtitle="Manage locker availability and maintenance.">
      <Text style={[staticStyles.adminOverviewLabel, { color:c.muted }]}>LOCKER STATUS</Text>
      <View style={[s.card, staticStyles.adminMaintenanceCard]}>
        <View style={staticStyles.adminMaintenanceSummary}>
          <View style={[staticStyles.adminMaintenanceMetric, { backgroundColor:c.badBg }]}><Ionicons name="construct-outline" size={18} color={c.bad} /><Text style={{ color:c.text, fontWeight:'700' }}>{blockedCount} in maintenance</Text></View>
          <View style={[staticStyles.adminMaintenanceMetric, { backgroundColor:c.goldBg }]}><Ionicons name="calendar-outline" size={18} color={c.gold} /><Text style={{ color:c.text, fontWeight:'700' }}>{reservedLockers.size} reserved</Text></View>
        </View>
        <Text style={[s.cardSub, staticStyles.slotMaintenanceText1]}>Each locker shows its reservation count. Tap a locker to change its maintenance status.</Text>
        <SlotGrid admin taken={reservedLockers} reservationCounts={reservationCounts} blocked={db.blocked} onAdminTap={setSelectedLocker} />
      </View>
      <InfoModal visible={selectedLocker != null} title="Locker Details" onClose={() => maintenanceBusy ? null : setSelectedLocker(null)}>
        {selectedLocker != null ? (
          <View style={staticStyles.adminLockerDetailContent}>
            <View style={[staticStyles.adminLockerDetailHero, { backgroundColor:c.goldBg }]}>
              <View style={[staticStyles.adminLockerDetailIcon, { backgroundColor:c.card }]}><Ionicons name="file-tray-stacked-outline" size={25} color={c.gold} /></View>
              <View style={staticStyles.adminLockerDetailHeroCopy}>
                <Text style={{ color:c.gold, fontSize:10, fontWeight:'800', letterSpacing:1 }}>LOCKER</Text>
                <Text style={{ color:c.text, fontSize:19, fontWeight:'800' }}>Locker {selectedLocker}</Text>
              </View>
              <Tag kind={selectedBlocked ? 'bad' : selectedReservations.some((r) => Number(r.stored) === 1) ? 'bad' : selectedReservations.length ? 'gold' : 'ok'} text={selectedBlocked ? 'Maintenance' : selectedReservations.some((r) => Number(r.stored) === 1) ? 'Occupied' : selectedReservations.length ? 'Reserved' : 'Available'} />
            </View>
            <View style={[staticStyles.adminLockerDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
              <View style={staticStyles.adminLockerReservationsHeading}>
                <Text style={{ color:c.text, fontSize:14, fontWeight:'800' }}>Rider reservations</Text>
                <Text style={{ color:c.muted, fontSize:12 }}>{selectedReservations.length}</Text>
              </View>
              {selectedReservations.length ? selectedReservations.map((reservation) => (
                <View key={reservation.id} style={[staticStyles.adminLockerRiderRow, { borderTopColor:c.line }]}>
                  <Ionicons name="person-outline" size={16} color={c.muted} />
                  <View style={staticStyles.adminLockerDetailRider}>
                    <Text style={{ color:c.text, fontWeight:'700' }}>{reservation.riderName}</Text>
                    <Text style={{ color:c.muted, fontSize:12 }}>Reservation #{reservation.id}</Text>
                  </View>
                  <Text style={{ color:c.muted, fontSize:12, textAlign:'right' }}>{fd(reservation.date)}{'\n'}{ft(reservation.time)}{Number(reservation.stored) === 1 ? '\nHelmet stored' : ''}</Text>
                </View>
              )) : <Text style={{ color:c.muted }}>No active or upcoming reservations.</Text>}
            </View>
            <Btn full variant={selectedBlocked ? 'outline' : 'gold'} icon={selectedBlocked ? 'lock-open-outline' : 'construct-outline'} label={maintenanceBusy ? 'Updating…' : selectedBlocked ? 'Remove from maintenance' : 'Put under maintenance'} onPress={maintenanceBusy ? undefined : () => toggle(selectedLocker)} />
          </View>
        ) : null}
      </InfoModal>
    </Layout>
  );
}

export default SlotMaintenance;
