import axios from 'axios';

const API = 'https://spendwise-ai-fwmp.onrender.com/api/subscriptions';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getSubscriptions = (token) =>
    axios.get(API, getConfig(token));

export const getSubscriptionSummary = (token) =>
    axios.get(`${API}/summary`, getConfig(token));

export const getUpcomingRenewals = (token) =>
    axios.get(`${API}/upcoming`, getConfig(token));

export const createSubscription = (token, data) =>
    axios.post(API, data, getConfig(token));

export const updateSubscription = (token, id, data) =>
    axios.put(`${API}/${id}`, data, getConfig(token));

export const deleteSubscription = (token, id) =>
    axios.delete(`${API}/${id}`, getConfig(token));

export const updateSubscriptionStatus = (token, id, status) =>
    axios.patch(`${API}/${id}/status`, { status }, getConfig(token));

export const generateRenewalExpenses = (token) =>
    axios.post(`${API}/generate-renewal-expenses`, {}, getConfig(token));
