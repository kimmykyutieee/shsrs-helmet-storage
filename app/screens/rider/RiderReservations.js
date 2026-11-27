import React, { useState, useEffect } from 'react';
import { AppState, View, Text, TextInput, Image, Platform, ScrollView, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../shared/hooks/useApp';
import { createReservation, cancelReservation, requestReservationExtension } from '../../services/reservationService';
import { submitPayment } from '../../services/paymentService';
import { dt, fd, ft, durationLabel, isPast, esc } from '../../shared/utils/date';
import { sharePdf, confirmBox } from '../../shared/utils/actions';
import { PAYMENT_CURRENCY } from '../../shared/constants/config';
import { GOLD } from '../../shared/constants/theme';
import { Layout, SlotGrid, DateTimeFields, Btn, Tag, InfoModal, IconBox } from '../../components';
import { staticStyles, dynamicStyles, riderExportStyles } from '../../components/rider.styles';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const GCASH_QR = require('../../assets/gcash-qr.png');
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
const displayDuration = ({ hours, minutes }) => durationLabel(hours * 60 + minutes);
const clockTime = (minutes) => {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2,'0')} ${hour < 12 ? 'AM' : 'PM'}`;
};

function DetailLine({ label, value, icon, c }) {
  return (
    <View style={staticStyles.riderDetailLine}>
      <View style={[staticStyles.riderDetailIcon, { backgroundColor:c.soft }]}><Ionicons name={icon} size={17} color={c.primary} /></View>
      <View style={staticStyles.riderDetailCopy}>
        <Text style={dynamicStyles.riderDetailLabel({ c })}>{label}</Text>
        <Text style={dynamicStyles.riderDetailValue({ c })}>{value}</Text>
      </View>
    </View>
  );
}

function PaymentQrCard({ amount }) {
  const { c, s } = useApp();
  return (
    <View style={[staticStyles.riderPaymentQrCard, { backgroundColor:c.soft, borderColor:c.line }]}>
      <View style={staticStyles.riderPaymentQrHeader}>
        <Text style={dynamicStyles.riderPaymentQrTitle({ c })}>Scan to pay with GCash</Text>
        <Text style={dynamicStyles.riderPaymentQrAmount({ c })}>PHP {Number(amount).toFixed(2)}</Text>
      </View>
      <Image source={GCASH_QR} style={staticStyles.riderPaymentQrImage} resizeMode="contain" accessibilityLabel="GCash payment QR code" />
      <Text style={[s.muted, staticStyles.riderPaymentQrHint]}>Pay the exact amount shown. Transfer fees may apply. Upload your payment receipt below.</Text>
    </View>
  );
}

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
  const summary = displayDuration(value);
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
  const [clockNow, setClockNow] = useState(() => new Date());
  const [sel, setSel] = useState(0);
  const [rd, setRd] = useState('');
  const [startTime, setStartTime] = useState({ hour:TIME_HOURS.find((option) => option.id === 'morning-8'), minute:0, period:'AM' });
  const [startTimeChosen, setStartTimeChosen] = useState(false);
  const [startTimeDraft, setStartTimeDraft] = useState(startTime);
  const [startTimeModal, setStartTimeModal] = useState(false);
  const [duration, setDuration] = useState({ hours:1, minutes:0 });
  const [durationChosen, setDurationChosen] = useState(false);
  const [durationDraft, setDurationDraft] = useState(duration);
  const [durationModal, setDurationModal] = useState(false);
  const [wholeDay, setWholeDay] = useState(false);
  const [qi, setQi] = useState(''); const [q, setQ] = useState('');
  const [reservationSection, setReservationSection] = useState('history');
  const [historyFilter, setHistoryFilter] = useState('All');
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
  const [extensionTick, setExtensionTick] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setClockNow(new Date());
    });
    return () => subscription.remove();
  }, []);
  const extensionReservation = extensionFor ? (db.res || []).find((r) => r.id === extensionFor) : null;
  const isLateRetrievalExtension = extensionReservation?.status === 'Expired' && Number(extensionReservation?.stored) === 1;
  useEffect(() => {
    if (!extensionFor || !isLateRetrievalExtension) return undefined;
    const id = setInterval(() => setExtensionTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [extensionFor, isLateRetrievalExtension]);
  const lateExtensionMinutes = (() => {
    if (!isLateRetrievalExtension || !extensionReservation) return 15;
    const grace = extensionReservation.graceDeadline ? new Date(extensionReservation.graceDeadline).getTime() : NaN;
    if (!Number.isFinite(grace)) return 15;
    return Math.max(15, Math.ceil(Math.max(0, Date.now() - grace) / (15 * 60000)) * 15 + 0 * extensionTick);
  })();
  const effectiveExtensionMinutes = isLateRetrievalExtension ? lateExtensionMinutes : extensionMinutes;
  const extensionFee = (effectiveExtensionMinutes / 15) * 5;
  const extensionDurationLabel = durationLabel(effectiveExtensionMinutes);

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

  const physicallyOccupied = new Set((db.slotReservations || []).filter((r) => Number(r.stored) === 1).map((r) => Number(r.slot)));
  const taken = new Set(rd ? (db.slotReservations || []).filter((r) => r.date === rd).map((r) => Number(r.slot)) : []);
  physicallyOccupied.forEach((slot) => taken.add(slot));
  const eff = db.blocked.includes(Number(sel)) || taken.has(Number(sel)) ? 0 : sel;
  const reviewRows = [
    ['Locker', eff ? `Locker ${eff}` : 'Not selected'],
    ['Date', rd ? fd(rd) : 'Not selected'],
    ['Starting time', displayTime(startTime)],
    ['Duration', wholeDay ? `Whole Day (${durationLabel(Math.max(0,1260-startMinutes))})` : displayDuration(duration)],
    ['Ending time', endTimeFor()],
  ];
  const showReservationSummary = Boolean(eff && rd && startTimeChosen && (durationChosen || wholeDay));
  const myReservations = mine().slice().sort((a, b) => Number(b.id) - Number(a.id));
  const nextReservationStart = myReservations
    .filter((reservation) => reservation.status === 'Confirmed')
    .map((reservation) => dt(reservation.date, reservation.time).getTime())
    .filter((timestamp) => timestamp > clockNow.getTime())
    .sort((a, b) => a - b)[0];
  useEffect(() => {
    if (nextReservationStart == null) return undefined;
    const timeout = setTimeout(
      () => setClockNow(new Date()),
      Math.max(0, nextReservationStart - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [nextReservationStart, clockNow]);
  const statusFor = (reservation, payment) => {
    if (reservation.status === 'Cancelled' || reservation.status === 'Canceled') return 'Cancelled';
    if (reservation.status === 'Expired') return 'Expired';
    if (reservation.status === 'Active') return 'Active';
    if (reservation.status === 'Used') return 'Completed';
    if (reservation.status === 'Confirmed') return dt(reservation.date, reservation.time) > clockNow ? 'Upcoming' : 'Confirmed';
    if (payment?.status === 'Pending') return 'Pending Verification';
    return 'Pending Payment';
  };
  const historyGroup = (reservation) => {
    if (['Cancelled', 'Canceled', 'Pending Refund Verification'].includes(reservation.status)) return 'Cancelled';
    if (['Expired', 'Used', 'Completed'].includes(reservation.status) || (isPast(reservation) && reservation.status !== 'Active')) return 'Completed';
    return 'Upcoming';
  };
  const rows = myReservations.filter((reservation) =>
    (historyFilter === 'All' || historyGroup(reservation) === historyFilter)
    && `locker ${reservation.slot} ${reservation.date} ${fd(reservation.date)} ${ft(reservation.time)}`.toLowerCase().includes(q.toLowerCase()));
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
    setStartTimeChosen(true);
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
    setDurationChosen(true);
    setWholeDay(false);
    setDurationModal(false);
    setEr('');
  };

  const book = async () => {
    if (!eff) return setEr('Please select a locker.');
    if (!rd) return setEr('Please choose a date.');
    if (!startTimeChosen) return setEr('Please choose a starting time.');
    if (!durationChosen && !wholeDay) return setEr('Please choose a duration or select Whole Day.');
    if (timeError) return setEr(timeError);
    if (dt(rd, parsedStart) < new Date()) return setEr('Please choose a future date and time.');
    try {
      const r = await createReservation({
        slot: eff, date: rd, time: parsedStart,
        wholeDay,
        durationMinutes: wholeDay ? undefined : durationMinutes,
      });
      await refresh();
      toast(`Locker ${eff} reserved for ${fd(rd)}.`);
      setSel(0); setRd(''); setEr('');
      setStartTimeChosen(false); setDurationChosen(false); setWholeDay(false);
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
      let file;
      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        if (!response.ok) throw new Error('Could not read the selected image.');
        const blob = await response.blob();
        if (blob.size > MAX_RECEIPT_BYTES) return setExtensionError('The image must be 5 MB or smaller.');
        if (!blob.size) return setExtensionError('Choose a non-empty image file.');
        file = {
          file: blob,
          name: asset.fileName || `extension-proof-${Date.now()}`,
          type: blob.type || asset.mimeType || 'application/octet-stream',
        };
      } else {
        if (asset.fileSize > MAX_RECEIPT_BYTES) {
          return setExtensionError('The image must be 5 MB or smaller.');
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
          return setExtensionError('The image must be 5 MB or smaller.');
        }
        file = `data:${mimeType};base64,${base64}`;
      }
      setExtensionReceiptFile(file);
      setExtensionReceipt(asset.uri);
      setExtensionError('');
    } catch (x) { setExtensionError(x.message); }
  };

  const submitExtension = async () => {
    if (!extensionReceipt && !extensionReceiptFile) return setExtensionError('Upload an extension payment receipt.');
    setExtensionBusy(true); setExtensionError('');
    try {
      await requestReservationExtension(extensionFor, effectiveExtensionMinutes, extensionReceiptFile || extensionReceipt);
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
    const html = `<html><body ${riderExportStyles.reservationBody}><div ${riderExportStyles.reservationHeader}><h2 ${riderExportStyles.reservationTitle}>HelMate</h2><p ${riderExportStyles.reservationMeta}>Reservations for ${esc(me.name)} (${esc(me.email)}) · Generated ${esc(new Date().toLocaleString())}</p></div><table ${riderExportStyles.reservationTable}><thead><tr>${['ID', 'Locker', 'Date', 'Time', 'Status'].map((h) => `<th ${riderExportStyles.reservationHeading}>${h}</th>`).join('')}</tr></thead><tbody>${r.map((x) => `<tr><td ${td}>#${x.id}</td><td ${td}>Locker ${x.slot}</td><td ${td}>${fd(x.date)}</td><td ${td}>${ft(x.time)}</td><td ${td}>${statusFor(x, paymentFor(x.id))}</td></tr>`).join('')}</tbody></table></body></html>`;
    try { await sharePdf(html, toast); } catch (_e) { toast('Could not create the PDF.'); }
  };

  return (
    <Layout cur={mode === 'mine' ? 'myReservations' : 'reservations'} title={mode === 'mine' ? 'My Reservations' : 'Reservation'} subtitle={mode === 'mine' ? 'Review and manage your reservations.' : 'Book a locker.'}>
      <View style={dynamicStyles.cabinetScannerView1({ wide })}>
        {mode !== 'mine' ? <View style={dynamicStyles.riderReservationsView2({ wide })}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Select a locker</Text>
            <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>Choose an available locker.</Text>
            <SlotGrid taken={taken} blocked={db.blocked} sel={eff} onSel={setSel} />
            
            <View style={staticStyles.riderReservationSchedule}>
              <Text style={s.cardTitle}>Pick date &amp; time</Text>
              <DateTimeFields date={rd} onDate={setRd} dateOnly />

              <View style={staticStyles.riderReservationScheduleField}>
                <Text style={s.label}>Starting time</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={openStartTimeSelector}
                  style={[s.input, { minHeight:48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
                >
                  <Text style={startTimeChosen ? dynamicStyles.riderReservationsText18({ c }) : s.muted}>
                    {startTimeChosen ? displayTime(startTime) : 'Choose Starting Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={staticStyles.riderReservationScheduleField}>
                <Text style={s.label}>Duration</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={openDurationSelector}
                  style={[s.input, { minHeight:48, flexDirection:'row', alignItems:'center', justifyContent:'space-between' }]}
                >
                  <Text style={durationChosen || wholeDay ? dynamicStyles.riderReservationsText18({ c }) : s.muted}>
                    {wholeDay ? 'Whole Day' : durationChosen ? displayDuration(duration) : 'Choose Duration'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={staticStyles.riderReservationsWholeDay}>
                <Btn small variant={wholeDay ? 'gold' : 'outline'} icon="sunny-outline"
                  label={wholeDay ? 'Whole Day selected ' : 'Choose Whole Day'}
                  onPress={() => { setWholeDay(!wholeDay); setEr(''); }} />
              </View>
            </View>
            {showReservationSummary ? <View style={[s.card, staticStyles.riderReservationsReviewCard, { marginTop:16, borderColor:c.line }]}>
              <View style={staticStyles.riderReservationsReviewHeader}>
                <View>
                  <Text style={dynamicStyles.riderReservationsReviewEyebrow({ c })}>RESERVATION SUMMARY</Text>
                  <Text style={[s.cardTitle, staticStyles.riderReservationsReviewTitle]}>Review reservation</Text>
                </View>
                <Ionicons name="receipt-outline" size={23} color={c.gold} />
              </View>
              <View style={staticStyles.riderReservationsReviewRows}>
                {reviewRows.map(([label, value]) => (
                  <View key={label} style={staticStyles.riderReservationsReviewRow}>
                    <Text style={[s.muted, staticStyles.riderReservationsReviewLabel]}>{label}</Text>
                    <Text style={[staticStyles.riderReservationsReviewValue, { color:c.text }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={[staticStyles.riderReservationsReviewDivider, { borderColor:c.line }]} />
              <View style={staticStyles.riderReservationsReviewTotal}>
                <Text style={[s.muted, staticStyles.riderReservationsReviewTotalLabel]}>Total price</Text>
                <Text style={[staticStyles.riderReservationsReviewAmount, { color:c.text }]}>₱{totalPrice.toFixed(2)}</Text>
              </View>
            </View> : null}
            {timeError ? <View style={dynamicStyles.riderReservationsView5({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.riderReservationsText6({ c })}>{timeError}</Text></View> : null}
            {er ? <View style={dynamicStyles.riderReservationsView5({ c })}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={dynamicStyles.riderReservationsText6({ c })}>{er}</Text></View> : null}
            <View style={staticStyles.riderReservationsView7}><Btn full icon="checkmark-circle-outline" label="Confirm booking" onPress={book} /></View>
          </View>
        </View> : null}
        {mode !== 'booking' ? <View style={dynamicStyles.riderReservationsView8({ wide })}>
          <View style={[staticStyles.riderReservationsTabs, { borderColor:c.line, backgroundColor:c.soft }]}>
            {[
              ['history', 'Reservation History'],
              ['activity', 'Locker Activity'],
            ].map(([section, title]) => {
              const selected = reservationSection === section;
              const icon = section === 'history' ? 'calendar-outline' : 'time-outline';
              return (
                <TouchableOpacity
                  key={section}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setReservationSection(section)}
                  style={[staticStyles.riderReservationsTab, { backgroundColor:selected ? c.card : 'transparent', borderColor:selected ? c.line : 'transparent' }]}
                >
                  <Ionicons name={icon} size={17} color={selected ? c.primary : c.muted} />
                  <Text style={{ color:selected ? c.text : c.muted, fontFamily:selected ? 'NunitoSansExtraBold' : 'NunitoSansSemiBold', fontWeight:selected ? '800' : '600', textAlign:'center' }}>{title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {reservationSection === 'history' ? (
            <View style={{ gap:12 }}>
              <View style={[staticStyles.riderReservationsHistoryHeading, { borderBottomColor:c.line }]}>
                <View>
                  <Text style={dynamicStyles.riderReservationsHistoryTitle({ c })}>Reservation history</Text>
                  <Text style={s.cardSub}>All your bookings in one place</Text>
                </View>
                <Text style={[s.cardSub, staticStyles.riderReservationsResultCount, { backgroundColor:c.soft }]}>{rows.length} {rows.length === 1 ? 'reservation' : 'reservations'}</Text>
              </View>
              <View style={[staticStyles.riderReservationsSearch, { backgroundColor:c.card, borderColor:c.line }]}>
                <Ionicons name="search-outline" size={17} color={c.muted} />
                <TextInput style={[s.input, staticStyles.riderReservationsSearchInput]} placeholder="Find a locker or date" placeholderTextColor={c.muted} value={qi} onChangeText={(value) => { setQi(value); setQ(value); }} onSubmitEditing={() => setQ(qi)} returnKeyType="search" />
                {qi ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQi(''); setQ(''); }} style={staticStyles.riderReservationsClearSearch}><Ionicons name="close-circle" size={18} color={c.muted} /></TouchableOpacity> : null}
              </View>
              <View style={staticStyles.riderReservationsHistoryFilters}>
                {['All', 'Upcoming', 'Completed', 'Cancelled'].map((filter) => {
                  const selected = historyFilter === filter;
                  return (
                    <TouchableOpacity
                      key={filter}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => setHistoryFilter(filter)}
                      style={[staticStyles.riderReservationsHistoryFilter, { backgroundColor:selected ? c.goldBg : c.card, borderColor:selected ? c.gold : c.line }]}
                    >
                      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color:selected ? c.text : c.muted, fontFamily:selected ? 'NunitoSansExtraBold' : 'NunitoSansSemiBold', fontWeight:selected ? '800' : '600', fontSize:11 }}>{filter}</Text>
                    </TouchableOpacity>
                  );
                })}
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
                  && (['Confirmed','Active'].includes(r.status) || (r.status === 'Expired' && Number(r.stored) === 1))
                  && !extensionPending;
                const canCancel = ['Pending','Confirmed','Active'].includes(r.status);
                return (
                  <View key={r.id} style={dynamicStyles.riderReservationsHistoryCard({ c, isPast, r, GOLD })}>
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`View details for locker ${r.slot}`}
                        onPress={() => setHistoryDetails({ type:'reservation', record:r })}
                        style={staticStyles.riderReservationsHistoryMain}
                      >
                        <View style={staticStyles.riderReservationsHistoryMeta}>
                          <Text style={dynamicStyles.riderReservationsText18({ c })}>Locker {r.slot}</Text>
                          <Tag kind={statusTone} text={status} />
                        </View>
                        <View style={staticStyles.riderReservationsHistoryInfoRow}>
                          <View style={staticStyles.riderReservationsDateLine}>
                            <Ionicons name="calendar-outline" size={15} color={c.muted} />
                            <Text style={[s.muted, staticStyles.riderReservationsHistoryTime]}>{fd(r.date)} · {ft(r.time)}</Text>
                          </View>
                          {r.totalPrice != null ? <Text style={[staticStyles.riderReservationsHistoryPrice, { color:c.text }]}>₱{Number(r.totalPrice).toFixed(2)}</Text> : null}
                        </View>
                        <View style={staticStyles.riderReservationsHistoryRef}>
                          <Text style={[s.muted, staticStyles.riderReservationsHistoryTime]}>Reservation #{r.id}</Text>
                          <Ionicons name="chevron-forward" size={16} color={c.muted} />
                        </View>
                      </TouchableOpacity>
                    {canOpenQr || canPay || canExtend || canCancel ? <View style={[staticStyles.riderReservationsHistoryActions, { borderTopColor:c.line }]}>
                        {canOpenQr ? <Btn small variant="outline" icon="qr-code-outline" label="View QR" onPress={() => nav('qr', r.id)} /> : null}
                        {canPay ? <Btn small variant="gold" icon="card-outline" label={payment?.status === 'Rejected' ? 'Resubmit payment' : `Pay ${PAYMENT_CURRENCY} ${Number(r.totalPrice || 0).toFixed(2)}`} onPress={() => { setPayFor(r.id); setReceipt(''); setReceiptFile(null); setPaymentError(''); }} /> : null}
                        {canExtend ? <Btn small variant="gold" icon="time-outline" label="Extend Time" onPress={() => { setExtensionFor(r.id); setExtensionMinutes(30); setExtensionReceipt(''); setExtensionReceiptFile(null); setExtensionError(''); }} /> : null}
                        {canCancel ? <Btn small variant="outline" icon="trash-outline" label="Cancel" onPress={() => cancel(r.id)} /> : null}
                    </View> : null}
                  </View>
                );
              }) : (
                <View style={staticStyles.riderReservationsView22}>
                  <IconBox icon="calendar-outline" tone="gold" size={56} />
                  <Text style={s.empty}>{q ? 'No reservations match your search.' : historyFilter === 'All' ? 'No reservations yet.' : `No ${historyFilter.toLowerCase()} reservations.`}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap:10 }}>
              <View style={[staticStyles.riderReservationsView9, { marginBottom:0 }]}>
                <View>
                  <Text style={s.cardTitle}>Locker Activity</Text>
                  <Text style={s.cardSub}>Storage and retrieval updates</Text>
                </View>
                <Text style={s.cardSub}>{activities.length} {activities.length === 1 ? 'record' : 'records'}</Text>
              </View>
              {activities.length ? activities.map((activity) => {
                const reservation = myReservations.find((item) => item.id === activity.rid);
                return (
                  <View key={activity.key} style={[dynamicStyles.riderReservationsView14({ c }), staticStyles.riderReservationsActivityRow]}>
                    <View style={{ width:5, backgroundColor:activity.act === 'Stored' ? c.gold : c.primary }} />
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`View details for locker ${activity.slot} activity`}
                      onPress={() => setHistoryDetails({ type:'activity', record:activity, reservation })}
                      style={staticStyles.riderHistoryCardPressable}
                    >
                      <View style={staticStyles.riderReservationsActivityContent}>
                        <View style={[staticStyles.riderReservationsActivityBubble, { backgroundColor:c.goldBg }]}><Ionicons name={activity.act === 'Stored' ? 'arrow-down-outline' : 'arrow-up-outline'} size={18} color={c.gold} /></View>
                        <View style={staticStyles.riderReservationsActivityText}>
                          <Text style={dynamicStyles.riderReservationsText18({ c })}>{activity.title || activity.act}</Text>
                          <Text style={s.muted}>Locker {activity.slot}{Number.isFinite(activity.eventTime) && activity.eventTime > 0 ? ` · ${new Date(activity.eventTime).toLocaleString()}` : ''}</Text>
                        </View>
                      </View>
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
                  <Text style={s.empty}>No locker activity has been recorded for your reservations.</Text>
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
        title={selectedActivity ? 'Locker Activity Details' : 'Reservation Details'}
        onClose={() => setHistoryDetails(null)}
      >
        {selectedActivity ? (
          <View style={staticStyles.riderDetailContent}>
            <View style={[staticStyles.riderDetailHero, { backgroundColor:c.goldBg }]}>
              <View style={[staticStyles.riderDetailHeroIcon, { backgroundColor:c.card }]}><Ionicons name={selectedActivity.act === 'Stored' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={26} color={c.gold} /></View>
              <View style={staticStyles.riderDetailHeroCopy}>
                <Text style={dynamicStyles.riderDetailEyebrow({ c })}>LOCKER ACTIVITY</Text>
                <Text style={dynamicStyles.riderDetailHeroTitle({ c })}>{selectedActivity.title || selectedActivity.act}</Text>
              </View>
              <Tag kind="mute" text={selectedActivity.status} />
            </View>
            <View style={[staticStyles.riderDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
              <Text style={dynamicStyles.riderDetailSectionTitle({ c })}>Activity information</Text>
              <DetailLine c={c} icon="file-tray-stacked-outline" label="Locker" value={`Locker ${selectedActivity.slot}`} />
              <DetailLine c={c} icon="swap-horizontal-outline" label="Action" value={selectedActivity.act} />
              {Number.isFinite(selectedActivity.eventTime) && selectedActivity.eventTime > 0
                ? <DetailLine c={c} icon="time-outline" label="Date and time" value={new Date(selectedActivity.eventTime).toLocaleString()} />
                : null}
            </View>
            {selectedReservation ? (
              <View style={[staticStyles.riderDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
                <Text style={dynamicStyles.riderDetailSectionTitle({ c })}>Related reservation · #{selectedReservation.id}</Text>
                <DetailLine c={c} icon="calendar-outline" label="Date and time" value={`${fd(selectedReservation.date)}${selectedReservation.time ? ` · ${ft(selectedReservation.time)}` : ''}`} />
                <DetailLine c={c} icon="checkmark-circle-outline" label="Reservation status" value={selectedReservationStatus} />
                <DetailLine c={c} icon="card-outline" label="Payment status" value={selectedPaymentStatus} />
              </View>
            ) : null}
          </View>
        ) : selectedReservation ? (
          <View style={staticStyles.riderDetailContent}>
            <View style={[staticStyles.riderDetailHero, { backgroundColor:c.goldBg }]}>
              <View style={[staticStyles.riderDetailHeroIcon, { backgroundColor:c.card }]}><Ionicons name="calendar-outline" size={25} color={c.gold} /></View>
              <View style={staticStyles.riderDetailHeroCopy}>
                <Text style={dynamicStyles.riderDetailEyebrow({ c })}>RESERVATION</Text>
                <Text style={dynamicStyles.riderDetailHeroTitle({ c })}>#{selectedReservation.id}</Text>
              </View>
              <Tag kind={selectedReservationStatus === 'Cancelled' || selectedReservationStatus === 'Expired' ? 'bad' : selectedReservationStatus === 'Completed' ? 'mute' : 'gold'} text={selectedReservationStatus} />
            </View>
            <View style={[staticStyles.riderDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
              <Text style={dynamicStyles.riderDetailSectionTitle({ c })}>Booking details</Text>
              <DetailLine c={c} icon="file-tray-stacked-outline" label="Locker" value={`Locker ${selectedReservation.slot}`} />
              {selectedReservation.date ? <DetailLine c={c} icon="calendar-outline" label="Date" value={fd(selectedReservation.date)} /> : null}
              {selectedReservation.time ? <DetailLine c={c} icon="time-outline" label="Starting time" value={ft(selectedReservation.time)} /> : null}
              {selectedReservation.endTime ? <DetailLine c={c} icon="time-outline" label="Ending time" value={ft(selectedReservation.endTime)} /> : null}
              {selectedReservation.durationMinutes != null ? <DetailLine c={c} icon="hourglass-outline" label="Duration" value={`${selectedReservation.wholeDay ? 'Whole Day · ' : ''}${durationLabel(selectedReservation.durationMinutes)}`} /> : null}
            </View>
            <View style={[staticStyles.riderDetailSection, { backgroundColor:c.card, borderColor:c.line }]}>
              <Text style={dynamicStyles.riderDetailSectionTitle({ c })}>Payment and access</Text>
              <DetailLine c={c} icon="card-outline" label="Payment status" value={selectedPaymentStatus} />
              {selectedReservation.totalPrice != null ? <DetailLine c={c} icon="cash-outline" label="Total payment" value={`PHP ${Number(selectedReservation.totalPrice).toFixed(2)}`} /> : null}
              <DetailLine c={c} icon="shield-checkmark-outline" label="Helmet stored" value={selectedReservation.stored ? 'Yes' : 'No'} />
              <DetailLine c={c} icon="qr-code-outline" label="QR code" value={selectedQrAvailable ? 'Available' : 'Not available'} />
              {selectedPayment?.rejectionReason ? <View style={[staticStyles.riderDetailNotice, { backgroundColor:c.badBg }]}><Ionicons name="alert-circle-outline" size={18} color={c.bad} /><Text style={{ color:c.bad, flex:1, fontWeight:'600' }}>{selectedPayment.rejectionReason}</Text></View> : null}
            </View>
          </View>
        ) : null}
      </InfoModal>
      <InfoModal visible={!!extensionFor} title={isLateRetrievalExtension ? 'Late retrieval extension' : 'Extend reservation time'} onClose={() => extensionBusy ? null : setExtensionFor(null)}>
        <Text style={[s.cardSub, staticStyles.cabinetScannerText3]}>
          {isLateRetrievalExtension
            ? 'Your helmet is still in the locker after the 10-minute grace period. The additional payment is calculated from the time passed after the grace period. Finance must approve the payment before you can retrieve your helmet.'
            : 'Select an additional duration. Finance must approve the payment before the expiration time changes.'}
        </Text>
        {isLateRetrievalExtension ? (
          <View style={[staticStyles.riderPaymentAmountCard, { backgroundColor:c.soft, borderColor:c.line, marginBottom:12 }]}>
            <View>
              <Text style={dynamicStyles.riderPaymentLabel({ c })}>LATE DURATION</Text>
              <Text style={dynamicStyles.riderPaymentAmount({ c })}>{extensionDurationLabel}</Text>
              <Text style={s.muted}>Billed in 15-minute increments from time passed after the 10-minute grace period.</Text>
            </View>
            <Ionicons name="time-outline" size={23} color={c.gold} />
          </View>
        ) : (
          <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:12 }}>
            {[15,30,45,60,90,120].map((minutes) => (
              <TouchableOpacity key={minutes} onPress={() => setExtensionMinutes(minutes)}
                style={{ width:'30%', minHeight:44, alignItems:'center', justifyContent:'center', borderRadius:10, borderWidth:1,
                  borderColor:extensionMinutes === minutes ? c.gold : c.line, backgroundColor:extensionMinutes === minutes ? c.goldBg : c.card }}>
                <Text style={{ color:extensionMinutes === minutes ? c.gold : c.text, fontWeight:'700' }}>{minutes < 60 ? `${minutes} min` : `${minutes/60} hour${minutes === 60 ? '' : 's'}`}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={s.cardTitle}>Additional duration: {extensionDurationLabel}</Text>
        <Text style={s.cardSub}>Additional fee: PHP {extensionFee.toFixed(2)}</Text>
        <PaymentQrCard amount={extensionFee} />
        <Btn variant="outline" icon="image-outline" label={extensionReceipt ? 'Replace receipt image' : 'Upload receipt image'} onPress={pickExtensionReceipt} />
        {extensionReceipt ? (
          <View style={[staticStyles.riderPaymentReceiptPreview, { backgroundColor:c.soft, borderColor:c.line }]}>
            <Image source={{ uri: extensionReceipt }} style={staticStyles.riderPaymentReceiptImage} />
            <View style={staticStyles.riderPaymentReceiptCopy}>
              <Text style={{ color:c.text, fontWeight:'700' }}>Receipt selected</Text>
              <Text style={s.muted}>Ready to submit for Finance review</Text>
            </View>
          </View>
        ) : null}
        {extensionError ? <Text style={[s.err, staticStyles.cabinetScannerView12]}>{extensionError}</Text> : null}
        <View style={staticStyles.riderReservationsView7}><Btn full label={extensionBusy ? 'Submitting…' : 'Submit extension payment'} onPress={extensionBusy ? undefined : submitExtension} /></View>
      </InfoModal>
      <InfoModal visible={!!payFor} title="Submit reservation payment" onClose={() => paymentBusy ? null : setPayFor(null)}>
        <View style={staticStyles.riderPaymentForm}>
          <View style={[staticStyles.riderPaymentAmountCard, { backgroundColor:c.soft, borderColor:c.line }]}>
            <View><Text style={dynamicStyles.riderPaymentLabel({ c })}>AMOUNT DUE</Text><Text style={dynamicStyles.riderPaymentAmount({ c })}>{PAYMENT_CURRENCY} {Number(payAmount).toFixed(2)}</Text></View>
            <Ionicons name="receipt-outline" size={23} color={c.gold} />
          </View>
          <Text style={[s.muted, staticStyles.riderPaymentInstruction]}>Upload your payment receipt. Finance will verify it before your QR code is available.</Text>
          <PaymentQrCard amount={payAmount} />
          <View style={staticStyles.riderPaymentReceiptSection}>
            <View style={staticStyles.riderPaymentReceiptHeading}>
              <Text style={s.cardTitle}>Payment receipt</Text>
              <Text style={dynamicStyles.riderPaymentRequired({ c })}>Required</Text>
            </View>
            <Btn full variant="outline" icon="image-outline" label={receipt ? 'Replace receipt image' : 'Upload receipt image'} onPress={pickReceipt} />
            {receipt ? (
              <View style={[staticStyles.riderPaymentReceiptPreview, { backgroundColor:c.soft, borderColor:c.line }]}>
                <Image source={{ uri: receipt }} style={staticStyles.riderPaymentReceiptImage} />
                <View style={staticStyles.riderPaymentReceiptCopy}>
                  <Text style={{ color:c.text, fontWeight:'700' }}>Receipt selected</Text>
                  <Text style={s.muted}>Ready to submit for review</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove receipt" onPress={() => { setReceipt(''); setReceiptFile(null); setPaymentError(''); }} style={staticStyles.riderPaymentRemoveReceipt}>
                  <Ionicons name="trash-outline" size={18} color={c.bad} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          {paymentError ? <Text style={[s.err, staticStyles.cabinetScannerView12]}>{paymentError}</Text> : null}
          <View style={staticStyles.riderReservationsView7}><Btn full icon="checkmark-circle-outline" label={paymentBusy ? 'Submitting…' : 'Submit payment'} onPress={paymentBusy ? undefined : handleSubmitPayment} /></View>
        </View>
      </InfoModal>
    </Layout>
  );
}

export default Reservations;
