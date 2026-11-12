import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { toggleSlotMaintenance } from '../../services/cabinetService';
import { Layout, SlotGrid } from '../../components/common';

function SlotMaintenance() {
  const { db, refresh, toast, s } = useApp();
  const toggle = async (slot) => {
    try { await toggleSlotMaintenance(slot); await refresh(); }
    catch (error) { toast(error.message); }
  };

  return (
    <Layout cur="adminSlots" title="Slot Maintenance" subtitle="Manage cabinet slot availability and maintenance.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Slot maintenance</Text>
        <Text style={[s.cardSub, { marginBottom: 16 }]}>Tap a slot to block or unblock it. Blocked slots cannot be booked.</Text>
        <SlotGrid admin taken={new Set()} blocked={db.blocked} onAdminTap={toggle} />
      </View>
    </Layout>
  );
}

export default SlotMaintenance;
