import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { useApp } from '../../shared/hooks/useApp';
import { fd, ft } from '../../shared/utils/date';
import { Btn, InfoModal, Tag } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';

const dateLabel = (value) => value ? String(value).replace('T', ' ') : '—';
const amountLabel = (value) => `PHP ${Number(value).toFixed(2)}`;

function PaymentVerification({ payment, busy, onViewReceipt, onProcess }) {
  const { s, c } = useApp();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const submitRejection = () => {
    const value = reason.trim();
    if (!value) {
      setReasonError('Enter a reason for rejecting this payment.');
      return;
    }
    setRejecting(false);
    setReason('');
    setReasonError('');
    onProcess(payment, 'reject', value);
  };
  return (
    <>
      <View style={dynamicStyles.financeRecordCard({ c })}>
        <View style={staticStyles.financeQueueHeader}>
          <View style={staticStyles.financeRecordIdentity}>
            <Text style={s.cardSub}>PAYMENT REVIEW</Text>
            <Text style={s.cardTitle}>Payment #{payment.id}</Text>
            <Text style={s.cardSub}>{payment.studentName}</Text>
          </View>
          <Tag kind="gold" text={PAYMENT_STATUS_LABELS[payment.status] || payment.status} />
        </View>
        <View style={[staticStyles.financeRecordDetails, { borderColor:c.line }]}>
          <View style={staticStyles.financeRecordDetailRow}>
            <Text style={s.muted}>Reservation</Text>
            <Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>#{payment.reservationId} · Locker {payment.slot}</Text>
          </View>
          <View style={staticStyles.financeRecordDetailRow}>
            <Text style={s.muted}>Reserved for</Text>
            <Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{fd(payment.date)} · {ft(payment.time)}</Text>
          </View>
          <View style={staticStyles.financeRecordDetailRow}>
            <Text style={s.muted}>Submitted</Text>
            <Text style={[staticStyles.financeRecordDetailValue,{ color:c.text }]}>{dateLabel(payment.submittedAt)}</Text>
          </View>
        </View>
        <View style={[staticStyles.financeRecordAmount,{ backgroundColor:c.soft,borderColor:c.line }]}>
          <Text style={s.muted}>Amount paid</Text>
          <Text style={dynamicStyles.financeRecordAmount({ c, emphasis:true })}>{amountLabel(payment.amount)}</Text>
        </View>
        <Btn small variant="outline" icon="image-outline" label="View receipt" onPress={() => onViewReceipt(payment)} />
        <View style={[staticStyles.financeRecordActions,{ borderColor:c.line }]}>
          <Btn small variant="primary" icon="checkmark-circle-outline" label="Approve" onPress={busy === payment.id ? undefined : () => onProcess(payment, 'verify')} />
          <Btn small variant="danger" icon="close-circle-outline" label="Reject" onPress={busy === payment.id ? undefined : () => { setReason(''); setReasonError(''); setRejecting(true); }} />
        </View>
        {busy === payment.id ? <Text style={[s.muted, staticStyles.paymentVerificationText3]}>Processing…</Text> : null}
      </View>
      <InfoModal visible={rejecting} title={`Reject payment ID #${payment.id}`} onClose={() => setRejecting(false)}>
        <Text style={s.cardSub}>Enter the reason that will be included in the rider&apos;s notification.</Text>
        <TextInput
          accessibilityLabel="Payment rejection reason"
          style={[s.input, { marginTop:10, minHeight:90, textAlignVertical:'top' }]}
          multiline
          maxLength={350}
          value={reason}
          onChangeText={(value) => { setReason(value); setReasonError(''); }}
          placeholder="Rejection reason"
          placeholderTextColor={c.muted}
        />
        {reasonError ? <Text style={s.err}>{reasonError}</Text> : null}
        <View style={[s.row, { justifyContent:'flex-end', marginTop:12 }]}>
          <Btn variant="outline" label="Cancel" onPress={() => setRejecting(false)} />
          <Btn variant="danger" label="Reject payment" onPress={submitRejection} />
        </View>
      </InfoModal>
    </>
  );
}

export default PaymentVerification;
