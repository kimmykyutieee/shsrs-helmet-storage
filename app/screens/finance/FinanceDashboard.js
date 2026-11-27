import React, { useCallback, useEffect, useState } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPendingPayments, getPaymentReceipt, decidePayment, getRefunds, processRefund, getPendingExtensions, processExtension } from '../../services/paymentService';
import { Layout, InfoModal, Btn, Tag, IconBox } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';
import FinanceReservations from './FinanceReservations';
import { fd, ft, durationLabel } from '../../shared/utils/date';

function RefundDetailLine({ label, value }) {
  const { s, c } = useApp();
  return (
    <View style={staticStyles.financeModalLine}>
      <Text style={s.muted}>{label}</Text>
      <Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{value}</Text>
    </View>
  );
}

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
  const [refreshing,setRefreshing] = useState(false);

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

  const refreshPayments = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { await viewPayments(); }
    finally { setRefreshing(false); }
  };

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
    const reason = String(refundReason || '').trim();
    const reference = String(transactionReference || '').trim();
    if (action === 'reject' && !reason) {
      toast('Enter a reason before rejecting this refund.');
      return;
    }
    if (action === 'complete' && !/^\d{13}$/.test(reference)) {
      toast('Enter the 13-digit GCash transaction reference before marking this refund complete.');
      return;
    }
    setBusy(`refund-${refund.id}`);
    try {
      await processRefund(refund.id, action, action === 'reject'
        ? { reason }
        : action === 'complete'
          ? { transactionReference:reference }
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
    <Layout cur="financePending" title="Payments" subtitle="Review payment, extension, and refund requests." onRefresh={refreshPayments} refreshing={refreshing}>
      <View style={[staticStyles.financeDashboardTabs, { backgroundColor:c.soft, borderColor:c.line }]}>
        {[
          { id:'pending', label:'Pending', count:pendingCount },
          { id:'extension', label:'Extensions', count:extensionCount },
          { id:'refund', label:'Refunds', count:refundCount },
        ].map((tab) => {
          const selected = activePaymentTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActivePaymentTab(tab.id)}
              style={[staticStyles.financeDashboardTab, {
                borderColor:selected ? c.line : 'transparent',
                backgroundColor:selected ? c.card : 'transparent',
              }]}
            >
              <Text style={{ color:selected ? c.text : c.muted, fontFamily:selected ? 'NunitoSansExtraBold' : 'NunitoSansSemiBold', fontWeight:selected ? '800' : '600' }}>{tab.label}</Text>
              <View style={[staticStyles.financeDashboardTabCount, { backgroundColor:tab.count ? c.badBg : c.soft }]}>
                <Text style={{ color:tab.count ? c.bad : c.muted, fontSize:12, fontWeight:'800' }}>{tab.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {error ? <Text style={[s.err, { marginBottom:12 }]}>{error}</Text> : null}
      {activePaymentTab === 'pending' ? (
        <FinanceReservations
          pending={pendingPayments}
          busy={busy}
          onViewReceipt={viewReceipt}
          onProcess={processPayment}
        />
      ) : null}
      {activePaymentTab === 'extension' ? (
      <View style={staticStyles.financeQueueList}>
        <View style={[staticStyles.financeSectionHeading,{ borderBottomColor:c.line }]}><View style={staticStyles.financeSectionHeadingCopy}><Text style={s.cardTitle}>Extension requests</Text><Text style={s.cardSub}>Review extra time requests</Text></View><Text style={[staticStyles.financeCountBadge,dynamicStyles.financeCountBadge({ c, active:pendingExtensions.length > 0 })]}>{pendingExtensions.length} pending</Text></View>
        {pendingExtensions.length ? pendingExtensions.map((extension) => (
          <View key={extension.id} style={dynamicStyles.financeRecordCard({ c })}>
            <View style={staticStyles.financeRecordHeading}><View style={staticStyles.financeRecordIdentity}><Text style={s.cardSub}>EXTENSION REVIEW</Text><Text style={s.cardTitle}>Reservation #{extension.reservationId}</Text><Text style={s.cardSub}>{extension.riderName}</Text></View><Tag kind="gold" text="Pending" /></View>
            <View style={[staticStyles.financeRecordDetails,{ borderColor:c.line }]}>
              <View style={staticStyles.financeRecordDetailRow}><Text style={s.muted}>Locker</Text><Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{extension.slot}</Text></View>
              <View style={staticStyles.financeRecordDetailRow}><Text style={s.muted}>Reserved for</Text><Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{fd(extension.date)} · {ft(extension.time)}</Text></View>
              <View style={staticStyles.financeRecordDetailRow}><Text style={s.muted}>Extra time</Text><Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{durationLabel(extension.additionalMinutes)}</Text></View>
            </View>
            <View style={[staticStyles.financeRecordAmount,{ backgroundColor:c.soft,borderColor:c.line }]}><Text style={s.muted}>Payment amount</Text><Text style={dynamicStyles.financeRecordAmount({ c, emphasis:true })}>PHP {Number(extension.paymentAmount || extension.additionalFee).toFixed(2)}</Text></View>
            {extension.paymentId ? (
              <Btn small variant="outline" icon="image-outline" label="View payment proof" onPress={() => viewReceipt({ id:extension.paymentId })} />
            ) : null}
            <View style={[staticStyles.financeRecordActions,{ borderColor:c.line }]}>
              <Btn small label="Approve" onPress={() => handleExtensionAction(extension,'verify')} />
              <Btn small variant="outline" label="Reject" onPress={() => handleExtensionAction(extension,'reject')} />
            </View>
          </View>
        )) : <View style={[s.card, staticStyles.financeQueueEmpty]}><IconBox icon="time-outline" tone="gold" size={44} /><Text style={s.empty}>No extension requests awaiting verification.</Text></View>}
      </View>
      ) : null}
      {activePaymentTab === 'refund' ? (
      <View style={staticStyles.financeQueueList}>
        <View style={[staticStyles.financeSectionHeading,{ borderBottomColor:c.line }]}><View style={staticStyles.financeSectionHeadingCopy}><Text style={s.cardTitle}>Refund requests</Text><Text style={s.cardSub}>Review rider refund requests</Text></View><Text style={[staticStyles.financeCountBadge,dynamicStyles.financeCountBadge({ c, active:pendingRefunds.length > 0 })]}>{pendingRefunds.length} pending</Text></View>
        {!pendingRefunds.length ? <View style={[s.card, staticStyles.financeQueueEmpty]}><IconBox icon="wallet-outline" tone="gold" size={44} /><Text style={s.empty}>No refund requests awaiting verification.</Text></View> : null}
        {refunds.length ? refunds.map((refund) => (
          <View key={refund.id} style={dynamicStyles.financeRecordCard({ c })}>
            <View style={staticStyles.financeRecordHeading}>
              <View style={staticStyles.financeRecordIdentity}>
                <Text style={s.cardSub}>REFUND REQUEST</Text>
                <Text style={s.cardTitle}>Refund #{refund.id}</Text>
                <Text style={s.cardSub}>{refund.riderName} · Reservation #{refund.reservationId}</Text>
              </View>
              <Tag kind={refund.status === 'COMPLETED' ? 'ok' : refund.status === 'REJECTED' ? 'bad' : 'gold'} text={refund.status} />
            </View>
            <View style={[staticStyles.financeRecordDetails,{ borderColor:c.line }]}>
              <View style={staticStyles.financeRecordDetailRow}><Text style={s.muted}>Locker</Text><Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{refund.slot}</Text></View>
              <View style={staticStyles.financeRecordDetailRow}><Text style={s.muted}>Requested refund</Text><Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{`PHP ${Number(refund.refundAmount).toFixed(2)}`}</Text></View>
            </View>
            <Btn small variant="outline" label="View details" onPress={() => { setRefundDetail(refund); setRefundReason(refund.rejectionReason || ''); setTransactionReference(refund.transactionReference || ''); }} />
          </View>
        )) : null}
      </View>
      ) : null}
      <InfoModal visible={!!receiptPayment} title={`Payment ID #${receiptPayment?.id || ''} receipt`} onClose={() => setReceiptPayment(null)}>
        {receiptLoading ? <Text style={s.muted}>Loading receipt…</Text> : null}
        {receiptImage ? <Image source={{ uri: receiptImage }} style={staticStyles.financeDashboardImage2} resizeMode="contain" /> : null}
      </InfoModal>
      <InfoModal visible={!!refundDetail} title={`Refund #${refundDetail?.id || ''} details`} onClose={() => setRefundDetail(null)}>
        {refundDetail ? (
          <>
            <View style={[staticStyles.financeModalSection,dynamicStyles.financeModalSection({ c })]}>
              <Text style={s.cardTitle}>Reservation</Text>
              <RefundDetailLine label="Rider" value={`${refundDetail.riderName} · ID ${refundDetail.riderId}`} />
              <RefundDetailLine label="Locker" value={`${refundDetail.slot} · Reservation #${refundDetail.reservationId}`} />
              <RefundDetailLine label="Reservation date" value={fd(refundDetail.date)} />
              <RefundDetailLine label="Reservation time" value={`${ft(refundDetail.startTime)} – ${ft(refundDetail.endTime)}`} />
              <RefundDetailLine label="Duration" value={`${refundDetail.wholeDay ? 'Whole Day · ' : ''}${durationLabel(refundDetail.durationMinutes)}`} />
            </View>
            <View style={[staticStyles.financeModalSection,dynamicStyles.financeModalSection({ c })]}>
              <Text style={s.cardTitle}>Refund breakdown</Text>
              <RefundDetailLine label="Original payment" value={`PHP ${Number(refundDetail.originalPaymentAmount).toFixed(2)}`} />
              <RefundDetailLine label="Refund amount" value={`PHP ${Number(refundDetail.refundAmount).toFixed(2)}`} />
              <RefundDetailLine label="Not refundable" value={`PHP ${Number(refundDetail.nonRefundableAmount).toFixed(2)}`} />
              <RefundDetailLine label="Status" value={refundDetail.status} />
            </View>
            {refundDetail.status === 'PENDING' ? (
              <>
                <TextInput style={[s.input,{ marginTop:10 }]} maxLength={350} placeholder="Reason (required to reject)" value={refundReason} onChangeText={setRefundReason} />
                <View style={{ flexDirection:'row', gap:8, marginTop:10, flexWrap:'wrap' }}>
                  <Btn small label="Approve Refund" onPress={() => handleRefundAction(refundDetail,'approve')} />
                  <Btn small variant="outline" label="Reject Refund" onPress={() => handleRefundAction(refundDetail,'reject')} />
                </View>
              </>
            ) : null}
            {refundDetail.status === 'APPROVED' ? (
              <>
                <TextInput
                  style={[s.input,{ marginTop:10 }]}
                  placeholder="13-digit GCash transaction reference"
                  value={transactionReference}
                  onChangeText={(value) => setTransactionReference(value.replace(/\D/g, '').slice(0, 13))}
                  keyboardType="number-pad"
                  maxLength={13}
                />
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
