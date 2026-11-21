import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Image, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { createReservation, updateReservation, cancelReservation } from '../../services/reservationService';
import { submitPayment } from '../../services/paymentService';
import { dt, fd, ft, isPast, esc } from '../../shared/utils/date';
import { sharePdf, confirmBox } from '../../shared/utils/actions';
import { PAYMENT_CURRENCY, PAYMENT_STATUS_LABELS } from '../../shared/constants/config';
import { GOLD } from '../../shared/constants/theme';
import { Layout, SlotGrid, DateTimeFields, Btn, Tag, InfoModal, IconBox } from '../../components';
import { staticStyles, dynamicStyles, riderExportStyles } from '../../components/rider.styles';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const WHEEL_ROW_HEIGHT = 40;
const TIME_HOURS = [
  ...[6,7,8,9,10,11,12].map((hour) => ({ id:`morning-${hour}`, hour })),
  ...[1,2,3,4,5].map((hour) => ({ id:`afternoon-${hour}`, hour })),
  ...[6,7,8,9].map((hour) => ({ id:`evening-${hour}`, hour })),
];
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);
const DURATION_HOURS = [1,2,3,4];
const DURATION_MINUTES = [0,15,30,45];

const timeMinutes = ({ hour, minute, period }) => ((hour.hour % 12) + (period === 'PM' ? 12 : 0)) * 60 + minute;
const validTime = (time) => {
  const minutes = timeMinutes(time);
  return minutes >= 360 && minutes <= 1260;
};
const apiTime = (time) => {
  const minutes = timeMinutes(time);
  return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
};
const displayTime = (time) => `${time.hour.hour}:${String(time.minute).padStart(2,'0')} ${time.period}`;
const displayDuration = ({ hours, minutes }) => hours === 0
  ? `${minutes} minutes`
  : `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes ? ` ${minutes} minutes` : ''}`;
