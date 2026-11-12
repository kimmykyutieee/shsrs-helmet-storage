import { api } from './api';

const submitPayment = (reservationId, receipt) => api('POST', `/api/reservations/${reservationId}/payments`, { receipt });
const getPendingPayments = () => api('GET', '/api/finance/payments');
const getPaymentHistory = () => api('GET', '/api/finance/payment-history');
const getPaymentReceipt = (paymentId) => api('GET', `/api/finance/payments/${paymentId}/receipt`);
const decidePayment = (paymentId, decision) => api('POST', `/api/finance/payments/${paymentId}/${decision}`);

export { submitPayment, getPendingPayments, getPaymentHistory, getPaymentReceipt, decidePayment };
