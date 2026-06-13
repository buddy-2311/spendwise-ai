import axios from 'axios';

const API = 'http://localhost:5000/api/notifications';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getNotifications = (token) =>
    axios.get(API, getConfig(token));

export const getUnreadCount = (token) =>
    axios.get(`${API}/unread-count`, getConfig(token));

export const generateNotifications = (token) =>
    axios.post(`${API}/generate`, {}, getConfig(token));

export const markAsRead = (token, id) =>
    axios.patch(`${API}/${id}/read`, {}, getConfig(token));

export const markAllAsRead = (token) =>
    axios.patch(`${API}/read-all`, {}, getConfig(token));

export const deleteNotification = (token, id) =>
    axios.delete(`${API}/${id}`, getConfig(token));
