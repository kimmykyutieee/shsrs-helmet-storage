import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { getPaymentHistory, getRefunds } from '../../services/paymentService';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { fd, ft, durationLabel } from '../../shared/utils/date';
import { Layout, LogList, Tag, Btn, InfoModal } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/admin.styles';

const dateTimeLabel = (value) => {
  if (!value) return '—';
  const parsed = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? String(value).replace('T', ' ') : parsed.toLocaleString();
};
const timestampValue = (value) => {
  if (!value) return 0;
  const parsed = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};
const paymentStatusKind = (status) => status === 'Verified' || status === 'COMPLETED' ? 'ok' : status === 'Rejected' || status === 'REJECTED' ? 'bad' : 'gold';

function PaymentDetailLine({ c, icon, label, value }) {
  return (
    <View style={staticStyles.adminPaymentDetailLine}>
      <View style={[staticStyles.adminPaymentDetailIcon, { backgroundColor:c.soft }]}><Ionicons name={icon} size={17} color={c.primary} /></View>
      <View style={staticStyles.adminPaymentDetailCopy}>
        <Text style={dynamicStyles.adminPaymentDetailLabel({ c })}>{label}</Text>
        <Text style={dynamicStyles.adminPaymentDetailValue({ c })}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function CabinetAccessLogs() {
  const { db, s, c } = useApp();
  const [activeView, setActiveView] = useState('access');
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const logs = db.log.slice().reverse();
  const loadPaymentHistory = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError('');
    try {
      const [paymentResult, refundResult] = await Promise.all([
        getPaymentHistory(true),
        getRefunds(),
      ]);
      setPayments(paymentResult.payments);
      setRefunds(refundResult.refunds);
    } catch (error) {
      setPaymentsError(error.message);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const paymentTransactions = [
    ...payments.map((payment) => ({
      key: `payment-${payment.id}`,
      kind: 'payment',
      dateValue: payment.submittedAt,
      record: payment,
    })),
    ...refunds.map((refund) => ({
      key: `refund-${refund.id}`,
      kind: 'refund',
      dateValue: refund.createdAt,
      record: refund,
    })),
  ].sort((a, b) => timestampValue(b.dateValue) - timestampValue(a.dateValue));

  return (
    <Layout cur="adminLogs" title="Logs" subtitle="Review locker access logs and activity.">
      <View>
        <View style={[staticStyles.adminLogsTabs, { borderColor:c.line, backgroundColor:c.soft }]}>
          {[
            { id: 'access', label: 'Locker Access Logs' },
            { id: 'payments', label: 'Payments History' },
          ].map((tab) => {
            const selected = activeView === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setActiveView(tab.id);
                  if (tab.id === 'payments') loadPaymentHistory();
                }}
                style={[staticStyles.adminLogsTab, {
                  borderColor: selected ? c.line : 'transparent',
                  backgroundColor: selected ? c.card : 'transparent',
                }]}
              >
                <Text style={{ color: selected ? c.text : c.muted, fontFamily:selected ? 'NunitoSansExtraBold' : 'NunitoSansSemiBold', fontWeight: selected ? '800' : '600', textAlign:'center' }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeView === 'access' ? (
          <View style={[s.card, staticStyles.adminLogSection]}>
            <View style={staticStyles.adminLogHeading}><View><Text style={s.cardTitle}>Locker access log</Text><Text style={s.cardSub}>Every store and retrieve event</Text></View><Tag kind="mute" text={`${logs.length} records`} /></View>
            <LogList who list={logs} />
          </View>
        ) : activeView === 'payments' ? (
          <View style={staticStyles.adminLogSection}>
            <View style={staticStyles.adminReservationsView1}>
              <View>
                <Text style={s.cardTitle}>Payments history</Text>
                <Text style={s.cardSub}>Payments and refunds</Text>
              </View>
              <Btn small variant="outline" icon="refresh-outline" label="Refresh" onPress={loadPaymentHistory} />
            </View>
            {paymentsError ? <Text style={s.err}>{paymentsError}</Text> : null}
            {paymentsLoading ? <Text style={s.muted}>Loading payment history...</Text> : null}
            {!paymentsLoading && !paymentsError && paymentTransactions.length ? paymentTransactions.map((transaction) => {
              const record = transaction.record;
              const refund = transaction.kind === 'refund';
              const title = refund ? `Refund #${record.id}` : `${record.paymentType === 'Extension' ? 'Extension payment' : 'Reservation payment'} #${record.id}`;
              const statusLabel = refund ? record.status : PAYMENT_STATUS_LABELS[record.status] || record.status;
              const amount = refund ? `PHP ${Number(record.refundAmount).toFixed(2)}` : `PHP ${Number(record.amount).toFixed(2)}`;
              return (
                <TouchableOpacity
                  key={transaction.key}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${title}`}
                  onPress={() => setSelectedTransaction(transaction)}
                  style={[dynamicStyles.adminLogPaymentRow({ c }), staticStyles.adminPaymentCard]}
                >
                  <View style={staticStyles.adminPaymentCardTop}>
                    <View style={[staticStyles.adminPaymentIcon, { backgroundColor:c.goldBg }]}>
                      <Ionicons name={refund ? 'return-down-back-outline' : 'card-outline'} size={20} color={c.gold} />
                    </View>
                    <View style={staticStyles.adminPaymentCardIdentity}>
                      <Text style={dynamicStyles.adminPaymentCardTitle({ c })}>{title}</Text>
                      <Text style={s.muted}>{refund ? record.riderName : record.studentName}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.muted} />
                  </View>
                  <View style={[staticStyles.adminPaymentCardFooter, { borderTopColor:c.line }]}>
                    <View><Text style={dynamicStyles.adminPaymentLabel({ c })}>{refund ? 'REFUND AMOUNT' : 'AMOUNT'}</Text><Text style={dynamicStyles.adminPaymentAmount({ c })}>{amount}</Text></View>
                    <Tag kind={paymentStatusKind(record.status)} text={statusLabel} />
                  </View>
                </TouchableOpacity>
              );
            }) : null}
            {!paymentsLoading && !paymentsError && !paymentTransactions.length ? <View style={[s.card, staticStyles.adminLogEmpty]}><Text style={s.empty}>No payment transactions yet.</Text></View> : null}
          </View>
        ) : null}
      </View>
      <InfoModal visible={!!selectedTransaction} title="Transaction Details" onClose={() => setSelectedTransaction(null)}>
        {selectedTransaction ? (() => {
          const record = selectedTransaction.record;
          const refund = selectedTransaction.kind === 'refund';
          const title = refund ? `Refund #${record.id}` : `${record.paymentType === 'Extension' ? 'Extension payment' : 'Reservation payment'} #${record.id}`;
          const status = refund ? record.status : PAYMENT_STATUS_LABELS[record.status] || record.status;
          return (
            <View style={staticStyles.adminPaymentDetailContent}>
              <View style={[staticStyles.adminPaymentDetailHero, { backgroundColor:c.goldBg }]}>
                <View style={[staticStyles.adminPaymentDetailHeroIcon, { backgroundColor:c.card }]}><Ionicons name={refund ? 'return-down-back-outline' : 'card-outline'} size={25} color={c.gold} /></View>
                <View style={staticStyles.adminPaymentDetailHeroCopy}>
                  <Text style={dynamicStyles.adminPaymentDetailEyebrow({ c })}>{refund ? 'REFUND' : 'PAYMENT'}</Text>
                  <Text style={dynamicStyles.adminPaymentDetailTitle({ c })}>{title}</Text>
                </View>
                <Tag kind={paymentStatusKind(record.status)} text={status} />
              </View>
              <View style={[staticStyles.adminPaymentDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
                <Text style={dynamicStyles.adminPaymentSectionTitle({ c })}>Reservation information</Text>
                <PaymentDetailLine c={c} icon="person-outline" label="Rider" value={refund ? record.riderName : record.studentName} />
                <PaymentDetailLine c={c} icon="calendar-outline" label="Reservation" value={`#${record.reservationId}`} />
                <PaymentDetailLine c={c} icon="file-tray-stacked-outline" label="Locker" value={`Locker ${record.slot}`} />
                {record.date ? <PaymentDetailLine c={c} icon="time-outline" label="Reserved for" value={`${fd(record.date)}${record.time ? ` · ${ft(record.time)}` : ''}`} /> : null}
              </View>
              <View style={[staticStyles.adminPaymentDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
                <Text style={dynamicStyles.adminPaymentSectionTitle({ c })}>{refund ? 'Refund information' : 'Payment information'}</Text>
                <PaymentDetailLine c={c} icon="cash-outline" label={refund ? 'Refund amount' : 'Amount'} value={`PHP ${Number(refund ? record.refundAmount : record.amount).toFixed(2)}`} />
                {refund ? <PaymentDetailLine c={c} icon="receipt-outline" label="Original payment" value={`PHP ${Number(record.originalPaymentAmount).toFixed(2)}`} /> : null}
                {!refund && record.paymentType === 'Extension' ? <PaymentDetailLine c={c} icon="hourglass-outline" label="Additional time" value={durationLabel(record.additionalMinutes || 0)} /> : null}
                <PaymentDetailLine c={c} icon="checkmark-circle-outline" label="Status" value={status} />
                <PaymentDetailLine c={c} icon="cloud-upload-outline" label={refund ? 'Created' : 'Submitted'} value={dateTimeLabel(refund ? record.createdAt : record.submittedAt)} />
                {!refund && record.processedAt ? <PaymentDetailLine c={c} icon="time-outline" label="Processed" value={dateTimeLabel(record.processedAt)} /> : null}
                {record.transactionReference ? <PaymentDetailLine c={c} icon="barcode-outline" label="Reference" value={record.transactionReference} /> : null}
              </View>
            </View>
          );
        })() : null}
      </InfoModal>
    </Layout>
  );
}

export default CabinetAccessLogs;
