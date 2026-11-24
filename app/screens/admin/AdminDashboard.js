import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { isPast } from '../../shared/utils/date';
import { Layout } from '../../components';
import { staticStyles } from '../../components/admin.styles';

function AdminDashboard() {
  const { db, c, s } = useApp();
  const upcoming = db.res.filter((reservation) => !isPast(reservation)).length;
  const counts = [
    ['people-outline', 'Registered users', db.users.length],
    ['calendar-outline', 'Upcoming reservations', upcoming],
    ['construct-outline', 'Lockers in maintenance', db.blocked.length],
  ];
  return (
    <Layout cur="dashboard" title="Dashboard" subtitle="Administrator system overview.">
      <Text style={[staticStyles.adminOverviewLabel, { color:c.muted }]}>OVERVIEW</Text>
      <View style={[s.card, staticStyles.adminOverviewCard]}>
        {counts.map(([icon, label, value], index) => (
          <React.Fragment key={label}>
            {index ? <View style={[staticStyles.adminOverviewDivider, { backgroundColor:c.line }]} /> : null}
            <View style={staticStyles.adminOverviewRow}>
              <View style={[staticStyles.adminOverviewIcon, { backgroundColor:c.soft }]}><Ionicons name={icon} size={19} color={c.primary} /></View>
              <Text style={[staticStyles.adminOverviewText, { color:c.text }]}>{label}</Text>
              <Text style={[staticStyles.adminOverviewValue, { color:c.text }]}>{value}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </Layout>
  );
}

export default AdminDashboard;
