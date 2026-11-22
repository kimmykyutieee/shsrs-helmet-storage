import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useApp } from '../../shared/hooks/useApp';
import { getPaymentHistory, getRefunds } from '../../services/paymentService';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { fd, ft } from '../../shared/utils/date';
import { Layout, LogList, Tag, Btn } from '../../components';
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

function CabinetAccessLogs() {
  const { db, s, c } = useApp();
  const [activeView, setActiveView] = useState('access');
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState('');
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
    <Layout cur="adminLogs" title="Logs" subtitle="Review cabinet access logs and activity.">
      <View style={s.card}>
        <View style={staticStyles.adminLogsTabs}>
          {[
            { id: 'access', label: 'Cabinet Access Logs' },
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
                  borderColor: selected ? c.gold : c.line,
                  backgroundColor: selected ? c.goldBg : c.card,
                }]}
              >
                <Text style={{ color: selected ? c.text : c.muted, fontWeight: selected ? '800' : '600' }}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {activeView === 'access' ? (
          <>
            <Text style={s.cardTitle}>Cabinet access log</Text>
            <Text style={[s.cardSub, staticStyles.adminUsersText1]}>Every store and retrieve event.</Text>
            <LogList who list={logs} />
          </>
        ) : activeView === 'payments' ? (
          <>
            <View style={staticStyles.adminReservationsView1}>
              <View>
                <Text style={s.cardTitle}>Payments History</Text>
              </View>
              <Btn small variant="outline" icon="refresh-outline" label="Refresh" onPress={loadPaymentHistory} />
            </View>
            {paymentsError ? <Text style={s.err}>{paymentsError}</Text> : null}
            {paymentsLoading ? <Text style={s.muted}>Loading payment history...</Text> : null}
            {!paymentsLoading && !paymentsError && paymentTransactions.length ? paymentTransactions.map((transaction) => {
              const record = transaction.record;
              if (transaction.kind === 'refund') {
                return (
                  <View key={transaction.key} style={dynamicStyles.adminLogPaymentRow({ c })}>
                    <View style={staticStyles.adminLogPaymentHeader}>
                      <Text style={s.cardTitle}>Refund #{record.id}</Text>
                      <Tag kind={paymentStatusKind(record.status)} text={record.status} />
                    </View>
                    <Text style={s.muted}>{record.riderName} · Reservation #{record.reservationId} · Locker {record.slot}</Text>
                    <Text style={s.muted}>Refund: PHP {Number(record.refundAmount).toFixed(2)} · Original: PHP {Number(record.originalPaymentAmount).toFixed(2)}</Text>
                    <Text style={s.muted}>Refund date: {dateTimeLabel(record.createdAt)}</Text>
                    {record.transactionReference ? <Text style={s.muted}>Reference: {record.transactionReference}</Text> : null}
                  </View>
                );
              }
              const statusLabel = PAYMENT_STATUS_LABELS[record.status] || record.status;
              return (
                <View key={transaction.key} style={dynamicStyles.adminLogPaymentRow({ c })}>
                  <View style={staticStyles.adminLogPaymentHeader}>
                    <Text style={s.cardTitle}>{record.paymentType === 'Extension' ? 'Extension payment' : 'Reservation payment'} #{record.id}</Text>
                    <Tag kind={paymentStatusKind(record.status)} text={statusLabel} />
                  </View>
                  <Text style={s.muted}>{record.studentName} · Reservation #{record.reservationId} · Locker {record.slot}</Text>
                  <Text style={s.muted}>{fd(record.date)} · {ft(record.time)}</Text>
                  {record.paymentType === 'Extension' ? <Text style={s.muted}>Additional time: {record.additionalMinutes || 0} minutes</Text> : null}
                  <Text style={s.muted}>Amount: PHP {Number(record.amount).toFixed(2)}</Text>
                  <Text style={s.muted}>Submitted: {dateTimeLabel(record.submittedAt)}</Text>
                  {record.processedAt ? <Text style={s.muted}>Processed: {dateTimeLabel(record.processedAt)}</Text> : null}
                </View>
              );
            }) : null}
            {!paymentsLoading && !paymentsError && !paymentTransactions.length ? <Text style={s.empty}>No payment transactions yet.</Text> : null}
          </>
        ) : null}
      </View>
    </Layout>
  );
}

export default CabinetAccessLogs;
