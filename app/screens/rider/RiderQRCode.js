import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../../shared/hooks/useApp';
import { getReservationQr } from '../../services/cabinetService';
import { isPast, fd, ft } from '../../shared/utils/date';
import { sharePdf, shareText } from '../../shared/utils/actions';
import { lift, WEB } from '../../shared/constants/theme';
import { Layout, IconBox, Btn, Shield, Tag } from '../../components';
import { staticStyles, dynamicStyles, riderExportStyles } from '../../components/rider.styles';

function QRScreen({ id }) {
  const { db, mine, nav, refresh, toast, s, c } = useApp();
  const r = mine();
  const qrEligibleStatuses = ['Confirmed', 'Active', 'Used'];
  const hasVerifiedPayment = (reservationId) => (db.payments || []).some((item) =>
    item.reservationId === reservationId && item.status === 'Verified');
  const qrEligibleReservations = r.filter((reservation) =>
    qrEligibleStatuses.includes(reservation.status) && hasVerifiedPayment(reservation.id));
  const x = id
    ? r.find((v) => String(v.id) === String(id))
    : qrEligibleReservations.find((reservation) => reservation.status === 'Active')
      || qrEligibleReservations.find((reservation) => !isPast(reservation))
      || r.find((reservation) => !isPast(reservation))
      || qrEligibleReservations[0]
      || r[r.length - 1];
  const ref = useRef(null);
  const [value, setValue] = useState('');
  const [qrError, setQrError] = useState('');
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [refreshingQr, setRefreshingQr] = useState(false);
  const payment = (db.payments || []).filter((item) => item.reservationId === x?.id).sort((a, b) => b.id - a.id)[0];
  const verified = !!x
    && qrEligibleStatuses.includes(x.status)
    && hasVerifiedPayment(x.id);
  const paymentRejected = payment?.status === 'Rejected';
  const paymentPending = payment?.status === 'Pending';
  const paymentTitle = paymentRejected ? 'Payment rejected' : paymentPending ? 'Payment pending' : 'Payment required';
  const paymentMessage = paymentRejected
    ? 'Resubmit your receipt from My Reservations to get your QR code.'
    : paymentPending
      ? 'Finance is reviewing your receipt. Your QR code will appear after approval.'
      : 'Submit your payment in My Reservations to get your QR code.';
  const qrErrorMessage = /viewed between 6:00 AM and 9:00 PM/i.test(qrError)
    ? 'Your QR code is available between 6:00 AM and 9:00 PM.'
    : qrError;

  useEffect(() => {
    let active = true;
    setValue('');
    setQrError('');
    if (!verified || !x) return () => { active = false; };
    getReservationQr(x.id)
      .then((result) => { if (active) setValue(result.code); })
      .catch((error) => { if (active) setQrError(error.message); });
    return () => { active = false; };
  }, [x?.id, verified]);

  const refreshQr = async () => {
    if (refreshingQr) return;
    setRefreshingQr(true);
    try {
      await refresh();
      if (!x || !verified) return;
      const result = await getReservationQr(x.id);
      setValue(result.code);
      setQrError('');
    } catch (error) {
      setValue('');
      setQrError(error.message || 'Could not refresh the QR code. Try again.');
    } finally {
      setRefreshingQr(false);
    }
  };

  const download = () => {
    if (!ref.current) return;
    ref.current.toDataURL(async (b64) => {
      if (WEB) {
        const a = document.createElement('a');
        a.href = 'data:image/png;base64,' + b64; a.download = `reservation-${x.id}-qr.png`;
        document.body.appendChild(a); a.click(); a.remove();
        return toast('QR code download started.');
      }
      const html = `<html><body ${riderExportStyles.qrBody}><h2 ${riderExportStyles.qrTitle}>HelMate</h2><img src="data:image/png;base64,${b64}" width="300" height="300"/><h1>Reservation #${x.id}</h1><p>Locker ${x.slot} · ${fd(x.date)} · ${ft(x.time)}</p></body></html>`;
      try { await sharePdf(html, toast); } catch (_e) { toast('Could not save the QR code.'); }
    });
  };
  const share = async () => {
    await shareText(`My helmet storage reservation: Locker ${x.slot}, ${fd(x.date)} at ${ft(x.time)} (ID ${x.id}).`, toast, 'Helmet Reservation');
  };
  const checkPaymentStatus = async () => {
    if (checkingPayment) return;
    setCheckingPayment(true);
    try {
      const latest = await refresh();
      const latestPayment = (latest.payments || [])
        .filter((item) => item.reservationId === x?.id)
        .sort((a, b) => b.id - a.id)[0];
      if (latestPayment?.status === 'Verified') toast('Payment verified. Your QR code is updating.');
      else if (latestPayment?.status === 'Rejected') toast('Payment rejected. Check My Reservations for details.');
      else if (latestPayment?.status === 'Pending') toast('Payment is still pending verification.');
      else toast('No payment found. Submit payment in My Reservations.');
    } catch (error) {
      toast(error.message || 'Could not check payment status. Try again.');
    } finally {
      setCheckingPayment(false);
    }
  };
  const Info = ({ label, value: v, last = false }) => (
    <View style={[staticStyles.riderQRCodeView1,{ borderColor:c.line, borderBottomWidth:last ? 0 : 1 }]}>
      <Text style={dynamicStyles.riderQRCodeText2({ c })}>{label}</Text>
      <Text style={dynamicStyles.riderQRCodeText3({ c })}>{v}</Text>
    </View>
  );

  return (
    <Layout cur="qr" title="QR Code" subtitle="Available 6:00 AM–9:00 PM. Access follows your reservation time." onRefresh={refreshQr} refreshing={refreshingQr}>
      {!x ? (
        <View style={[s.card, staticStyles.riderQRCodeView4]}>
          <IconBox icon="qr-code-outline" tone="gold" size={60} />
          <Text style={s.empty}>You have no reservations yet, so there is no QR code to show.</Text>
          <Btn label="Make a reservation" onPress={() => nav('reservations')} />
        </View>
      ) : !verified ? (
        <View style={[s.card, staticStyles.riderQrPaymentCard, { borderColor:c.line }]}>
          <View style={staticStyles.riderQrPaymentHeading}>
            <View style={[staticStyles.riderQrPaymentIcon, { backgroundColor:paymentRejected ? c.badBg : c.goldBg }]}>
              <Ionicons name={paymentRejected ? 'alert-circle-outline' : paymentPending ? 'time-outline' : 'card-outline'} size={22} color={paymentRejected ? c.bad : c.gold} />
            </View>
            <View style={staticStyles.riderQrPaymentHeadingText}>
              <Text style={dynamicStyles.riderQrPaymentTitle({ c })}>{paymentTitle}</Text>
              <Text style={dynamicStyles.riderQrPaymentStatus({ c, paymentRejected, paymentPending })}>{paymentRejected ? 'Action needed' : paymentPending ? 'Waiting for review' : 'No payment submitted'}</Text>
            </View>
          </View>
          <Text style={[s.muted, staticStyles.riderQrPaymentMessage]}>{paymentMessage}</Text>
          <View style={[staticStyles.riderQrPaymentReservation, { backgroundColor:c.soft, borderColor:c.line }]}>
            <Text style={dynamicStyles.riderQrPaymentLabel({ c })}>RESERVATION #{x.id}</Text>
            <View style={staticStyles.riderQrPaymentReservationRow}>
              <View style={staticStyles.riderQrPaymentReservationText}>
                <Text style={{ color:c.text, fontWeight:'800' }}>Locker {x.slot}</Text>
                <Text style={s.muted}>{fd(x.date)} · {ft(x.time)}</Text>
              </View>
              {x.totalPrice != null ? <Text style={dynamicStyles.riderQrPaymentAmount({ c })}>₱{Number(x.totalPrice).toFixed(2)}</Text> : null}
            </View>
          </View>
          {paymentRejected && payment?.rejectionReason ? <View style={[staticStyles.riderQrPaymentRejection, { backgroundColor:c.badBg }]}><Text style={{ color:c.bad, fontWeight:'600' }}>{payment.rejectionReason}</Text></View> : null}
          <View style={staticStyles.riderQrPaymentActions}>
            <Btn full icon="calendar-outline" label={paymentRejected ? 'Resubmit payment' : 'Go to My Reservations'} onPress={() => nav('myReservations')} />
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled:checkingPayment }} disabled={checkingPayment} onPress={checkPaymentStatus} style={staticStyles.riderQrPaymentCheck}>
              <Ionicons name="refresh-outline" size={17} color={c.primary} />
              <Text style={{ color:c.primary, fontWeight:'700' }}>{checkingPayment ? 'Checking payment…' : 'Check payment status'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : qrError ? (
        <View style={[s.card, staticStyles.riderQRCodeView4]}>
          <Text style={s.err}>{qrErrorMessage}</Text>
        </View>
      ) : !value ? (
        <View style={[s.card, staticStyles.riderQRCodeView4]}>
          <ActivityIndicator color={c.gold} />
          <Text style={s.cardSub}>Loading verified QR code…</Text>
        </View>
      ) : (
        <View style={staticStyles.riderQRCodeView8}>
          <View style={dynamicStyles.riderQRCodeView9({ c, lift })}>
            <View style={staticStyles.riderQRCodeView10}>
              <View style={staticStyles.riderQRCodeView11}><Shield size={30} /><View><Text style={[staticStyles.riderQRCodeText12,{ color:c.text }]}>Access Pass</Text><Text style={[staticStyles.riderQRCodeText13,{ color:c.muted }]}>Helmet Storage</Text></View></View>
              <Tag kind={x.status === 'Used' ? 'mute' : 'gold'} text={x.status === 'Used' ? 'COMPLETED' : x.stored ? 'STORED' : 'VALID'} />
            </View>
            <View style={staticStyles.riderQRCodeView14}>
              <View style={staticStyles.riderQRCodeView15}>
                <QRCode value={value} size={210} getRef={(r2) => (ref.current = r2)} />
              </View>
              <Text style={dynamicStyles.riderQRCodeText16({ c })}>Show this code to Security. Locker access starts at your reserved time.</Text>
            </View>
            <View style={staticStyles.riderQRCodeView17}>
              <View style={dynamicStyles.riderQRCodeView18({ c })} />
              <View style={dynamicStyles.riderQRCodeView19({ c })} />
              <View style={dynamicStyles.riderQRCodeView20({ c })} />
            </View>
            <View style={staticStyles.riderQRCodeView21}>
              <Text style={s.cardTitle}>Reservation details</Text>
              <View style={[staticStyles.riderQRCodeView22,{ borderTopWidth:1,borderColor:c.line }]}>
                <Info label="Reservation" value={`#${x.id}`} />
                <Info label="Locker" value={`Locker ${x.slot}`} />
                <Info label="Date" value={fd(x.date)} />
                <Info label="Time" value={ft(x.time)} last />
              </View>
              <View style={staticStyles.riderQRCodeView23}>
                <Btn style={staticStyles.riderQRCodeAction} variant="primary" icon="download-outline" label="Download" onPress={download} />
                <Btn style={staticStyles.riderQRCodeAction} variant="outline" icon="share-social-outline" label="Share" onPress={share} />
              </View>
            </View>
          </View>
        </View>
      )}
    </Layout>
  );
}

export default QRScreen;
