import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { Btn } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';
import PaymentVerification from './PaymentVerification';

function FinanceReservations({ pending, busy, onRefresh, onViewReceipt, onProcess }) {
  const { s } = useApp();
  return (
    <View style={s.card}>
      <View style={staticStyles.financeHistoryView1}>
        <View><Text style={s.cardTitle}>Pending payments</Text></View>
        <Btn small variant="outline" icon="refresh-outline" label="Refresh" onPress={onRefresh} />
      </View>
      {pending.length ? pending.map((payment) => (
        <PaymentVerification
          key={payment.id}
          payment={payment}
          busy={busy}
          onViewReceipt={onViewReceipt}
          onProcess={onProcess}
        />
      )) : <Text style={s.empty}>No pending reservation payments.</Text>}
    </View>
  );
}

export default FinanceReservations;
