import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { Layout, LogList } from '../../components/common';

function CabinetAccessLogs() {
  const { db, s } = useApp();
  return (
    <Layout cur="adminLogs" title="Cabinet Access Logs" subtitle="Review cabinet access activity.">
      <View style={s.card}>
        <Text style={s.cardTitle}>Cabinet access log</Text>
        <Text style={[s.cardSub, { marginBottom: 6 }]}>Every store and retrieve event.</Text>
        <LogList who list={db.log.slice().reverse()} />
      </View>
    </Layout>
  );
}

export default CabinetAccessLogs;
