import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { confirmBox } from '../../shared/utils/actions';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { useApp } from '../../shared/hooks/useApp';
import { fd, ft } from '../../shared/utils/date';
import { Btn, Tag } from '../../components';
import { staticStyles, dynamicStyles } from '../../components/finance.styles';

const dateLabel = (value) => value ? String(value).replace('T', ' ') : '—';
const amountLabel = (value) => `PHP ${Number(value).toFixed(2)}`;

function PaymentVerification({ payment, busy, onViewReceipt, onProcess }) {
  const { s, c } = useApp();
  return (
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
        <Btn small variant="danger" icon="close-circle-outline" label="Reject" onPress={busy === payment.id ? undefined : () => confirmBox('Reject payment', `Reject payment #${payment.id}?`, 'Reject', () => onProcess(payment, 'reject'))} />
      </View>
      {busy === payment.id ? <Text style={[s.muted, staticStyles.paymentVerificationText3]}>Processing…</Text> : null}
    </View>
  );
}

export default PaymentVerification;
