import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { Layout, LogList } from '../../components/common';

function CabinetActivity() {
  const { db, s } = useApp();
  return (
    <Layout cur="securityActivity" title="Cabinet Activity" subtitle="Review recent cabinet access activity.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Cabinet activity</Text>
        <Text style={[s.cardSub, { marginBottom: 6 }]}>Recent store and retrieve events.</Text>
        <LogList list={db.log.slice().reverse()} />
      </View>
    </Layout>
  );
}

export default CabinetActivity;