const clockTime = (minutes) => {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

function WheelColumn({ title, values, value, labelForValue = String, keyForValue = String, disabledValue, onChange }) {
  const { c } = useApp();
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const settleTimer = useRef(null);
  const selectedIndex = Math.max(0, values.indexOf(value));

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ROW_HEIGHT, animated: false });
    });
  }, [selectedIndex]);

  const settle = (offset) => {
    const index = Math.max(0, Math.min(values.length - 1, Math.round(offset / WHEEL_ROW_HEIGHT)));
    const nextValue = values[index];
    if (disabledValue && disabledValue(nextValue)) {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ROW_HEIGHT, animated: true });
      return;
    }
    if (nextValue !== value) onChange(nextValue);
  };

  const endDrag = (event) => {
    const velocity = event.nativeEvent.velocity?.y || 0;
    if (Math.abs(velocity) < 0.05) {
      clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => settle(offsetRef.current), 140);
    }
  };

  return (
    <View style={staticStyles.riderReservationWheelColumn}>
      <Text style={[staticStyles.riderReservationWheelTitle, { color:c.muted }]}>{title}</Text>
      <View style={staticStyles.riderReservationWheelViewport}>
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ROW_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={staticStyles.riderReservationWheelContent}
          onScroll={(event) => { offsetRef.current = event.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          onScrollEndDrag={endDrag}
          onMomentumScrollEnd={(event) => {
            clearTimeout(settleTimer.current);
            settle(event.nativeEvent.contentOffset.y);
          }}
        >
          {values.map((item, index) => {
            const disabled = disabledValue ? disabledValue(item) : false;
            const selected = item === value;
            const distance = Math.abs(index - selectedIndex);
            return (
              <View key={keyForValue(item)} style={staticStyles.riderReservationWheelItem}>
                <Text style={{
                  color:disabled ? c.muted : selected ? c.gold : c.muted,
                  fontSize:selected ? 21 : 16,
                  fontWeight:selected ? '800' : '400',
                  opacity:disabled ? 0.35 : distance > 2 ? 0.5 : 1,
                }}>
                  {labelForValue(item)}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function TimeWheelPicker({ value, onChange }) {
  const change = (field, nextValue) => {
    const next = { ...value, [field]:nextValue };
    if (validTime(next)) onChange(next);
  };
  const hourDisabled = (hour) => !validTime({ ...value, hour });
  const minuteDisabled = (minute) => !validTime({ ...value, minute });
  const periodDisabled = (period) => !validTime({ ...value, period });

  return (
    <View style={staticStyles.riderReservationWheels}>
      <WheelColumn title="Hour" values={TIME_HOURS} value={value.hour} labelForValue={(hour) => String(hour.hour)}
        keyForValue={(hour) => hour.id} disabledValue={hourDisabled} onChange={(hour) => change('hour',hour)} />
      <WheelColumn title="Minute" values={MINUTES} value={value.minute} labelForValue={(minute) => String(minute).padStart(2,'0')} disabledValue={minuteDisabled} onChange={(minute) => change('minute',minute)} />
      <WheelColumn title="AM/PM" values={['AM','PM']} value={value.period} disabledValue={periodDisabled} onChange={(period) => change('period',period)} />
    </View>
  );
}

function DurationWheelPicker({ value, onChange, showZeroHour = false }) {
  const hours = showZeroHour ? [0, ...DURATION_HOURS] : DURATION_HOURS;
  return (
    <View style={staticStyles.riderReservationWheels}>
      <WheelColumn title="Hour" values={hours} value={value.hours}
        labelForValue={(hour) => hour === 0 ? 'Under 1' : String(hour)}
        disabledValue={(hour) => showZeroHour && hour === 0 && value.minutes === 0}
        onChange={(hours) => onChange({ ...value, hours })} />
      <WheelColumn title="Minute" values={DURATION_MINUTES} value={value.minutes}
        labelForValue={(minutes) => String(minutes).padStart(2,'0')}
        disabledValue={(minutes) => showZeroHour && value.hours === 0 && minutes === 0}
        onChange={(minutes) => onChange({ ...value, minutes })} />
    </View>
  );
}

function Reservations({ mode = 'booking' }) {
  const { db, refresh, me, mine, nav, toast, s, c, wide } = useApp();
  const [sel, setSel] = useState(0);
  const [rd, setRd] = useState('');
  const [startTime, setStartTime] = useState({ hour:TIME_HOURS.find((option) => option.id === 'morning-8'), minute:0, period:'AM' });
  const [duration, setDuration] = useState({ hours:1, minutes:0 });
  const [wholeDay, setWholeDay] = useState(false);
  const [qi, setQi] = useState(''); const [q, setQ] = useState('');
  const [er, setEr] = useState('');
  const [edit, setEdit] = useState(null);
  const [nd, setNd] = useState('');
  const [editTime, setEditTime] = useState({ hour:TIME_HOURS.find((option) => option.id === 'morning-8'), minute:0, period:'AM' });
  const [editDuration, setEditDuration] = useState({ hours:1, minutes:0 });
  const [editLegacyDuration, setEditLegacyDuration] = useState(false);
  const [editWholeDay, setEditWholeDay] = useState(false);
  const [er3, setEr3] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [receipt, setReceipt] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);

  const paymentFor = (id) => (db.payments || []).filter((payment) => payment.reservationId === id).sort((a, b) => b.id - a.id)[0];

  const parsedStart = apiTime(startTime);
  const startMinutes = timeMinutes(startTime);
  const durationMinutes = duration.hours * 60 + duration.minutes;
  const totalPrice = wholeDay ? 100 : (durationMinutes / 15) * 5;
  const endTimeFor = () => {
    const end = wholeDay ? 21 * 60 : startMinutes + durationMinutes;
    return end > 21 * 60 ? 'After 9:00 PM' : clockTime(end);
  };
  const timeError = !validTime(startTime)
    ? 'Starting time must be between 6:00 AM and 9:00 PM.'
    : wholeDay && startMinutes >= 1260
      ? 'A Whole Day reservation must start before 9:00 PM.'
      : !wholeDay && startMinutes + durationMinutes > 1260
        ? 'Reservation must end by 9:00 PM.'
        : '';

  const taken = new Set(rd ? (db.slotReservations || []).filter((r) => r.date === rd).map((r) => r.slot) : []);
  const eff = db.blocked.includes(sel) || taken.has(sel) ? 0 : sel;
  const myReservations = mine();
  const rows = myReservations.filter((r) => `slot ${r.slot} ${r.date} ${fd(r.date)} ${ft(r.time)}`.toLowerCase().includes(q.toLowerCase()));
  const statusFor = (reservation) => {
    if (reservation.status === 'Cancelled' || reservation.status === 'Canceled') return 'Canceled';
    if (reservation.status === 'Expired') return 'Expired';
    if (reservation.status === 'Active' || reservation.stored) return 'Active';
    if (reservation.status === 'Used' || isPast(reservation)) return 'Completed';
    return 'Upcoming';
  };
  const overviewReservation = myReservations.find((reservation) => !['Canceled','Expired','Completed'].includes(statusFor(reservation))) || myReservations[0];
  const overviewPayment = overviewReservation ? paymentFor(overviewReservation.id) : null;
  const overviewQrAvailable = overviewReservation
    ? ['Confirmed','Active','Used'].includes(overviewReservation.status) && overviewPayment?.status === 'Verified'
    : false;
  const reservationIds = new Set(myReservations.map((reservation) => reservation.id));
  const activities = (db.log || [])
    .filter((entry) => entry.uid === db.me && reservationIds.has(entry.rid))
    .slice()
    .sort((a, b) => Number(b.ts) - Number(a.ts));

  const book = async () => {
    if (!eff) return setEr('Please select a slot.');
    if (!rd) return setEr('Please choose a date.');
    if (timeError) return setEr(timeError);
    if (dt(rd, parsedStart) < new Date()) return setEr('Please choose a future date and time.');
    try {
      const r = await createReservation({
        slot: eff, date: rd, time: parsedStart,
        wholeDay,
        durationMinutes: wholeDay ? undefined : durationMinutes,
      });
      await refresh();
      toast(`Slot ${eff} reserved for ${fd(rd)}.`);
      setSel(0); setRd(''); setEr('');
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

  const openEdit = (r) => {
    const [hour, minute] = r.time.split(':').map(Number);
    const hourValue = hour % 12 || 12;
    const period = hour < 12 ? 'AM' : 'PM';
    const hourOption = TIME_HOURS.find((option) => option.hour === hourValue &&
      ((hourValue >= 6 && hourValue <= 9) ? option.id.startsWith(period === 'AM' ? 'morning-' : 'evening-') : true));
    const minutes = r.wholeDay ? 60 : (r.durationMinutes || 60);
    setEdit(r);
    setNd(r.date);
    setEditTime({ hour:hourOption || TIME_HOURS[0], minute, period });
    setEditDuration({ hours:Math.floor(minutes / 60), minutes:minutes % 60 });
    setEditLegacyDuration(minutes < 60);
    setEditWholeDay(!!r.wholeDay);
    setEr3('');
  };
  const saveEdit = async () => {
    if (!nd) return setEr3('Choose a date.');
    if (!validTime(editTime)) return setEr3('Starting time must be between 6:00 AM and 9:00 PM.');
    const apiEditTime = apiTime(editTime);
    const editStartMinutes = timeMinutes(editTime);
    const editDurationMinutes = editDuration.hours * 60 + editDuration.minutes;
    if (!editWholeDay && (editDurationMinutes < 15 || editDurationMinutes % 15 !== 0)) return setEr3('Choose a duration in 15-minute increments.');
    const editEnd = editWholeDay ? 1260 : editStartMinutes + editDurationMinutes;
    if (editWholeDay && editStartMinutes >= 1260) return setEr3('A Whole Day reservation must start before 9:00 PM.');
    if (editEnd > 1260) return setEr3('Choose a schedule that ends by 9:00 PM.');
    if (dt(nd, apiEditTime) < new Date()) return setEr3('Choose a future date and time.');
    try { await updateReservation(edit.id, { date: nd, time: apiEditTime, wholeDay: editWholeDay, durationMinutes: editWholeDay ? undefined : editDurationMinutes }); await refresh(); setEdit(null); toast('Reservation rescheduled.'); }
    catch (x) { setEr3(x.message); }
  };

  const payReservation = payFor ? (db.res || []).find((r) => r.id === payFor) : null;
  const payAmount = payReservation?.totalPrice ?? totalPrice;

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
            <DateTimeFields date={rd} onDate={setRd} dateOnly />

            <View style={staticStyles.riderReservationsTimeField}>
              <Text style={s.label}>Starting time · {displayTime(startTime)}</Text>
              <TimeWheelPicker value={startTime} onChange={(value) => { setStartTime(value); setEr(''); }} />
            </View>
            
            <Text style={s.label}>Select duration :  {wholeDay ? 'Whole Day' : displayDuration(duration)} </Text>
            <DurationWheelPicker value={duration} onChange={(value) => { setDuration(value); setWholeDay(false); setEr(''); }} />
            
            <View style={staticStyles.riderReservationsWholeDay}>
              <Btn small variant={wholeDay ? 'gold' : 'outline'} icon="sunny-outline"
                label={wholeDay ? 'Whole Day selected · ₱100' : 'Choose Whole Day · ₱100'}
                onPress={() => { setWholeDay(!wholeDay); setEr(''); }} />
            </View>
            <View style={[s.card, { marginTop:12, borderWidth:1, borderColor:c.line }]}>
              <Text style={s.cardTitle}>Review reservation</Text>
              <Text style={s.muted}>Date: {rd ? fd(rd) : 'Not selected'}</Text>
              <Text style={s.muted}>Starting time: {displayTime(startTime)}</Text>
              <Text style={s.muted}>Duration: {wholeDay ? `Whole Day (${Math.max(0,1260-startMinutes)} minutes)` : `${displayDuration(duration)} (${durationMinutes} minutes)`}</Text>
              <Text style={s.muted}>Ending time: {endTimeFor()}</Text>
              <Text style={dynamicStyles.riderReservationsText18({ c })}>Total price: ₱{totalPrice.toFixed(2)}</Text>
            </View>
            {timeError ? <View style={dynamicStyles.riderReservationsView5({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.riderReservationsText6({ c })}>{timeError}</Text></View> : null}
            {er ? <View style={dynamicStyles.riderReservationsView5({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.riderReservationsText6({ c })}>{er}</Text></View> : null}
            <View style={staticStyles.riderReservationsView7}><Btn full icon="checkmark-circle-outline" label="Confirm booking" onPress={book} /></View>
          </View>
        </View> : null}
        {mode !== 'booking' ? <View style={dynamicStyles.riderReservationsView8({ wide })}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Reservation Overview</Text>
            {overviewReservation ? (
              <View style={[dynamicStyles.riderReservationsView14({ c }), staticStyles.riderReservationsOverview]}>
                <View style={staticStyles.riderReservationsView16}>
                  <Text style={dynamicStyles.riderReservationsText18({ c })}>Reservation #{overviewReservation.id} · Locker {overviewReservation.slot}</Text>
                  <View style={staticStyles.riderReservationsView20}>
                    <Text style={s.muted}>Date: {fd(overviewReservation.date)}</Text>
                    <Text style={s.muted}>Start: {ft(overviewReservation.time)}</Text>
                    <Text style={s.muted}>End: {overviewReservation.endTime ? ft(overviewReservation.endTime) : '—'}</Text>
                    <Text style={s.muted}>Duration: {overviewReservation.wholeDay ? 'Whole Day' : `${overviewReservation.durationMinutes || 0} minutes`}</Text>
                    <Text style={s.muted}>Total payment: ₱{Number(overviewReservation.totalPrice || 0).toFixed(2)}</Text>
                    <Text style={s.muted}>Payment: {PAYMENT_STATUS_LABELS[overviewPayment?.status] || 'Payment required'}</Text>
                    <Text style={s.muted}>Status: {statusFor(overviewReservation)}</Text>
                    <Text style={s.muted}>QR code: {overviewQrAvailable ? 'Available' : 'Not available'}</Text>
                  </View>
                  {overviewQrAvailable ? (
                    <View style={staticStyles.riderReservationsOverviewAction}>
                      <Btn small variant="outline" icon="qr-code-outline" label="View QR code" onPress={() => nav('qr', overviewReservation.id)} />
                    </View>
                  ) : null}
                </View>
              </View>
            ) : <Text style={s.empty}>No reservation to show yet.</Text>}
            <View style={staticStyles.riderReservationsView9}>
              <View><Text style={s.cardTitle}>Reservation History</Text><Text style={s.cardSub}>{rows.length} shown</Text></View>
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
              const status = statusFor(r);
              const canOpenQr = ['Confirmed','Active','Used'].includes(r.status) && payment?.status === 'Verified';
              return (
              <View key={r.id} style={dynamicStyles.riderReservationsView14({ c })}>
                <View style={dynamicStyles.riderReservationsView15({ GOLD, c, isPast, r })} />
                <View style={staticStyles.riderReservationsView16}>
                  <View style={staticStyles.riderReservationsView17}>
                    <Text style={dynamicStyles.riderReservationsText18({ c })}>Slot {r.slot} <Text style={dynamicStyles.riderReservationsText19({ c })}> #{r.id}</Text></Text>
                    <View style={s.row}>
                      {r.stored ? <Tag kind="gold" text="Stored" /> : null}
                      <Tag kind={status === 'Canceled' || status === 'Expired' ? 'bad' : status === 'Active' ? 'gold' : status === 'Completed' ? 'mute' : 'ok'} text={status} />
                      <Tag kind={payment?.status === 'Verified' ? 'ok' : payment?.status === 'Rejected' ? 'bad' : 'gold'} text={PAYMENT_STATUS_LABELS[payment?.status] || 'Payment required'} />
                    </View>
                  </View>
                  <View style={staticStyles.riderReservationsView20}>
                    <View style={s.row}><Ionicons name="calendar-outline" size={14} color={c.muted} /><Text style={s.muted}>{fd(r.date)}</Text></View>
                    <View style={s.row}><Ionicons name="time-outline" size={14} color={c.muted} /><Text style={s.muted}>{ft(r.time)} – {r.endTime ? ft(r.endTime) : '—'}</Text></View>
                    <Text style={s.muted}>{r.wholeDay ? 'Whole Day' : `${r.durationMinutes || 0} minutes`} · ₱{Number(r.totalPrice || 0).toFixed(2)}</Text>
                  </View>
                  <View style={[s.row, staticStyles.cabinetScannerView12]}>
                    {canOpenQr ? <Btn small variant="outline" icon="qr-code-outline" label="QR" onPress={() => nav('qr', r.id)} /> : null}
                    {!['Canceled','Expired','Completed','Active'].includes(status) && payment?.status !== 'Pending' ? <Btn small variant="gold" icon="card-outline" label={payment?.status === 'Rejected' ? 'Resubmit payment' : `Pay ${PAYMENT_CURRENCY} ${Number(r.totalPrice || 0).toFixed(2)}`} onPress={() => { setPayFor(r.id); setReceipt(''); setReceiptFile(null); setPaymentError(''); }} /> : null}
                    {!['Canceled','Expired','Completed','Active'].includes(status) && <Btn small variant="outline" icon="create-outline" label="Reschedule" onPress={() => openEdit(r)} />}
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
            <View style={[staticStyles.riderReservationsActivity, { borderColor:c.line }]}>
              <Text style={s.cardTitle}>Cabinet Activity</Text>
              <Text style={s.cardSub}>Latest helmet storage and retrieval events for your reservations.</Text>
              {activities.length ? activities.map((activity, index) => (
                <View key={`${activity.rid}-${activity.ts}-${index}`} style={[dynamicStyles.riderReservationsView14({ c }), staticStyles.riderReservationsActivityRow]}>
                  <View style={staticStyles.riderReservationsActivityIcon}>
                    <Ionicons name={activity.act === 'Stored' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={22} color={activity.act === 'Stored' ? c.gold : c.primary} />
                  </View>
                  <View style={staticStyles.riderReservationsView16}>
                    <Text style={dynamicStyles.riderReservationsText18({ c })}>Helmet {activity.act === 'Stored' ? 'Stored' : 'Retrieved'} · Locker {activity.slot}</Text>
                    <Text style={s.muted}>Reservation #{activity.rid}</Text>
                    <Text style={s.muted}>{new Date(Number(activity.ts)).toLocaleString()}</Text>
                    <Tag kind="ok" text="Recorded" />
                  </View>
                </View>
              )) : <Text style={s.empty}>No cabinet activity yet.</Text>}
            </View>
          </View>
        </View> : null}
      </View>

      <InfoModal visible={!!edit} title={edit ? `Reschedule Slot ${edit.slot}` : ''} onClose={() => setEdit(null)}>
        <DateTimeFields date={nd} onDate={setNd} dateOnly />
        <Text style={s.label}>Starting time · {displayTime(editTime)}</Text>
        <TimeWheelPicker value={editTime} onChange={(value) => { setEditTime(value); setEr3(''); }} />
        <View style={staticStyles.riderReservationsTimeField}>
          <Text style={s.label}>Duration · {editWholeDay ? 'Whole Day' : displayDuration(editDuration)}</Text>
          <DurationWheelPicker value={editDuration} showZeroHour={editLegacyDuration}
            onChange={(value) => { setEditDuration(value); setEditWholeDay(false); setEr3(''); }} />
          <View style={staticStyles.riderReservationsWholeDay}>
            <Btn small variant={editWholeDay ? 'gold' : 'outline'} icon="sunny-outline"
              label={editWholeDay ? 'Whole Day selected · ₱100' : 'Choose Whole Day · ₱100'}
              onPress={() => { setEditWholeDay(!editWholeDay); setEr3(''); }} />
          </View>
          <View style={[s.card, { marginTop:12, borderWidth:1, borderColor:c.line }]}>
            <Text style={s.muted}>Ending time: {editWholeDay ? '9:00 PM' : (timeMinutes(editTime) + editDuration.hours * 60 + editDuration.minutes > 1260 ? 'After 9:00 PM' : clockTime(timeMinutes(editTime) + editDuration.hours * 60 + editDuration.minutes))}</Text>
            <Text style={dynamicStyles.riderReservationsText18({ c })}>Total price: ₱{(editWholeDay ? 100 : ((editDuration.hours * 60 + editDuration.minutes) / 15) * 5).toFixed(2)}</Text>
          </View>
        </View>
        {er3 ? <Text style={[s.err, staticStyles.riderReservationsText23]}>{er3}</Text> : null}
        <View style={staticStyles.riderReservationsView24}><Btn full label="Save changes" onPress={saveEdit} /></View>
      </InfoModal>
      <InfoModal visible={!!payFor} title="Submit reservation payment" onClose={() => paymentBusy ? null : setPayFor(null)}>
        <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>Required amount: {PAYMENT_CURRENCY} {Number(payAmount).toFixed(2)}. Finance must review your receipt before your QR code is released.</Text>
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
