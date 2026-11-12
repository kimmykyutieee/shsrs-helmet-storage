import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPendingPayments, getPaymentHistory, getPaymentReceipt, decidePayment } from '../../services/paymentService';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { Layout, Btn, InfoModal, Tag } from '../../components/common';
import FinanceReservations from './FinanceReservations';

const dateLabel = (value) => value ? String(value).replace('T', ' ') : '—';
const amountLabel = (value) => `PHP ${Number(value).toFixed(2)}`;

function Finance() {
  const { s, c, toast } = useApp();
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);

  const viewPayments = async () => {
    try {
      const result = await getPendingPayments();
      setPending(result.payments);
      setError('');
    } catch (x) { setError(x.message); }
  };

  const viewPaymentHistory = async () => {
    try {
      const result = await getPaymentHistory();
      setHistory(result.payments);
      setError('');
    } catch (x) { setError(x.message); }
  };

  useEffect(() => {
    viewPayments();
    viewPaymentHistory();
  }, []);

  const processPayment = async (payment, decision) => {
    setBusy(payment.id);
    try {
      await decidePayment(payment.id, decision);
      await Promise.all([viewPayments(), viewPaymentHistory()]);
      toast(`Payment ${decision === 'verify' ? 'approved' : 'rejected'}. SMS was not sent because no provider is configured.`);
    } catch (x) { toast(x.message); }
    setBusy(null);
  };

  const viewReceipt = async (payment) => {
    setReceiptPayment(payment);
    setReceiptImage('');
    setReceiptLoading(true);
    try {
      const result = await getPaymentReceipt(payment.id);
      setReceiptImage(result.receipt);
    } catch (x) {
      setReceiptPayment(null);
      toast(x.message);
    }
    setReceiptLoading(false);
  };

  return (
    <Layout cur="finance" title="Finance Dashboard" subtitle="Review student-submitted payments.">
      <View style={[s.card, { borderColor: c.gold }]}>
        <Text style={s.cardTitle}>SMS notifications are unavailable</Text>
        <Text style={s.cardSub}>No SMS provider is configured. Students can check their payment and QR status in the app.</Text>
      </View>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FinanceReservations
        pending={pending}
        busy={busy}
        onRefresh={viewPayments}
        onViewReceipt={viewReceipt}
        onProcess={processPayment}
      />
      <View style={s.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 10 }}>
          <View><Text style={s.cardTitle}>Payment history</Text><Text style={s.cardSub}>Previously processed payments; view only.</Text></View>
          <Btn small variant="outline" icon="refresh-outline" label="Refresh" onPress={viewPaymentHistory} />
        </View>
        {history.length ? history.map((payment) => (
          <View key={payment.id} style={{ borderTopWidth: 1, borderColor: c.line, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Text style={s.cardTitle}>Payment #{payment.id}</Text>
              <Tag kind={payment.status === 'Verified' ? 'ok' : 'bad'} text={PAYMENT_STATUS_LABELS[payment.status] || payment.status} />
            </View>
            <Text style={[s.text, { marginTop: 6 }]}>{payment.studentName} · Reservation #{payment.reservationId}</Text>
            <Text style={s.muted}>{amountLabel(payment.amount)}</Text>
            <Text style={s.muted}>Processed {dateLabel(payment.processedAt)}</Text>
          </View>
        )) : <Text style={s.empty}>No processed payments yet.</Text>}
      </View>
      <InfoModal visible={!!receiptPayment} title={`Payment #${receiptPayment?.id || ''} receipt`} onClose={() => setReceiptPayment(null)}>
        {receiptLoading ? <Text style={s.muted}>Loading receipt…</Text> : null}
        {receiptImage ? <Image source={{ uri: receiptImage }} style={{ width: '100%', height: 420 }} resizeMode="contain" /> : null}
      </InfoModal>
    </Layout>
  );
}

export default Finance;
