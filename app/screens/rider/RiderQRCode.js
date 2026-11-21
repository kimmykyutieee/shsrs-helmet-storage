import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '../../shared/hooks/useApp';
import { getReservationQr } from '../../services/cabinetService';
import { isPast, fd, ft } from '../../shared/utils/date';
import { sharePdf, shareText } from '../../shared/utils/actions';
import { lift, WEB } from '../../shared/constants/theme';
import { Layout, IconBox, Btn, Gradient, Shield, Tag } from '../../components';
import { staticStyles, dynamicStyles, riderExportStyles } from '../../components/rider.styles';

function QRScreen({ id }) {
  const { db, mine, nav, refresh, toast, s, c } = useApp();
  const r = mine();
  const x = id ? r.find((v) => v.id === id) : r.filter((v) => !isPast(v))[0] || r[r.length - 1];
  const ref = useRef(null);
  const [value, setValue] = useState('');
  const [qrError, setQrError] = useState('');
  const payment = (db.payments || []).filter((item) => item.reservationId === x?.id).sort((a, b) => b.id - a.id)[0];
  const verified = x?.status === 'Confirmed' && payment?.status === 'Verified';

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

  const download = () => {
    if (!ref.current) return;
    ref.current.toDataURL(async (b64) => {
      if (WEB) {
        const a = document.createElement('a');
        a.href = 'data:image/png;base64,' + b64; a.download = `reservation-${x.id}-qr.png`;
        document.body.appendChild(a); a.click(); a.remove();
        return toast('QR code download started.');
      }
      const html = `<html><body ${riderExportStyles.qrBody}><h2 ${riderExportStyles.qrTitle}>Helmet Reservation Storage System</h2><img src="data:image/png;base64,${b64}" width="300" height="300"/><h1>Reservation #${x.id}</h1><p>Slot ${x.slot} · ${fd(x.date)} · ${ft(x.time)}</p></body></html>`;
      try { await sharePdf(html, toast); } catch (_e) { toast('Could not save the QR code.'); }
    });
  };
  const share = async () => {
    await shareText(`My helmet storage reservation: Slot ${x.slot}, ${fd(x.date)} at ${ft(x.time)} (ID ${x.id}).`, toast, 'Helmet Reservation');
  };
  const Info = ({ label, value: v }) => (
    <View style={staticStyles.riderQRCodeView1}><Text style={dynamicStyles.riderQRCodeText2({ c })}>{label}</Text><Text style={dynamicStyles.riderQRCodeText3({ c })}>{v}</Text></View>
  );

  return (
    <Layout cur="qr" title="QR Code" subtitle="Show this pass at the cabinet scanner.">
      {!x ? (
        <View style={[s.card, staticStyles.riderQRCodeView4]}>
          <IconBox icon="qr-code-outline" tone="gold" size={60} />
          <Text style={s.empty}>You have no reservations yet, so there is no QR code to show.</Text>
          <Btn label="Make a reservation" onPress={() => nav('reservations')} />
        </View>
      ) : !verified ? (
        <View style={[s.card, staticStyles.riderQRCodeView4]}>
          <IconBox icon="card-outline" tone="gold" size={60} />
          <Text style={s.cardTitle}>{payment?.status === 'Rejected' ? 'Payment rejected' : payment?.status === 'Pending' ? 'Pending Verification' : 'Payment required'}</Text>
          <Text style={s.empty}>{payment?.status === 'Rejected' ? 'Submit a new receipt from Reservations. A QR code is unavailable until Finance verifies payment.' : 'Submit the PHP 25.00 payment and wait for Finance verification before accessing your QR code.'}</Text>
          <Btn variant="outline" icon="refresh-outline" label="Check payment status" onPress={refresh} />
          <Btn label="Go to reservations" onPress={() => nav('reservations')} />
        </View>
      ) : qrError ? (
        <View style={[s.card, staticStyles.riderQRCodeView4]}>
          <Text style={s.err}>{qrError}</Text>
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
              <Gradient id="tk" from="#08122b" to="#17397f" />
              <View style={staticStyles.riderQRCodeView11}><Shield size={30} /><View><Text style={staticStyles.riderQRCodeText12}>Access Pass</Text><Text style={staticStyles.riderQRCodeText13}>Helmet Storage</Text></View></View>
              <Tag kind={isPast(x) ? 'mute' : 'gold'} text={isPast(x) ? 'COMPLETED' : x.stored ? 'STORED' : 'VALID'} />
            </View>
            <View style={staticStyles.riderQRCodeView14}>
              <View style={staticStyles.riderQRCodeView15}>
                <QRCode value={value} size={210} getRef={(r2) => (ref.current = r2)} />
              </View>
              <Text style={dynamicStyles.riderQRCodeText16({ c })}>Scan this code at the cabinet to unlock it.</Text>
            </View>
            <View style={staticStyles.riderQRCodeView17}>
              <View style={dynamicStyles.riderQRCodeView18({ c })} />
              <View style={dynamicStyles.riderQRCodeView19({ c })} />
              <View style={dynamicStyles.riderQRCodeView20({ c })} />
            </View>
            <View style={staticStyles.riderQRCodeView21}>
              <View style={staticStyles.riderQRCodeView22}>
                <Info label="RESERVATION" value={`#${x.id}`} /><Info label="SLOT" value={`Slot ${x.slot}`} />
                <Info label="DATE" value={fd(x.date)} /><Info label="TIME" value={ft(x.time)} />
              </View>
              <View style={staticStyles.riderQRCodeView23}>
                <Btn style={staticStyles.cabinetScannerCameraView5} variant="primary" icon="download-outline" label="Download" onPress={download} />
                <Btn style={staticStyles.cabinetScannerCameraView5} variant="outline" icon="share-social-outline" label="Share" onPress={share} />
              </View>
            </View>
          </View>
        </View>
      )}
    </Layout>
  );
}

export default QRScreen;
