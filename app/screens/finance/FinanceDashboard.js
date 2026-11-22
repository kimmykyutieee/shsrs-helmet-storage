import React, { useCallback, useEffect, useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPendingPayments, getPaymentReceipt, decidePayment, getRefunds, processRefund, getPendingExtensions, processExtension } from '../../services/paymentService';
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
  const [extensions,setExtensions] = useState([]);
  const [activePaymentTab,setActivePaymentTab] = useState('pending');

  const viewPayments = useCallback(async () => {
    try {
      const result = await getPendingPayments();
      setPending(result.payments);
      const refundResult = await getRefunds();
      setRefunds(refundResult.refunds);
      const extensionResult = await getPendingExtensions();
      setExtensions(extensionResult.extensions);
      setError('');
    } catch (x) { setError(x.message); }
  }, []);

  useEffect(() => {
    viewPayments();
    const interval = setInterval(viewPayments, 15000);
    return () => clearInterval(interval);
  }, [viewPayments]);

  const processPayment = async (payment, decision, reason) => {
    setBusy(payment.id);
    try {
      await decidePayment(payment.id, decision, reason ? { reason } : {});
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

  const handleExtensionAction = async (extension, action) => {
    setBusy(`extension-${extension.id}`);
    try {
      await processExtension(extension.id, action, action === 'reject' ? { reason:'Extension payment rejected by Finance.' } : {});
      await viewPayments();
      toast(`Extension ${action === 'verify' ? 'approved' : 'rejected'}.`);
    } catch (x) { toast(x.message); }
    setBusy(null);
  };

  const pendingPayments = pending.filter((payment) => payment.status === 'Pending');
  const pendingExtensions = extensions.filter((extension) =>
    extension.status === 'Pending' && extension.paymentStatus === 'Pending');
  const pendingRefunds = refunds.filter((refund) => refund.status === 'PENDING');
  const pendingCount = pendingPayments.length;
  const extensionCount = pendingExtensions.length;
  const refundCount = pendingRefunds.length;

  return (
    <Layout cur="financePending">
      <View style={[s.card, staticStyles.financeDashboardTabs]}>
        {[
          { id:'pending', label:'Pending', count:pendingCount },
          { id:'extension', label:'Extension', count:extensionCount },
          { id:'refund', label:'Refund', count:refundCount },
        ].map((tab) => {
          const selected = activePaymentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActivePaymentTab(tab.id)}
              style={[staticStyles.financeDashboardTab, {
                borderColor:selected ? c.gold : c.line,
                backgroundColor:selected ? c.goldBg : c.card,
              }]}
            >
              <Text style={{ color:selected ? c.text : c.muted, fontWeight:selected ? '800' : '600' }}>{tab.label}</Text>
              <View style={[staticStyles.financeDashboardTabCount, { backgroundColor:tab.count ? c.badBg : c.soft }]}>
                <Text style={{ color:tab.count ? c.bad : c.muted, fontSize:12, fontWeight:'800' }}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {activePaymentTab === 'pending' ? (
        <FinanceReservations
          pending={pendingPayments}
          busy={busy}
          onRefresh={viewPayments}
          onViewReceipt={viewReceipt}
          onProcess={processPayment}
        />
      ) : null}
      {activePaymentTab === 'extension' ? (
      <View style={[s.card, { marginTop:16 }]}>
        <Text style={s.cardTitle}>Extension Requests</Text>
        {pendingExtensions.length ? pendingExtensions.map((extension) => (
          <View key={extension.id} style={dynamicStyles.paymentVerificationView1({ c })}>
            <Text style={dynamicStyles.paymentVerificationText6({ c })}>Reservation #{extension.reservationId} · Locker {extension.slot}</Text>
            <Text style={s.muted}>{extension.riderName} · {extension.date} · {extension.time}</Text>
            <Text style={s.muted}>Additional time: {extension.additionalMinutes} minutes</Text>
            <Text style={s.muted}>Payment amount: PHP {Number(extension.paymentAmount || extension.additionalFee).toFixed(2)}</Text>
            {extension.paymentId ? (
              <View style={{ marginTop:10 }}>
                <Btn small variant="outline" icon="image-outline" label="View payment proof" onPress={() => viewReceipt({ id:extension.paymentId })} />
              </View>
            ) : null}
            <View style={{ flexDirection:'row', gap:8, marginTop:10 }}>
              <Btn small label="Approve" onPress={() => handleExtensionAction(extension,'verify')} />
              <Btn small variant="outline" label="Reject" onPress={() => handleExtensionAction(extension,'reject')} />
            </View>
          </View>
        )) : <Text style={s.empty}>No extension requests awaiting verification.</Text>}
      </View>
      ) : null}
      {activePaymentTab === 'refund' ? (

      <View style={[s.card, { marginTop:16 }]}>
        <Text style={s.cardTitle}>Refund Requests</Text>
        {!pendingRefunds.length ? <Text style={s.empty}>No refund requests awaiting verification.</Text> : null}
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
        )) : null}
      </View>
      ) : null}
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
                <TextInput style={[s.input,{ marginTop:10 }]} maxLength={350} placeholder="Rejection reason" value={refundReason} onChangeText={setRefundReason} />
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
