import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPaymentHistory } from '../../services/paymentService';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { fd, ft } from '../../shared/utils/date';
import { Layout, Btn, Tag } from '../../components/common';

const dateLabel = (value) => value ? String(value).replace('T', ' ') : '—';
const amountLabel = (value) => `PHP ${Number(value).toFixed(2)}`;

function FinanceHistory() {
  const { s, c } = useApp();
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  const refresh = async () => {
    try {
      const result = await getPaymentHistory();
      setPayments(result.payments);
      setError('');
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <Layout cur="financeHistory" title="History" subtitle="Previously approved and rejected payments.">
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
          <View><Text style={s.cardTitle}>Processed payments</Text><Text style={s.cardSub}>Payment records retained after Finance review.</Text></View>
          <Btn small variant="outline" icon="refresh-outline" label="Refresh" onPress={refresh} />
        </View>
        {error ? <Text style={s.err}>{error}</Text> : null}
        {payments.length ? payments.map((payment) => (
          <View key={payment.id} style={{ borderTopWidth: 1, borderColor: c.line, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={s.cardTitle}>Payment #{payment.id}</Text>
              <Tag kind={payment.status === 'Verified' ? 'ok' : 'bad'} text={PAYMENT_STATUS_LABELS[payment.status] || payment.status} />
            </View>
            <Text style={[s.text, { marginTop: 6 }]}>{payment.studentName} · Reservation #{payment.reservationId}</Text>
            <Text style={s.muted}>Slot {payment.slot} · {fd(payment.date)} · {ft(payment.time)}</Text>
            <Text style={s.muted}>Amount paid: {amountLabel(payment.amount)}</Text>
            <Text style={s.muted}>Payment date: {dateLabel(payment.submittedAt)}</Text>
            <Text style={s.muted}>Processed: {dateLabel(payment.processedAt)}</Text>
          </View>
        )) : !error ? <Text style={s.empty}>No processed payments yet.</Text> : null}
      </View>
    </Layout>
  );
}

export default FinanceHistory;
