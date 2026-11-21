import { api } from './api';

const createReservation = (data) => api('POST', '/api/reservations', data);
const updateReservation = (id, data) => api('PUT', `/api/reservations/${id}`, data);
const cancelReservation = (id) => api('DELETE', `/api/reservations/${id}`);
const cancelAnyReservation = (id) => api('DELETE', `/api/admin/reservations/${id}`);

export { createReservation, updateReservation, cancelReservation, cancelAnyReservation };
