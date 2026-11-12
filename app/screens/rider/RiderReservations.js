import React, { useState } from 'react';
import { View, Text, TextInput, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { createReservation, updateReservation, cancelReservation } from '../../services/reservationService';
import { submitPayment } from '../../services/paymentService';
import { dt, fd, ft, isPast, esc } from '../../shared/utils/date';
import { sharePdf, confirmBox } from '../../shared/utils/actions';
import { PAYMENT_AMOUNT, PAYMENT_CURRENCY, PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { GOLD } from '../../shared/constants/theme';
import { Layout, SlotGrid, DateTimeFields, Btn, Tag, InfoModal, IconBox } from '../../components/common';

function Reservations() {
  const { db, refresh, me, mine, nav, toast, s, c, wide } = useApp();
  const [sel, setSel] = useState(0);
  const [rd, setRd] = useState(''); const [rt, setRt] = useState('');
  const [qi, setQi] = useState(''); const [q, setQ] = useState('');
  const [er, setEr] = useState('');
  const [edit, setEdit] = useState(null);
  const [nd, setNd] = useState(''); const [nt, setNt] = useState(''); const [er3, setEr3] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [receipt, setReceipt] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);

  const paymentFor = (id) => (db.payments || []).filter((payment) => payment.reservationId === id).sort((a, b) => b.id - a.id)[0];

  const taken = new Set(rd ? db.res.filter((r) => r.date === rd).map((r) => r.slot) : []);
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
      setPayFor(r.id); setReceipt(''); setPaymentError('');
    } catch (x) { setEr(x.message); refresh().catch(() => {}); }
  };

  const pickReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6, base64: true });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const type = result.assets[0].mimeType || 'image/jpeg';
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return setPaymentError('Choose a JPG, PNG, or WebP receipt image.');
      setReceipt(`data:${type};base64,${result.assets[0].base64}`);
      setPaymentError('');
    } catch (x) { setPaymentError(x.message); }
  };

  const submitPayment = async () => {
    if (!receipt) return setPaymentError('Upload a receipt image.');
    setPaymentBusy(true); setPaymentError('');
    try {
      await submitPayment(payFor, receipt);
      await refresh();
      setPayFor(null); setReceipt('');
      toast('Payment submitted for Finance review.');
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
    const td = 'style="padding:10px;border-bottom:1px solid #e3e8f2"';
    const html = `<html><body style="font-family:Helvetica,Arial;padding:32px;color:#0f172a"><div style="border-bottom:3px solid #d4a017;padding-bottom:12px;margin-bottom:18px"><h2 style="margin:0;color:#0b1b3a">Helmet Reservation Storage System</h2><p style="margin:6px 0 0;color:#64748b">Reservations for ${esc(me.name)} (${esc(me.email)}) · Generated ${esc(new Date().toLocaleString())}</p></div><table style="width:100%;border-collapse:collapse"><thead><tr>${['ID', 'Slot', 'Date', 'Time', 'Status'].map((h) => `<th style="text-align:left;padding:10px;background:#0b1b3a;color:#fff">${h}</th>`).join('')}</tr></thead><tbody>${r.map((x) => `<tr><td ${td}>#${x.id}</td><td ${td}>Slot ${x.slot}</td><td ${td}>${fd(x.date)}</td><td ${td}>${ft(x.time)}</td><td ${td}>${isPast(x) ? 'Completed' : 'Upcoming'}</td></tr>`).join('')}</tbody></table></body></html>`;
    try { await sharePdf(html, toast); } catch (_e) { toast('Could not create the PDF.'); }
  };

  return (
    <Layout cur="reservations" title="Reservations" subtitle="Book a cabinet slot and manage your reservations.">
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ width: wide ? 440 : '100%' }}>
          <View style={s.card}>
            <Text style={s.cardTitle}>1 · Select a slot</Text>
            <Text style={[s.cardSub, { marginBottom: 16 }]}>Choose any available cabinet slot.</Text>
            <SlotGrid taken={taken} blocked={db.blocked} sel={eff} onSel={setSel} />
            <Text style={s.cardTitle}>2 · Pick date &amp; time</Text>
            <Text style={[s.cardSub, { marginBottom: 12 }]}>Availability updates for the date you choose.</Text>
            <DateTimeFields date={rd} time={rt} onDate={setRd} onTime={setRt} />
            {er ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.badBg, padding: 12, borderRadius: 12, marginTop: 14 }}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={{ color: c.bad, flex: 1, fontWeight: '600' }}>{er}</Text></View> : null}
            <View style={{ marginTop: 18 }}><Btn full icon="checkmark-circle-outline" label="Confirm booking" onPress={book} /></View>
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, width: wide ? undefined : '100%', minWidth: 0 }}>
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
              <View><Text style={s.cardTitle}>Current reservations</Text><Text style={s.cardSub}>{rows.length} shown</Text></View>
              <Btn small variant="outline" icon="download-outline" label="PDF" onPress={pdf} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Ionicons name="search-outline" size={17} color={c.muted} style={{ position: 'absolute', left: 13, zIndex: 1 }} />
                <TextInput style={[s.input, { paddingLeft: 38 }]} placeholder="Search slot or date…" placeholderTextColor={c.muted} value={qi} onChangeText={setQi} onSubmitEditing={() => setQ(qi)} returnKeyType="search" />
              </View>
              <Btn variant="soft" label="Search" onPress={() => setQ(qi)} />
            </View>
            {rows.length ? rows.map((r) => {
              const payment = paymentFor(r.id);
              const canOpenQr = r.status === 'Confirmed' && payment?.status === 'Verified';
              return (
              <View key={r.id} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, marginBottom: 10, backgroundColor: c.soft, flexDirection: 'row', overflow: 'hidden' }}>
                <View style={{ width: 5, backgroundColor: isPast(r) ? c.line : GOLD }} />
                <View style={{ flex: 1, padding: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 16 }}>Slot {r.slot} <Text style={{ color: c.muted, fontWeight: '600', fontSize: 13 }}> #{r.id}</Text></Text>
                    <View style={s.row}>
                      {r.stored ? <Tag kind="gold" text="Stored" /> : null}
                      <Tag kind={isPast(r) ? 'mute' : 'ok'} text={isPast(r) ? 'Completed' : 'Upcoming'} />
                      <Tag kind={payment?.status === 'Verified' ? 'ok' : payment?.status === 'Rejected' ? 'bad' : 'gold'} text={PAYMENT_STATUS_LABELS[payment?.status] || 'Payment required'} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={s.row}><Ionicons name="calendar-outline" size={14} color={c.muted} /><Text style={s.muted}>{fd(r.date)}</Text></View>
                    <View style={s.row}><Ionicons name="time-outline" size={14} color={c.muted} /><Text style={s.muted}>{ft(r.time)}</Text></View>
                  </View>
                  <View style={[s.row, { marginTop: 12 }]}>
                    {canOpenQr ? <Btn small variant="outline" icon="qr-code-outline" label="QR" onPress={() => nav('qr', r.id)} /> : null}
                    {!isPast(r) && r.status !== 'Confirmed' && payment?.status !== 'Pending' ? <Btn small variant="gold" icon="card-outline" label={payment?.status === 'Rejected' ? 'Resubmit payment' : `Pay ${PAYMENT_CURRENCY} ${PAYMENT_AMOUNT.toFixed(2)}`} onPress={() => { setPayFor(r.id); setReceipt(''); setPaymentError(''); }} /> : null}
                    {!isPast(r) && <Btn small variant="outline" icon="create-outline" label="Reschedule" onPress={() => openEdit(r)} />}
                    <Btn small variant="outline" icon="trash-outline" onPress={() => cancel(r.id)} />
                  </View>
                </View>
              </View>
            );}) : (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <IconBox icon="calendar-outline" tone="gold" size={56} />
                <Text style={s.empty}>{q ? 'No reservations match your search.' : 'No reservations yet.\nPick a slot, date and time to get started.'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <InfoModal visible={!!edit} title={edit ? `Reschedule Slot ${edit.slot}` : ''} onClose={() => setEdit(null)}>
        <DateTimeFields date={nd} time={nt} onDate={setNd} onTime={setNt} />
        {er3 ? <Text style={[s.err, { marginTop: 10 }]}>{er3}</Text> : null}
        <View style={{ marginTop: 16 }}><Btn full label="Save changes" onPress={saveEdit} /></View>
      </InfoModal>
      <InfoModal visible={!!payFor} title="Submit reservation payment" onClose={() => paymentBusy ? null : setPayFor(null)}>
        <Text style={[s.cardSub, { marginBottom: 16 }]}>Required amount: {PAYMENT_CURRENCY} {PAYMENT_AMOUNT.toFixed(2)}. Finance must review your receipt before your QR code is released.</Text>
        <Btn variant="outline" icon="image-outline" label={receipt ? 'Replace receipt image' : 'Upload receipt image'} onPress={pickReceipt} />
        {receipt ? (
          <View style={[s.row, { marginTop: 12, alignItems: 'center' }]}>
            <Image source={{ uri: receipt }} style={{ width: 120, height: 120, borderRadius: 12 }} />
            <Btn small variant="outline" icon="trash-outline" label="Remove receipt" onPress={() => { setReceipt(''); setPaymentError(''); }} />
          </View>
        ) : null}
        {paymentError ? <Text style={[s.err, { marginTop: 12 }]}>{paymentError}</Text> : null}
        <View style={{ marginTop: 18 }}><Btn full label={paymentBusy ? 'Submitting…' : 'Submit payment'} onPress={paymentBusy ? undefined : submitPayment} /></View>
      </InfoModal>
    </Layout>
  );
}

export default Reservations;
