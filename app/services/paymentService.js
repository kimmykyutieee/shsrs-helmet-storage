import { api } from './api';

const submitPayment = async (reservationId, receipt) => {
  if (receipt && typeof receipt === 'object' && (receipt.uri || receipt.file)) {
    const formData = new FormData();
    if (receipt.file) formData.append('receipt', receipt.file, receipt.name || 'payment-proof');
    else formData.append('receipt', {
      uri: receipt.uri,
      name: receipt.name || 'payment-proof',
      type: receipt.type || 'application/octet-stream',
    });
    return api('POST', `/api/reservations/${reservationId}/payments`, formData, true);
  }
  return api('POST', `/api/reservations/${reservationId}/payments`, { receipt });
};
const getPendingPayments = () => api('GET', '/api/finance/payments');
const getPaymentHistory = () => api('GET', '/api/finance/payment-history');
const getPaymentReceipt = (paymentId) => api('GET', `/api/finance/payments/${paymentId}/receipt`);
const decidePayment = (paymentId, decision) => api('POST', `/api/finance/payments/${paymentId}/${decision}`);
const getRefunds = () => api('GET','/api/finance/refunds');
const processRefund = (refundId, action, body = {}) => api('POST',`/api/finance/refunds/${refundId}/${action}`,body);

export { submitPayment, getPendingPayments, getPaymentHistory, getPaymentReceipt, decidePayment, getRefunds, processRefund };
