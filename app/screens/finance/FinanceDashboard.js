import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPendingPayments, getPaymentReceipt, decidePayment } from '../../services/paymentService';
import { Layout, InfoModal } from '../../components/common';
import FinanceReservations from './FinanceReservations';

function Finance() {
  const { s, c, toast } = useApp();
  const [pending, setPending] = useState([]);
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

  useEffect(() => {
    viewPayments();
  }, []);

  const processPayment = async (payment, decision) => {
    setBusy(payment.id);
    try {
      await decidePayment(payment.id, decision);
      await viewPayments();
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
    <Layout cur="financePending" title="Pending Payments" subtitle="Review student-submitted payments.">
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
      <InfoModal visible={!!receiptPayment} title={`Payment #${receiptPayment?.id || ''} receipt`} onClose={() => setReceiptPayment(null)}>
        {receiptLoading ? <Text style={s.muted}>Loading receipt…</Text> : null}
        {receiptImage ? <Image source={{ uri: receiptImage }} style={{ width: '100%', height: 420 }} resizeMode="contain" /> : null}
      </InfoModal>
    </Layout>
  );
}

export default Finance;
