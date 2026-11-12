import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { confirmBox } from '../../shared/utils/actions';
import { PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { useApp } from '../../shared/hooks/useApp';
import { Btn, Tag } from '../../components/common';

const dateLabel = (value) => value ? String(value).replace('T', ' ') : '—';
const amountLabel = (value) => `PHP ${Number(value).toFixed(2)}`;

function PaymentVerification({ payment, busy, onViewReceipt, onProcess }) {
  const { s, c } = useApp();
  return (
    <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 16, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={s.cardTitle}>Payment #{payment.id}</Text><Tag kind="gold" text={PAYMENT_STATUS_LABELS[payment.status] || payment.status} />
      </View>
      <Text style={[s.text, { marginTop: 8 }]}>{payment.studentName} · Reservation #{payment.reservationId}</Text>
      <Text style={s.muted}>{amountLabel(payment.amount)}</Text>
      <Text style={s.muted}>Submitted {dateLabel(payment.submittedAt)}</Text>
      <Pressable onPress={() => onViewReceipt(payment)} style={{ marginTop: 12, alignSelf: 'flex-start' }}>
        <View style={{ width: 100, height: 100, borderRadius: 10, backgroundColor: c.soft, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: c.primary, fontWeight: '700' }}>View receipt</Text>
        </View>
      </Pressable>
      <View style={[s.row, { marginTop: 14 }]}>
        <Btn small variant="primary" icon="checkmark-circle-outline" label="Approve" onPress={busy === payment.id ? undefined : () => onProcess(payment, 'verify')} />
        <Btn small variant="danger" icon="close-circle-outline" label="Reject" onPress={busy === payment.id ? undefined : () => confirmBox('Reject payment', `Reject payment #${payment.id}?`, 'Reject', () => onProcess(payment, 'reject'))} />
      </View>
      {busy === payment.id ? <Text style={[s.muted, { marginTop: 8 }]}>Processing…</Text> : null}
    </View>
  );
}

export default PaymentVerification;
