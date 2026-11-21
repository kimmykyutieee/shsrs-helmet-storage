import { api } from './api';

const toggleSlotMaintenance = (slot) => api('PUT', `/api/admin/slots/${slot}/toggle`);
const getReservationQr = (reservationId) => api('GET', `/api/reservations/${reservationId}/qr`);
const scanCabinet = (code) => api('POST', '/api/scan', { code: String(code) });

export { toggleSlotMaintenance, getReservationQr, scanCabinet };
