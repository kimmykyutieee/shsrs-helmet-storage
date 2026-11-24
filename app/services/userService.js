import { api } from './api';

const updateProfile = (data) => api('PUT', '/api/me', data);
const updateProfilePhoto = (photo) => api('PUT', '/api/me/photo', { photo });
const updatePassword = (current, next) => api('PUT', '/api/me/password', { current, next });
const deleteAccount = () => api('DELETE', '/api/me');
const updateAdminUser = (userId, data) => api('PUT', `/api/admin/users/${userId}`, data);
const deleteAdminUser = (userId) => api('DELETE', `/api/admin/users/${userId}`);

export { updateProfile, updateProfilePhoto, updatePassword, deleteAccount, updateAdminUser, deleteAdminUser };
