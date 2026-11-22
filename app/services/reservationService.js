import { api } from './api';

const createReservation = (data) => api('POST', '/api/reservations', data);
const updateReservation = (id, data) => api('PUT', `/api/reservations/${id}`, data);
const cancelReservation = (id) => api('DELETE', `/api/reservations/${id}`);
const cancelAnyReservation = (id) => api('DELETE', `/api/admin/reservations/${id}`);
const requestReservationExtension = (id, durationMinutes, receipt) => {
  if (receipt && typeof receipt === 'object' && (receipt.uri || receipt.file)) {
    const formData = new FormData();
    formData.append('durationMinutes', String(durationMinutes));
    if (receipt.file) formData.append('receipt', receipt.file, receipt.name || 'extension-payment-proof');
    else formData.append('receipt', {
      uri: receipt.uri,
      name: receipt.name || 'extension-payment-proof',
      type: receipt.type || 'application/octet-stream',
    });
    return api('POST', `/api/reservations/${id}/extensions`, formData, true);
  }
  return api('POST', `/api/reservations/${id}/extensions`, { durationMinutes, receipt });
};

export { createReservation, updateReservation, cancelReservation, cancelAnyReservation, requestReservationExtension };
