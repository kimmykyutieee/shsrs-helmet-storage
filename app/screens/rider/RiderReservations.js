import React, { useState } from 'react';
import { View, Text, TextInput, Image, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { createReservation, updateReservation, cancelReservation } from '../../services/reservationService';
import { submitPayment } from '../../services/paymentService';
import { dt, fd, ft, isPast, esc } from '../../shared/utils/date';
import { sharePdf, confirmBox } from '../../shared/utils/actions';
import { PAYMENT_AMOUNT, PAYMENT_CURRENCY, PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { GOLD } from '../../shared/constants/theme';
import { Layout, SlotGrid, DateTimeFields, Btn, Tag, InfoModal, IconBox } from '../../components';
import { staticStyles, dynamicStyles, riderExportStyles } from '../../components/rider.styles';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

function Reservations({ mode = 'booking' }) {
  const { db, refresh, me, mine, nav, toast, s, c, wide } = useApp();
  const [sel, setSel] = useState(0);
  const [rd, setRd] = useState(''); const [rt, setRt] = useState('');
  const [qi, setQi] = useState(''); const [q, setQ] = useState('');
  const [er, setEr] = useState('');
  const [edit, setEdit] = useState(null);
  const [nd, setNd] = useState(''); const [nt, setNt] = useState(''); const [er3, setEr3] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [receipt, setReceipt] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);

  const paymentFor = (id) => (db.payments || []).filter((payment) => payment.reservationId === id).sort((a, b) => b.id - a.id)[0];

  const taken = new Set(rd ? (db.slotReservations || []).filter((r) => r.date === rd).map((r) => r.slot) : []);
  const eff = db.blocked.includes(sel) || taken.has(sel) ? 0 : sel;
  const rows = mine().filter((r) => `slot ${r.slot} ${r.date} ${fd(r.date)} ${ft(r.time)}`.toLowerCase().includes(q.toLowerCase()));

  const book = async () => {
    if (!eff) return setEr('Please select a slot.');
    if (!rd) return setEr('Please choose a date.');
    if (!rt) return setEr('Please choose a time.');
    if (dt(rd, rt) < new Date()) return setEr('Please choose a future date and time.');
    try {
      const r = await createReservation({ slot: eff, date: rd, time: rt });
      await refresh();
      toast(`Slot ${eff} reserved for ${fd(rd)}.`);
      setSel(0); setRd(''); setRt(''); setEr('');
      setPayFor(r.id); setReceipt(''); setReceiptFile(null); setPaymentError('');
    } catch (x) { setEr(x.message); refresh().catch(() => {}); }
  };

  const pickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false });
      const asset = result?.assets?.[0];
      if (!asset || result.canceled) return;
      let file;
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error('Could not read the selected image.');
        const blob = await response.blob();
        if (blob.size > MAX_RECEIPT_BYTES) return setPaymentError('The image must be 5 MB or smaller.');
        if (!blob.size) return setPaymentError('Choose a non-empty image file.');
        file = {
          file: blob,
          name: asset.fileName || `payment-proof-${Date.now()}`,
          type: blob.type || asset.mimeType || 'application/octet-stream',
        };
      } else {
        if (asset.fileSize > MAX_RECEIPT_BYTES) return setPaymentError('The image must be 5 MB or smaller.');
        file = {
          uri: asset.uri,
          name: asset.fileName || `payment-proof-${Date.now()}`,
          type: asset.mimeType || 'application/octet-stream',
        };
      }
      setReceiptFile(file);
      setReceipt(asset.uri);
      setPaymentError('');
    } catch (x) { setPaymentError(x.message); }
  };

  const handleSubmitPayment = async () => {
    if (!receiptFile && !receipt) return setPaymentError('Upload a receipt image.');
    setPaymentBusy(true); setPaymentError('');
    try {
      await submitPayment(payFor, receiptFile || receipt);
      setPayFor(null); setReceipt(''); setReceiptFile(null);
      toast('Payment submitted for Finance review.');
      try { await refresh(); }
      catch (x) { toast(`Payment was submitted, but reservation details could not refresh: ${x.message}`); }
    } catch (x) { setPaymentError(x.message); }
    setPaymentBusy(false);
  };

  const cancel = (id) => confirmBox('Cancel reservation', 'Cancel this reservation?', 'Yes, cancel', async () => {
    try { await cancelReservation(id); await refresh(); toast('Reservation cancelled.'); } catch (x) { toast(x.message); }
  });

  const openEdit = (r) => { setEdit(r); setNd(r.date); setNt(r.time); setEr3(''); };
  const saveEdit = async () => {
    if (!nd || !nt) return setEr3('Choose a date and time.');
    if (dt(nd, nt) < new Date()) return setEr3('Choose a future date and time.');
    try { await updateReservation(edit.id, { date: nd, time: nt }); await refresh(); setEdit(null); toast('Reservation rescheduled.'); }
    catch (x) { setEr3(x.message); }
  };

  const pdf = async () => {
    const r = mine();
    if (!r.length) return toast('No reservations to export.');
    const td = riderExportStyles.tableCell;
    const html = `<html><body ${riderExportStyles.reservationBody}><div ${riderExportStyles.reservationHeader}><h2 ${riderExportStyles.reservationTitle}>Helmet Reservation Storage System</h2><p ${riderExportStyles.reservationMeta}>Reservations for ${esc(me.name)} (${esc(me.email)}) · Generated ${esc(new Date().toLocaleString())}</p></div><table ${riderExportStyles.reservationTable}><thead><tr>${['ID', 'Slot', 'Date', 'Time', 'Status'].map((h) => `<th ${riderExportStyles.reservationHeading}>${h}</th>`).join('')}</tr></thead><tbody>${r.map((x) => `<tr><td ${td}>#${x.id}</td><td ${td}>Slot ${x.slot}</td><td ${td}>${fd(x.date)}</td><td ${td}>${ft(x.time)}</td><td ${td}>${isPast(x) ? 'Completed' : 'Upcoming'}</td></tr>`).join('')}</tbody></table></body></html>`;
    try { await sharePdf(html, toast); } catch (_e) { toast('Could not create the PDF.'); }
  };

  return (
    <Layout cur={mode === 'mine' ? 'myReservations' : 'reservations'} title={mode === 'mine' ? 'My Reservations' : 'Reservation'} subtitle={mode === 'mine' ? 'Review and manage your reservations.' : 'Book a cabinet slot.'}>
      <View style={dynamicStyles.cabinetScannerView1({ wide })}>
        {mode !== 'mine' ? <View style={dynamicStyles.riderReservationsView2({ wide })}>
          <View style={s.card}>
            <Text style={s.cardTitle}>1 · Select a slot</Text>
            <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>Choose any available cabinet slot.</Text>
            <SlotGrid taken={taken} blocked={db.blocked} sel={eff} onSel={setSel} />
            <Text style={s.cardTitle}>2 · Pick date &amp; time</Text>
            <Text style={[s.cardSub, staticStyles.riderReservationsText4]}>Availability updates for the date you choose.</Text>
            <DateTimeFields date={rd} time={rt} onDate={setRd} onTime={setRt} />
            {er ? <View style={dynamicStyles.riderReservationsView5({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.riderReservationsText6({ c })}>{er}</Text></View> : null}
            <View style={staticStyles.riderReservationsView7}><Btn full icon="checkmark-circle-outline" label="Confirm booking" onPress={book} /></View>
          </View>
        </View> : null}
        {mode !== 'booking' ? <View style={dynamicStyles.riderReservationsView8({ wide })}>
          <View style={s.card}>
            <View style={staticStyles.riderReservationsView9}>
              <View><Text style={s.cardTitle}>My Reservations</Text><Text style={s.cardSub}>{rows.length} shown</Text></View>
              <Btn small variant="outline" icon="download-outline" label="PDF" onPress={pdf} />
            </View>
            <View style={staticStyles.riderReservationsView10}>
              <View style={staticStyles.riderReservationsView11}>
                <Ionicons name="search-outline" size={17} color={c.muted} style={staticStyles.riderReservationsIonicons12} />
                <TextInput style={[s.input, staticStyles.riderReservationsTextInput13]} placeholder="Search slot or date…" placeholderTextColor={c.muted} value={qi} onChangeText={setQi} onSubmitEditing={() => setQ(qi)} returnKeyType="search" />
              </View>
              <Btn variant="soft" label="Search" onPress={() => setQ(qi)} />
            </View>
            {rows.length ? rows.map((r) => {
              const payment = paymentFor(r.id);
              const canOpenQr = r.status === 'Confirmed' && payment?.status === 'Verified';
              return (
              <View key={r.id} style={dynamicStyles.riderReservationsView14({ c })}>
                <View style={dynamicStyles.riderReservationsView15({ GOLD, c, isPast, r })} />
                <View style={staticStyles.riderReservationsView16}>
                  <View style={staticStyles.riderReservationsView17}>
                    <Text style={dynamicStyles.riderReservationsText18({ c })}>Slot {r.slot} <Text style={dynamicStyles.riderReservationsText19({ c })}> #{r.id}</Text></Text>
                    <View style={s.row}>
                      {r.stored ? <Tag kind="gold" text="Stored" /> : null}
                      <Tag kind={isPast(r) ? 'mute' : 'ok'} text={isPast(r) ? 'Completed' : 'Upcoming'} />
                      <Tag kind={r.status === 'Confirmed' ? 'ok' : 'gold'} text={r.status || 'Pending'} />
                      <Tag kind={payment?.status === 'Verified' ? 'ok' : payment?.status === 'Rejected' ? 'bad' : 'gold'} text={PAYMENT_STATUS_LABELS[payment?.status] || 'Payment required'} />
                    </View>
                  </View>
                  <View style={staticStyles.riderReservationsView20}>
                    <View style={s.row}><Ionicons name="calendar-outline" size={14} color={c.muted} /><Text style={s.muted}>{fd(r.date)}</Text></View>
                    <View style={s.row}><Ionicons name="time-outline" size={14} color={c.muted} /><Text style={s.muted}>{ft(r.time)}</Text></View>
                  </View>
                  <View style={[s.row, staticStyles.cabinetScannerView12]}>
                    {canOpenQr ? <Btn small variant="outline" icon="qr-code-outline" label="QR" onPress={() => nav('qr', r.id)} /> : null}
                    {!isPast(r) && r.status !== 'Confirmed' && payment?.status !== 'Pending' ? <Btn small variant="gold" icon="card-outline" label={payment?.status === 'Rejected' ? 'Resubmit payment' : `Pay ${PAYMENT_CURRENCY} ${PAYMENT_AMOUNT.toFixed(2)}`} onPress={() => { setPayFor(r.id); setReceipt(''); setReceiptFile(null); setPaymentError(''); }} /> : null}
                    {!isPast(r) && <Btn small variant="outline" icon="create-outline" label="Reschedule" onPress={() => openEdit(r)} />}
                    <Btn small variant="outline" icon="trash-outline" onPress={() => cancel(r.id)} />
                  </View>
                </View>
              </View>
            );}) : (
              <View style={staticStyles.riderReservationsView22}>
                <IconBox icon="calendar-outline" tone="gold" size={56} />
                <Text style={s.empty}>{q ? 'No reservations match your search.' : 'No reservations yet.\nPick a slot, date and time to get started.'}</Text>
              </View>
            )}
          </View>
        </View> : null}
      </View>

      <InfoModal visible={!!edit} title={edit ? `Reschedule Slot ${edit.slot}` : ''} onClose={() => setEdit(null)}>
        <DateTimeFields date={nd} time={nt} onDate={setNd} onTime={setNt} />
        {er3 ? <Text style={[s.err, staticStyles.riderReservationsText23]}>{er3}</Text> : null}
        <View style={staticStyles.riderReservationsView24}><Btn full label="Save changes" onPress={saveEdit} /></View>
      </InfoModal>
      <InfoModal visible={!!payFor} title="Submit reservation payment" onClose={() => paymentBusy ? null : setPayFor(null)}>
        <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>Required amount: {PAYMENT_CURRENCY} {PAYMENT_AMOUNT.toFixed(2)}. Finance must review your receipt before your QR code is released.</Text>
        <Btn variant="outline" icon="image-outline" label={receipt ? 'Replace receipt image' : 'Upload receipt image'} onPress={pickReceipt} />
        {receipt ? (
          <View style={[s.row, staticStyles.riderReservationsView26]}>
            <Image source={{ uri: receipt }} style={staticStyles.riderReservationsImage27} />
        <Btn small variant="outline" icon="trash-outline" label="Remove receipt" onPress={() => { setReceipt(''); setReceiptFile(null); setPaymentError(''); }} />
          </View>
        ) : null}
        {paymentError ? <Text style={[s.err, staticStyles.cabinetScannerView12]}>{paymentError}</Text> : null}
        <View style={staticStyles.riderReservationsView7}><Btn full label={paymentBusy ? 'Submitting…' : 'Submit payment'} onPress={paymentBusy ? undefined : handleSubmitPayment} /></View>
      </InfoModal>
    </Layout>
  );
}

export default Reservations;
