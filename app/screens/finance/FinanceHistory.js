import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPaymentHistory } from '../../services/paymentService';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { fd, ft } from '../../shared/utils/date';
import { Layout, Tag, IconBox } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';

const amountLabel = (value) => `PHP ${Number(value).toFixed(2)}`;

function FinanceHistory() {
  const { s, c } = useApp();
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await getPaymentHistory();
      setPayments(result.payments);
      setError('');
    } catch (e) { setError(e.message); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <Layout cur="financeHistory" title="History" onRefresh={refresh} refreshing={refreshing}>
      <View style={staticStyles.financeQueueList}>
        <View style={[staticStyles.financeSectionHeading,{ borderBottomColor:c.line }]}>
          <View style={staticStyles.financeSectionHeadingCopy}><Text style={s.cardTitle}>Processed payments</Text></View>
          <Text style={[staticStyles.financeCountBadge,dynamicStyles.financeCountBadge({ c, active:false })]}>{payments.length} total</Text>
        </View>
        {error ? <Text style={s.err}>{error}</Text> : null}
        {payments.length ? payments.map((payment) => (
          <View key={payment.id} style={dynamicStyles.financeRecordCard({ c })}>
            <View style={staticStyles.financeRecordHeading}>
              <View style={staticStyles.financeRecordIdentity}><Text style={s.cardTitle}>{payment.studentName}</Text><Text style={s.cardSub}>Payment #{payment.id} · {payment.paymentType === 'Extension' ? 'Extension' : 'Reservation'}</Text></View>
              <Tag kind={payment.status === 'Verified' ? 'ok' : 'bad'} text={PAYMENT_STATUS_LABELS[payment.status] || payment.status} />
            </View>
            <Text style={s.muted}>Reservation #{payment.reservationId} · Locker {payment.slot} · {fd(payment.date)} {ft(payment.time)}</Text>
            <View style={[staticStyles.financeRecordAmount,{ backgroundColor:c.soft,borderColor:c.line }]}><Text style={s.muted}>Amount</Text><Text style={dynamicStyles.financeRecordAmount({ c, emphasis:false })}>{amountLabel(payment.amount)}</Text></View>
          </View>
        )) : !error ? <View style={[s.card, staticStyles.financeQueueEmpty]}><IconBox icon="time-outline" tone="gold" size={44} /><Text style={s.empty}>No processed payments yet.</Text></View> : null}
      </View>
    </Layout>
  );
}

export default FinanceHistory;
