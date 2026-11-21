import React, { useCallback, useEffect, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPendingPayments, getPaymentReceipt, decidePayment, getRefunds, processRefund } from '../../services/paymentService';
import { Layout, InfoModal, Btn, Tag } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';
import FinanceReservations from './FinanceReservations';

function Finance() {
  const { s, c, toast } = useApp();
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptImage, setReceiptImage] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [refunds,setRefunds] = useState([]);
  const [refundDetail,setRefundDetail] = useState(null);
  const [refundReason,setRefundReason] = useState('');
  const [transactionReference,setTransactionReference] = useState('');

  const viewPayments = useCallback(async () => {
    try {
      const result = await getPendingPayments();
      setPending(result.payments);
      const refundResult = await getRefunds();
      setRefunds(refundResult.refunds);
      setError('');
    } catch (x) { setError(x.message); }
  }, []);

  useEffect(() => {
    viewPayments();
    const interval = setInterval(viewPayments, 15000);
    return () => clearInterval(interval);
  }, [viewPayments]);

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

  const handleRefundAction = async (refund, action) => {
    setBusy(`refund-${refund.id}`);
    try {
      await processRefund(refund.id, action, action === 'reject'
        ? { reason: refundReason }
        : action === 'complete'
          ? { transactionReference }
          : {});
      await viewPayments();
      setRefundDetail(null); setRefundReason(''); setTransactionReference('');
      toast(`Refund ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'completed'}.`);
    } catch (x) { toast(x.message); }
    setBusy(null);
  };

  return (
    <Layout cur="financePending" title="Pending Payments" subtitle="Review student-submitted payments.">
      <View style={[s.card, dynamicStyles.financeDashboardView1({ c })]}>
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
      <View style={[s.card, { marginTop:16 }]}>
        <Text style={s.cardTitle}>Refund Activity</Text>
        <Text style={s.cardSub}>Automatic 50% refunds for reservations missed beyond the 10-minute grace period.</Text>
        {refunds.length ? refunds.map((refund) => (
          <View key={refund.id} style={dynamicStyles.paymentVerificationView1({ c })}>
            <View style={dynamicStyles.paymentVerificationView2({ c })}>
              <View>
                <Text style={dynamicStyles.paymentVerificationText6({ c })}>Refund #{refund.id} · Reservation #{refund.reservationId}</Text>
                <Text style={s.muted}>{refund.riderName} (Rider ID {refund.riderId}) · Slot {refund.slot}</Text>
              </View>
              <Tag kind={refund.status === 'COMPLETED' ? 'ok' : refund.status === 'REJECTED' ? 'bad' : 'gold'} text={refund.status} />
            </View>
            <Text style={s.muted}>Refund: PHP {Number(refund.refundAmount).toFixed(2)} · Original: PHP {Number(refund.originalPaymentAmount).toFixed(2)}</Text>
            <View style={{ marginTop:10 }}>
              <Btn small variant="outline" label="View Details" onPress={() => { setRefundDetail(refund); setRefundReason(refund.rejectionReason || ''); setTransactionReference(refund.transactionReference || ''); }} />
            </View>
          </View>
        )) : <Text style={s.empty}>No refund activity.</Text>}
      </View>
      <InfoModal visible={!!receiptPayment} title={`Payment #${receiptPayment?.id || ''} receipt`} onClose={() => setReceiptPayment(null)}>
        {receiptLoading ? <Text style={s.muted}>Loading receipt…</Text> : null}
        {receiptImage ? <Image source={{ uri: receiptImage }} style={staticStyles.financeDashboardImage2} resizeMode="contain" /> : null}
      </InfoModal>
      <InfoModal visible={!!refundDetail} title={`Refund #${refundDetail?.id || ''} details`} onClose={() => setRefundDetail(null)}>
        {refundDetail ? (
          <>
            <Text style={s.cardSub}>Rider: {refundDetail.riderName} · Rider ID: {refundDetail.riderId}</Text>
            <Text style={s.cardSub}>Reservation #{refundDetail.reservationId} · Slot {refundDetail.slot}</Text>
            <Text style={s.cardSub}>Date: {refundDetail.date} · {refundDetail.startTime}–{refundDetail.endTime}</Text>
            <Text style={s.cardSub}>Duration: {refundDetail.wholeDay ? 'Whole Day' : `${refundDetail.durationMinutes} minutes`}</Text>
            <Text style={s.cardSub}>Original: PHP {Number(refundDetail.originalPaymentAmount).toFixed(2)} · 50% refund: PHP {Number(refundDetail.refundAmount).toFixed(2)}</Text>
            <Text style={s.cardSub}>Non-refundable: PHP {Number(refundDetail.nonRefundableAmount).toFixed(2)} · Status: {refundDetail.status}</Text>
            {refundDetail.status === 'PENDING' ? (
              <>
                <TextInput style={[s.input,{ marginTop:10 }]} placeholder="Rejection reason" value={refundReason} onChangeText={setRefundReason} />
                <View style={{ flexDirection:'row', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  <Btn small label="Approve Refund" onPress={() => handleRefundAction(refundDetail,'approve')} />
                  <Btn small variant="outline" label="Reject Refund" onPress={() => handleRefundAction(refundDetail,'reject')} />
                </View>
              </>
            ) : null}
            {refundDetail.status === 'APPROVED' ? (
              <>
                <TextInput style={[s.input,{ marginTop:10 }]} placeholder="Transaction reference" value={transactionReference} onChangeText={setTransactionReference} />
                <View style={{ marginTop:10 }}>
                  <Btn small label="Mark as Completed" onPress={() => handleRefundAction(refundDetail,'complete')} />
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </InfoModal>
    </Layout>
  );
}

export default Finance;
