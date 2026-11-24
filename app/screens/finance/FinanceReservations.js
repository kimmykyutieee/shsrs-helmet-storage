import React from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';
import { IconBox } from '../../components';
import PaymentVerification from './PaymentVerification';

function FinanceReservations({ pending, busy, onViewReceipt, onProcess }) {
  const { s, c } = useApp();
  return (
    <View style={staticStyles.financeQueueList}>
      <View style={[staticStyles.financeSectionHeading,{ borderBottomColor:c.line }]}>
        <View style={staticStyles.financeQueueSectionTitle}>
          <Text style={s.cardTitle}>Pending payments</Text>
          <Text style={s.cardSub}>Review payment proof before deciding</Text>
        </View>
        <Text style={[staticStyles.financeCountBadge,dynamicStyles.financeCountBadge({ c, active:pending.length > 0 })]}>{pending.length} pending</Text>
      </View>
      {pending.length ? pending.map((payment) => (
        <PaymentVerification
          key={payment.id}
          payment={payment}
          busy={busy}
          onViewReceipt={onViewReceipt}
          onProcess={onProcess}
        />
      )) : <View style={[s.card, staticStyles.financeQueueEmpty]}><IconBox icon="checkmark-circle-outline" tone="ok" size={48} /><Text style={s.cardTitle}>You’re all caught up</Text><Text style={s.empty}>No pending reservation payments.</Text></View>}
    </View>
  );
}

export default FinanceReservations;
