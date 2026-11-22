import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
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
      <View style={dynamicStyles.paymentVerificationView1({ c })}>
        <View style={staticStyles.paymentVerificationView2}>
          <Text style={s.cardTitle}>Payment #{payment.id}</Text><Tag kind="gold" text={PAYMENT_STATUS_LABELS[payment.status] || payment.status} />
        </View>
        <Text style={[s.text, staticStyles.paymentVerificationText3]}>{payment.studentName} · Reservation #{payment.reservationId}</Text>
        <Text style={s.muted}>Slot {payment.slot} · {fd(payment.date)} · {ft(payment.time)}</Text>
        <Text style={s.muted}>{amountLabel(payment.amount)}</Text>
        <Text style={s.muted}>Submitted {dateLabel(payment.submittedAt)}</Text>
        <Pressable onPress={() => onViewReceipt(payment)} style={staticStyles.paymentVerificationPressable4}>
          <View style={dynamicStyles.paymentVerificationView5({ c })}>
            <Text style={dynamicStyles.paymentVerificationText6({ c })}>View receipt</Text>
          </View>
        </Pressable>
        <View style={[s.row, staticStyles.paymentVerificationView7]}>
          <Btn small variant="primary" icon="checkmark-circle-outline" label="Approve" onPress={busy === payment.id ? undefined : () => onProcess(payment, 'verify')} />
          <Btn small variant="danger" icon="close-circle-outline" label="Reject" onPress={busy === payment.id ? undefined : () => { setReason(''); setReasonError(''); setRejecting(true); }} />
        </View>
        {busy === payment.id ? <Text style={[s.muted, staticStyles.paymentVerificationText3]}>Processing…</Text> : null}
      </View>
      <InfoModal visible={rejecting} title={`Reject payment #${payment.id}`} onClose={() => setRejecting(false)}>
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
