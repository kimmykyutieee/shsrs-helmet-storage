const okDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '');

const timeMinutes = (time) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time || '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const minutesToTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const calculateSchedule = (date, time, durationMinutes, wholeDay) => {
  const start = timeMinutes(time);
  if (!okDate(date) || start === null || start < 360 || start > 1260) {
    return { error: 'Reservations must start between 6:00 AM and 9:00 PM.' };
  }
  if (wholeDay) {
    if (start >= 1260) return { error: 'A reservation cannot start at or after 9:00 PM.' };
    return { endTime: '21:00', durationMinutes: 1260 - start, wholeDay: true, totalPrice: 100 };
  }
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < 15 || duration % 15 !== 0) {
    return { error: 'Duration must be a 15-minute increment.' };
  }
  const end = start + duration;
  if (end > 1260) return { error: 'Reservations must end by 9:00 PM.' };
  return {
    endTime: minutesToTime(end),
    durationMinutes: duration,
    wholeDay: false,
    totalPrice: (duration / 15) * 5,
  };
};

module.exports = { calculateSchedule, timeMinutes };
