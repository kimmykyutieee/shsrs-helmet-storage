import React, { useState } from 'react';
import { View, Text, TextInput, Image, Platform, ScrollView, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { createReservation, cancelReservation, requestReservationExtension } from '../../services/reservationService';
import { submitPayment } from '../../services/paymentService';
import { dt, fd, ft, isPast, esc } from '../../shared/utils/date';
import { sharePdf, confirmBox } from '../../shared/utils/actions';
import { PAYMENT_CURRENCY } from '../../shared/constants/config';
import { GOLD } from '../../shared/constants/theme';
import { Layout, SlotGrid, DateTimeFields, Btn, Tag, InfoModal, IconBox } from '../../components';
import { staticStyles, dynamicStyles, riderExportStyles } from '../../components/rider.styles';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const RECEIPT_MIME_TYPES = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};
const receiptMimeType = (asset) => {
  const mimeType = String(asset.mimeType || '').toLowerCase();
  if (mimeType.startsWith('image/')) return mimeType;
  const filename = String(asset.fileName || asset.uri || '').split(/[?#]/)[0];
  const extension = filename.split('.').pop().toLowerCase();
  return RECEIPT_MIME_TYPES[extension] || 'image/jpeg';
};
const isHeifReceipt = (asset) => {
  const mimeType = String(asset.mimeType || '').toLowerCase();
  const filename = String(asset.fileName || asset.uri || '').split(/[?#]/)[0];
  return /^image\/hei[cf](?:$|-)/.test(mimeType) || /\.(heic|heif)$/i.test(filename);
};
const TIME_HOURS = [
  ...[6,7,8,9,10,11,12].map((hour) => ({ id:`morning-${hour}`, hour })),
  ...[1,2,3,4,5].map((hour) => ({ id:`afternoon-${hour}`, hour })),
  ...[6,7,8,9].map((hour) => ({ id:`evening-${hour}`, hour })),
];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 1);
const MINUTES = Array.from({ length: 60 }, (_, minute) => minute);

const timeMinutes = ({ hour, minute, period }) => ((hour.hour % 12) + (period === 'PM' ? 12 : 0)) * 60 + minute;
const validTime = (time) => {
  const minutes = timeMinutes(time);
  return minutes >= 360 && minutes <= 1260;
};
const apiTime = (time) => {
  const minutes = timeMinutes(time);
  return `${String(Math.floor(minutes / 60)).padStart(2,'0')}:${String(minutes % 60).padStart(2,'0')}`;
};
const displayTime = (time) => `${String(time.hour.hour).padStart(2,'0')}:${String(time.minute).padStart(2,'0')} ${time.period}`;
const displayDuration = ({ hours, minutes }) => hours === 0
  ? `${minutes} minutes`
  : `${hours} ${hours === 1 ? 'hour' : 'hours'}${minutes ? ` ${minutes} minutes` : ''}`;
const clockTime = (minutes) => {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

function StartingTimeSelector({ value, onChange }) {
  const { c } = useApp();
  const [openField, setOpenField] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');
  const change = (field, nextValue) => {
    const next = { ...value, [field]:nextValue };
    if (!validTime(next)) {
      setValidationMessage('Starting time must be between 6:00 AM and 9:00 PM.');
      return;
    }
    onChange(next);
    setOpenField(null);
    setValidationMessage('');
  };

  const renderField = (field, label, valueLabel) => {
    const selected = openField === field;
    return (
      <TouchableOpacity
        key={field}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => setOpenField(selected ? null : field)}
        style={[staticStyles.riderStartingTimeField, {
          borderColor:selected ? c.gold : c.line,
          backgroundColor:selected ? c.goldBg : c.card,
        }]}
      >
        <Text style={{ color:c.muted, fontSize:12, fontWeight:'700' }}>{label}</Text>
        <Text style={{ color:selected ? c.gold : c.text, fontSize:18, fontWeight:'800', marginTop:3 }}>{valueLabel}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <Text style={[staticStyles.riderStartingTimeDescription, { color:c.muted }]}>
        Select your preferred starting time. Reservations are only available between 6:00 AM and 9:00 PM.
      </Text>
      <View style={[staticStyles.riderStartingTimePreview, { backgroundColor:c.goldBg, borderColor:c.line }]}>
        <Text style={{ color:c.muted, fontSize:12, fontWeight:'700' }}>SELECTED START TIME</Text>
        <Text style={{ color:c.text, fontSize:24, fontWeight:'800', marginTop:3 }}>{displayTime(value)}</Text>
      </View>
      <View style={staticStyles.riderStartingTimeFields}>
        {renderField('hour', 'Hour', String(value.hour.hour).padStart(2,'0'))}
        {renderField('minute', 'Minutes', String(value.minute).padStart(2,'0'))}
        {renderField('period', 'AM/PM', value.period)}
      </View>
      {openField === 'hour' ? (
        <View style={[staticStyles.riderStartingTimeOptions, { backgroundColor:c.soft, borderColor:c.line }]}>
          <View style={staticStyles.riderStartingTimeHourGrid}>
            {HOURS.map((hour) => {
              const selected = value.hour.hour === hour;
              const option = { id:`selected-${hour}`, hour };
              const allowed = validTime({ ...value, hour:option });
              return (
                <TouchableOpacity key={hour} accessibilityRole="button" accessibilityState={{ selected, disabled:!allowed }}
                  onPress={() => change('hour', option)}
                  style={[staticStyles.riderStartingTimeHourButton, {
                    borderColor:selected ? c.gold : c.line,
                    backgroundColor:selected ? c.goldBg : c.card,
                    opacity:allowed ? 1 : 0.45,
                  }]}>
                  <Text style={{ color:selected ? c.gold : c.text, fontWeight:selected ? '800' : '600' }}>{String(hour).padStart(2,'0')}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
      {openField === 'minute' ? (
        <View style={[staticStyles.riderStartingTimeOptions, { backgroundColor:c.soft, borderColor:c.line }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={staticStyles.riderStartingTimeMinuteRow}>
            {MINUTES.map((minute) => {
              const selected = value.minute === minute;
              const allowed = validTime({ ...value, minute });
              return (
                <TouchableOpacity key={minute} accessibilityRole="button" accessibilityState={{ selected, disabled:!allowed }}
                  onPress={() => change('minute', minute)}
                  style={[staticStyles.riderStartingTimeMinuteButton, {
                    borderColor:selected ? c.gold : c.line,
                    backgroundColor:selected ? c.goldBg : c.card,
                    opacity:allowed ? 1 : 0.45,
                  }]}>
                  <Text style={{ color:selected ? c.gold : c.text, fontWeight:selected ? '800' : '600' }}>{String(minute).padStart(2,'0')}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {openField === 'period' ? (
        <View style={[staticStyles.riderStartingTimeOptions, staticStyles.riderStartingTimePeriodRow, { backgroundColor:c.soft, borderColor:c.line }]}>
          {['AM','PM'].map((period) => {
            const selected = value.period === period;
            const allowed = validTime({ ...value, period });
            return (
              <TouchableOpacity key={period} accessibilityRole="button" accessibilityState={{ selected, disabled:!allowed }}
                onPress={() => change('period', period)}
                style={[staticStyles.riderStartingTimePeriodButton, {
                  borderColor:selected ? c.gold : c.line,
                  backgroundColor:selected ? c.goldBg : c.card,
                  opacity:allowed ? 1 : 0.45,
                }]}>
                <Text style={{ color:selected ? c.gold : c.text, fontWeight:selected ? '800' : '700' }}>{period}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      {validationMessage ? <Text style={[staticStyles.riderStartingTimeError, { color:c.bad }]}>{validationMessage}</Text> : null}
    </View>
  );
}

function DurationSelector({ value, onChange }) {
  const { c } = useApp();
  const hours = [0,1,2,3,4];
  const minutes = [0,15,30];
  const [validationMessage, setValidationMessage] = useState('');
  const change = (field, nextValue) => {
    const next = { ...value, [field]:nextValue };
    if (next.hours * 60 + next.minutes < 15) {
      setValidationMessage('Choose at least 15 minutes.');
      return;
    }
    onChange(next);
    setValidationMessage('');
  };
  const summary = [
    value.hours ? `${value.hours} ${value.hours === 1 ? 'hour' : 'hours'}` : '',
    value.minutes ? `${value.minutes} minutes` : '',
  ].filter(Boolean).join(' and ') || 'Choose a duration';
  const invalidDuration = value.hours * 60 + value.minutes < 15;

  return (
    <View>
      <View style={staticStyles.riderDurationSection}>
        <Text style={[staticStyles.riderDurationLabel, { color:c.text }]}>Hours</Text>
        <View style={staticStyles.riderDurationOptions}>
          {hours.map((hour) => {
            const selected = value.hours === hour;
            return (
              <TouchableOpacity key={hour} accessibilityRole="button" accessibilityState={{ selected }}
                onPress={() => change('hours', hour)}
                style={[staticStyles.riderDurationOption, {
                  borderColor:selected ? c.gold : c.line,
                  backgroundColor:selected ? c.goldBg : c.card,
                }]}>
                <Text style={{ color:selected ? c.gold : c.text, fontWeight:selected ? '800' : '600' }}>
                  {hour} {hour === 1 ? 'hour' : 'hours'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={staticStyles.riderDurationSection}>
        <Text style={[staticStyles.riderDurationLabel, { color:c.text }]}>Minutes</Text>
        <View style={staticStyles.riderDurationOptions}>
          {minutes.map((minute) => {
            const selected = value.minutes === minute;
            return (
              <TouchableOpacity key={minute} accessibilityRole="button" accessibilityState={{ selected }}
                onPress={() => change('minutes', minute)}
                style={[staticStyles.riderDurationOption, {
                  borderColor:selected ? c.gold : c.line,
                  backgroundColor:selected ? c.goldBg : c.card,
                }]}>
                <Text style={{ color:selected ? c.gold : c.text, fontWeight:selected ? '800' : '600' }}>
                  {String(minute).padStart(2,'0')} minutes
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={[staticStyles.riderDurationSummary, { backgroundColor:c.soft, borderColor:c.line }]}>
        <Text style={{ color:c.muted, fontSize:12, fontWeight:'700' }}>SELECTED DURATION</Text>
        <Text style={{ color:c.text, fontSize:18, fontWeight:'800', marginTop:4 }}>{summary}</Text>
      </View>
      {validationMessage || invalidDuration ? (
        <Text style={[staticStyles.riderDurationError, { color:c.bad }]}>
          {validationMessage || 'Choose at least 15 minutes.'}
        </Text>
      ) : null}
    </View>
  );
}

function Reservations({ mode = 'booking' }) {
  const { db, refresh, me, mine, nav, toast, s, c, wide } = useApp();
  const [sel, setSel] = useState(0);
  const [rd, setRd] = useState('');
  const [startTime, setStartTime] = useState({ hour:TIME_HOURS.find((option) => option.id === 'morning-8'), minute:0, period:'AM' });
  const [startTimeDraft, setStartTimeDraft] = useState(startTime);
  const [startTimeModal, setStartTimeModal] = useState(false);
  const [duration, setDuration] = useState({ hours:1, minutes:0 });
  const [durationDraft, setDurationDraft] = useState(duration);
  const [durationModal, setDurationModal] = useState(false);
  const [wholeDay, setWholeDay] = useState(false);
  const [qi, setQi] = useState(''); const [q, setQ] = useState('');
  const [reservationSection, setReservationSection] = useState('history');
  const [historyDetails, setHistoryDetails] = useState(null);
  const [er, setEr] = useState('');
  const [payFor, setPayFor] = useState(null);
  const [receipt, setReceipt] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [extensionFor, setExtensionFor] = useState(null);
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const [extensionReceipt, setExtensionReceipt] = useState('');
  const [extensionReceiptFile, setExtensionReceiptFile] = useState(null);
  const [extensionError, setExtensionError] = useState('');
  const [extensionBusy, setExtensionBusy] = useState(false);

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
      : !wholeDay && durationMinutes < 15
        ? 'Choose a duration of at least 15 minutes.'
      : !wholeDay && startMinutes + durationMinutes > 1260
        ? 'Reservation must end by 9:00 PM.'
        : '';

  const taken = new Set(rd ? (db.slotReservations || []).filter((r) => r.date === rd).map((r) => r.slot) : []);
  const eff = db.blocked.includes(sel) || taken.has(sel) ? 0 : sel;
  const myReservations = mine().slice().sort((a, b) => Number(b.id) - Number(a.id));
  const rows = myReservations.filter((r) => `slot ${r.slot} ${r.date} ${fd(r.date)} ${ft(r.time)}`.toLowerCase().includes(q.toLowerCase()));
  const statusFor = (reservation, payment) => {
    if (reservation.status === 'Cancelled' || reservation.status === 'Canceled') return 'Cancelled';
    if (reservation.status === 'Expired') return 'Expired';
    if (reservation.status === 'Active') return 'Active';
    if (reservation.status === 'Used') return 'Completed';
    if (reservation.status === 'Confirmed') return dt(reservation.date, reservation.time) > new Date() ? 'Upcoming' : 'Confirmed';
    if (payment?.status === 'Pending') return 'Pending Verification';
    return 'Pending Payment';
  };
  const reservationIds = new Set(myReservations.map((reservation) => reservation.id));
  const activities = (db.log || [])
    .filter((entry) => entry.uid === db.me && reservationIds.has(entry.rid))
    .map((entry) => ({
      ...entry,
      key: entry.id,
      title: entry.act === 'Stored' ? 'Store access recorded' : 'Retrieve access recorded',
      status: 'Recorded',
      eventTime: Number(entry.ts),
    }))
    .sort((a, b) => b.eventTime - a.eventTime);
  const selectedActivity = historyDetails?.type === 'activity' ? historyDetails.record : null;
  const selectedReservation = historyDetails?.type === 'reservation'
    ? historyDetails.record
    : historyDetails?.reservation || null;
  const selectedPayment = selectedReservation ? paymentFor(selectedReservation.id) : null;
  const selectedReservationStatus = selectedReservation
    ? selectedReservation.status === 'Pending Refund Verification'
      ? selectedReservation.status
      : statusFor(selectedReservation, selectedPayment)
    : '';
  const selectedPaymentStatus = !selectedPayment ? 'Pending Payment'
    : selectedPayment.status === 'Pending' ? 'Pending Verification'
      : selectedPayment.status === 'Verified' ? 'Verified'
        : 'Rejected';
  const selectedQrAvailable = !!selectedReservation
    && ['Confirmed','Active','Used'].includes(selectedReservation.status)
    && selectedPayment?.status === 'Verified';

  const openStartTimeSelector = () => {
    setStartTimeDraft(startTime);
    setStartTimeModal(true);
  };
  const confirmStartTime = () => {
    if (!validTime(startTimeDraft)) {
      setEr('Starting time must be between 6:00 AM and 9:00 PM.');
      return;
    }
    setStartTime(startTimeDraft);
    setStartTimeModal(false);
    setEr('');
  };
  const openDurationSelector = () => {
    setDurationDraft(duration);
    setDurationModal(true);
  };
  const confirmDuration = () => {
    if (durationDraft.hours * 60 + durationDraft.minutes < 15) return;
    setDuration(durationDraft);
    setWholeDay(false);
    setDurationModal(false);
    setEr('');
  };

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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: Platform.OS !== 'web',
      });
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
        if (asset.fileSize > MAX_RECEIPT_BYTES) {
          return setPaymentError('The image must be 5 MB or smaller.');
        }
        let base64 = asset.base64;
        let mimeType = receiptMimeType(asset);
        if (isHeifReceipt(asset)) {
          const rendered = await ImageManipulator.manipulate(asset.uri).renderAsync();
          const converted = await rendered.saveAsync({
            format: SaveFormat.JPEG,
            compress: 0.92,
            base64: true,
          });
          base64 = converted.base64;
          mimeType = 'image/jpeg';
        }
        if (!base64) throw new Error('Could not read the selected image. Please choose another image.');
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        const base64Size = Math.floor(base64.length * 3 / 4) - padding;
        if (base64Size > MAX_RECEIPT_BYTES) {
          return setPaymentError('The image must be 5 MB or smaller.');
        }
        file = `data:${mimeType};base64,${base64}`;
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

  const pickExtensionReceipt = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: Platform.OS !== 'web',
      });
      const asset = result?.assets?.[0];
      if (!asset || result.canceled) return;
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        setExtensionReceiptFile({ file:blob, name:asset.fileName || 'extension-proof', type:blob.type || 'image/jpeg' });
        setExtensionReceipt(asset.uri);
      } else {
        setExtensionReceipt(asset.base64 ? `data:${receiptMimeType(asset)};base64,${asset.base64}` : asset.uri);
        setExtensionReceiptFile(asset.uri);
      }
      setExtensionError('');
    } catch (x) { setExtensionError(x.message); }
  };

  const submitExtension = async () => {
    if (!extensionReceipt && !extensionReceiptFile) return setExtensionError('Upload an extension payment receipt.');
    setExtensionBusy(true); setExtensionError('');
    try {
      await requestReservationExtension(extensionFor, extensionMinutes, extensionReceiptFile || extensionReceipt);
      setExtensionFor(null); setExtensionReceipt(''); setExtensionReceiptFile(null);
      toast('Extension submitted for Finance verification.');
      await refresh();
    } catch (x) { setExtensionError(x.message); }
    setExtensionBusy(false);
  };

  const payReservation = payFor ? (db.res || []).find((r) => r.id === payFor) : null;
  const payAmount = payReservation?.totalPrice ?? totalPrice;

  const pdf = async () => {
    const r = myReservations;
    if (!r.length) return toast('No reservations to export.');
    const td = riderExportStyles.tableCell;
    const html = `<html><body ${riderExportStyles.reservationBody}><div ${riderExportStyles.reservationHeader}><h2 ${riderExportStyles.reservationTitle}>Helmet Reservation Storage System</h2><p ${riderExportStyles.reservationMeta}>Reservations for ${esc(me.name)} (${esc(me.email)}) · Generated ${esc(new Date().toLocaleString())}</p></div><table ${riderExportStyles.reservationTable}><thead><tr>${['ID', 'Slot', 'Date', 'Time', 'Status'].map((h) => `<th ${riderExportStyles.reservationHeading}>${h}</th>`).join('')}</tr></thead><tbody>${r.map((x) => `<tr><td ${td}>#${x.id}</td><td ${td}>Slot ${x.slot}</td><td ${td}>${fd(x.date)}</td><td ${td}>${ft(x.time)}</td><td ${td}>${statusFor(x, paymentFor(x.id))}</td></tr>`).join('')}</tbody></table></body></html>`;
    try { await sharePdf(html, toast); } catch (_e) { toast('Could not create the PDF.'); }
  };

  return (
    <Layout cur={mode === 'mine' ? 'myReservations' : 'reservations'} title={mode === 'mine' ? 'My Reservations' : 'Reservation'} subtitle={mode === 'mine' ? 'Review and manage your reservations.' : 'Book a cabinet slot.'}>
      <View style={dynamicStyles.cabinetScannerView1({ wide })}>
        {mode !== 'mine' ? <View style={dynamicStyles.riderReservationsView2({ wide })}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Select a slot</Text>
            <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>Choose any available cabinet slot.</Text>
            <SlotGrid taken={taken} blocked={db.blocked} sel={eff} onSel={setSel} />
            
            <Text style={s.cardTitle}>Pick date &amp; time</Text>
            <DateTimeFields date={rd} onDate={setRd} dateOnly />

            <Text style={s.label}>Starting time</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={openStartTimeSelector}
              style={[s.input, { minHeight:48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
            >
              <Text style={s.muted}>Choose Starting Time</Text>
              <Text style={dynamicStyles.riderReservationsText18({ c })}>{displayTime(startTime)}</Text>
            </TouchableOpacity>

            <Text style={s.label}>Duration</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={openDurationSelector}
              style={[s.input, { minHeight:48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
            >
              <Text style={s.muted}>Choose Duration</Text>
              <Text style={dynamicStyles.riderReservationsText18({ c })}>{wholeDay ? 'Whole Day' : displayDuration(duration)}</Text>
            </TouchableOpacity>
            
            <View style={staticStyles.riderReservationsWholeDay}>
              <Btn small variant={wholeDay ? 'gold' : 'outline'} icon="sunny-outline"
                label={wholeDay ? 'Whole Day selected ' : 'Choose Whole Day'}
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
          <View style={[s.row, { marginBottom:14, gap:8 }]}>
            {[
              ['history', 'Reservation History'],
              ['activity', 'Cabinet Activity'],
            ].map(([section, title]) => {
              const selected = reservationSection === section;
              return (
                <TouchableOpacity
                  key={section}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setReservationSection(section)}
                  style={{
                    flex:1,
                    alignItems:'center',
                    justifyContent:'center',
                    minHeight:46,
                    paddingHorizontal:8,
                    borderRadius:12,
                    borderWidth:1,
                    borderColor:selected ? c.gold : c.line,
                    backgroundColor:selected ? c.goldBg : c.card,
                  }}
                >
                  <Text style={{ color:c.text, fontWeight:selected ? '800' : '600', textAlign:'center' }}>{title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {reservationSection === 'history' ? (
            <View style={s.card}>
              <View style={staticStyles.riderReservationsView9}>
                <View><Text style={s.cardSub}>{rows.length} shown</Text></View>
                
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
                const status = r.status === 'Pending Refund Verification'
                  ? r.status
                  : statusFor(r, payment);
                const statusTone = ['Cancelled','Expired'].includes(status) ? 'bad'
                  : status === 'Active' ? 'gold'
                    : status === 'Completed' ? 'mute'
                      : ['Pending Payment','Pending Verification','Pending Refund Verification'].includes(status) ? 'gold'
                        : 'ok';
                const canOpenQr = ['Confirmed','Active','Used'].includes(r.status) && payment?.status === 'Verified';
                const canPay = !['Cancelled','Expired','Completed','Active'].includes(status) &&
                  payment?.status !== 'Pending' && payment?.status !== 'Verified';
                const extensionPending = (db.reservationExtensions || []).some((extension) =>
                  extension.reservationId === r.id && extension.status === 'Pending');
                const canExtend = payment?.status === 'Verified'
                  && ['Confirmed','Active'].includes(r.status)
                  && !extensionPending;
                const canCancel = ['Pending','Confirmed','Active'].includes(r.status);
                return (
                  <View key={r.id} style={dynamicStyles.riderReservationsView14({ c })}>
                    <View style={dynamicStyles.riderReservationsView15({ GOLD, c, isPast, r })} />
                    <View style={staticStyles.riderHistoryCardBody}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`View details for locker ${r.slot}`}
                        onPress={() => setHistoryDetails({ type:'reservation', record:r })}
                        style={staticStyles.riderHistoryCardPressable}
                      >
                        <Text style={dynamicStyles.riderReservationsText18({ c })}>Locker {r.slot}</Text>
                        <View style={staticStyles.riderHistoryCardStatus}>
                          <Tag kind={statusTone} text={status} />
                          <Ionicons name="chevron-forward" size={18} color={c.muted} />
                        </View>
                      </TouchableOpacity>
                      <View style={staticStyles.riderHistoryCardActions}>
                        {canOpenQr ? <Btn small variant="outline" icon="qr-code-outline" label="View QR" onPress={() => nav('qr', r.id)} /> : null}
                        {canPay ? <Btn small variant="gold" icon="card-outline" label={payment?.status === 'Rejected' ? 'Resubmit payment' : `Pay ${PAYMENT_CURRENCY} ${Number(r.totalPrice || 0).toFixed(2)}`} onPress={() => { setPayFor(r.id); setReceipt(''); setReceiptFile(null); setPaymentError(''); }} /> : null}
                        {canExtend ? <Btn small variant="gold" icon="time-outline" label="Extend Time" onPress={() => { setExtensionFor(r.id); setExtensionMinutes(30); setExtensionReceipt(''); setExtensionReceiptFile(null); setExtensionError(''); }} /> : null}
                        {canCancel ? <Btn small variant="outline" icon="trash-outline" label="Cancel" onPress={() => cancel(r.id)} /> : null}
                      </View>
                    </View>
                  </View>
                );
              }) : (
                <View style={staticStyles.riderReservationsView22}>
                  <IconBox icon="calendar-outline" tone="gold" size={56} />
                  <Text style={s.empty}>{q ? 'No reservations match your search.' : 'No reservations yet.'}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.card}>
              {activities.length ? activities.map((activity) => {
                const reservation = myReservations.find((item) => item.id === activity.rid);
                return (
                  <View key={activity.key} style={[dynamicStyles.riderReservationsView14({ c }), staticStyles.riderReservationsActivityRow]}>
                    <View style={{ width:5, backgroundColor:activity.act === 'Stored' ? c.gold : c.primary }} />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`View details for locker ${activity.slot} cabinet activity`}
                      onPress={() => setHistoryDetails({ type:'activity', record:activity, reservation })}
                      style={staticStyles.riderHistoryCardPressable}
                    >
                      <Text style={dynamicStyles.riderReservationsText18({ c })}>Locker {activity.slot}</Text>
                      <View style={staticStyles.riderHistoryCardStatus}>
                        <Tag kind="mute" text={activity.status} />
                        <Ionicons name="chevron-forward" size={18} color={c.muted} />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }) : (
                <View style={staticStyles.riderReservationsView22}>
                  <IconBox icon="list-outline" tone="gold" size={56} />
                  <Text style={s.empty}>No cabinet activity has been recorded for your reservations.</Text>
                </View>
              )}
            </View>
          )}
        </View> : null}
      </View>

      <InfoModal visible={startTimeModal} title="Choose Starting Time" onClose={() => setStartTimeModal(false)}>
        <StartingTimeSelector value={startTimeDraft} onChange={setStartTimeDraft} />
        <View style={[s.row, { justifyContent:'flex-end', marginTop:16 }]}>
          <Btn variant="outline" label="Cancel" onPress={() => setStartTimeModal(false)} />
          <Btn label="Confirm" onPress={validTime(startTimeDraft) ? confirmStartTime : undefined} />
        </View>
      </InfoModal>
      <InfoModal visible={durationModal} title="Choose Duration" onClose={() => setDurationModal(false)}>
        <DurationSelector value={durationDraft} onChange={setDurationDraft} />
        <View style={[s.row, { justifyContent:'flex-end', marginTop:16 }]}>
          <Btn variant="outline" label="Cancel" onPress={() => setDurationModal(false)} />
          <Btn label="Confirm Duration" onPress={durationDraft.hours * 60 + durationDraft.minutes >= 15 ? confirmDuration : undefined} />
        </View>
      </InfoModal>
      <InfoModal
        visible={!!historyDetails}
        title={selectedActivity ? 'Cabinet Activity Details' : 'Reservation Details'}
        onClose={() => setHistoryDetails(null)}
      >
        {selectedActivity ? (
          <View style={{ gap:8 }}>
            <Text style={s.cardTitle}>{selectedActivity.title}</Text>
            <Text style={s.cardSub}>Locker: {selectedActivity.slot}</Text>
            <Text style={s.cardSub}>Activity: {selectedActivity.act}</Text>
            <Text style={s.cardSub}>Activity status: {selectedActivity.status}</Text>
            {Number.isFinite(selectedActivity.eventTime) && selectedActivity.eventTime > 0
              ? <Text style={s.cardSub}>Activity time: {new Date(selectedActivity.eventTime).toLocaleString()}</Text>
              : null}
            {selectedReservation ? (
              <>
                <Text style={s.cardTitle}>Reservation #{selectedReservation.id}</Text>
                {selectedReservation.date ? <Text style={s.cardSub}>Reservation date: {fd(selectedReservation.date)}</Text> : null}
                {selectedReservation.time ? <Text style={s.cardSub}>Starting time: {ft(selectedReservation.time)}</Text> : null}
                {selectedReservation.endTime ? <Text style={s.cardSub}>Ending time: {ft(selectedReservation.endTime)}</Text> : null}
                {selectedReservation.durationMinutes != null
                  ? <Text style={s.cardSub}>Duration: {selectedReservation.wholeDay ? 'Whole Day' : `${selectedReservation.durationMinutes} minutes`}</Text>
                  : null}
                <Text style={s.cardSub}>Reservation status: {selectedReservationStatus}</Text>
                <Text style={s.cardSub}>Payment status: {selectedPaymentStatus}</Text>
              </>
            ) : null}
          </View>
        ) : selectedReservation ? (
          <View style={{ gap:8 }}>
            <Text style={s.cardTitle}>Reservation #{selectedReservation.id}</Text>
            <Text style={s.cardSub}>Locker: {selectedReservation.slot}</Text>
            {selectedReservation.date ? <Text style={s.cardSub}>Reservation date: {fd(selectedReservation.date)}</Text> : null}
            {selectedReservation.time ? <Text style={s.cardSub}>Starting time: {ft(selectedReservation.time)}</Text> : null}
            {selectedReservation.endTime ? <Text style={s.cardSub}>Ending time: {ft(selectedReservation.endTime)}</Text> : null}
            {selectedReservation.durationMinutes != null
              ? <Text style={s.cardSub}>Duration: {selectedReservation.wholeDay ? 'Whole Day' : `${selectedReservation.durationMinutes} minutes`}</Text>
              : null}
            <Text style={s.cardSub}>Reservation status: {selectedReservationStatus}</Text>
            <Text style={s.cardSub}>Payment status: {selectedPaymentStatus}</Text>
            {selectedReservation.totalPrice != null ? <Text style={s.cardSub}>Total payment: PHP {Number(selectedReservation.totalPrice).toFixed(2)}</Text> : null}
            <Text style={s.cardSub}>Helmet stored: {selectedReservation.stored ? 'Yes' : 'No'}</Text>
            <Text style={s.cardSub}>QR code: {selectedQrAvailable ? 'Available' : 'Not available'}</Text>
            {selectedPayment?.rejectionReason
              ? <Text style={s.cardSub}>Payment rejection reason: {selectedPayment.rejectionReason}</Text>
              : null}
          </View>
        ) : null}
      </InfoModal>
      <InfoModal visible={!!extensionFor} title="Extend reservation time" onClose={() => extensionBusy ? null : setExtensionFor(null)}>
        <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>Select an additional duration. Finance must approve the payment before the expiration time changes.</Text>
        <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 }}>
          {[15,30,45,60,90,120].map((minutes) => (
            <TouchableOpacity key={minutes} onPress={() => setExtensionMinutes(minutes)}
              style={{ width:'30%', minHeight:44, alignItems:'center', justifyContent:'center', borderRadius:10, borderWidth:1,
                borderColor:extensionMinutes === minutes ? c.gold : c.line, backgroundColor:extensionMinutes === minutes ? c.goldBg : c.card }}>
              <Text style={{ color:extensionMinutes === minutes ? c.gold : c.text, fontWeight:'700' }}>{minutes < 60 ? `${minutes} min` : `${minutes/60} hour${minutes === 60 ? '' : 's'}`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.cardTitle}>Additional duration: {extensionMinutes} minutes</Text>
        <Text style={s.cardSub}>Additional fee: PHP {((extensionMinutes/15)*5).toFixed(2)}</Text>
        <Btn variant="outline" icon="image-outline" label={extensionReceipt ? 'Replace receipt image' : 'Upload receipt image'} onPress={pickExtensionReceipt} />
        {extensionError ? <Text style={[s.err, staticStyles.cabinetScannerView12]}>{extensionError}</Text> : null}
        <View style={staticStyles.riderReservationsView7}><Btn full label={extensionBusy ? 'Submitting…' : 'Submit extension payment'} onPress={extensionBusy ? undefined : submitExtension} /></View>
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
