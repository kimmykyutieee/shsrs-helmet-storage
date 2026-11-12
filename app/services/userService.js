import { api } from './api';

const updateProfile = (data) => api('PUT', '/api/me', data);
const updateProfilePhoto = (photo) => api('PUT', '/api/me/photo', { photo });
const updatePassword = (current, next) => api('PUT', '/api/me/password', { current, next });
const deleteAccount = () => api('DELETE', '/api/me');
const setFinanceRole = (userId, finance) => api('PUT', `/api/admin/users/${userId}/finance`, { finance });

export { updateProfile, updateProfilePhoto, updatePassword, deleteAccount, setFinanceRole };
