import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { Btn } from '../../components/common';
import PaymentVerification from './PaymentVerification';

function FinanceReservations({ pending, busy, onRefresh, onViewReceipt, onProcess }) {
  const { s } = useApp();
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
        <View><Text style={s.cardTitle}>Pending payments</Text><Text style={s.cardSub}>Review the oldest submissions within one business day.</Text></View>
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
      )) : <Text style={s.empty}>No payments are awaiting review.</Text>}
    </View>
  );
}

export default FinanceReservations;
