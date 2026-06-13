import axios from 'axios';

const API = 'http://localhost:5000/api/spending-limits';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getSpendingLimits = (token, month, year) =>
    axios.get(`${API}?month=${month}&year=${year}`, getConfig(token));

export const getSpendingLimitSummary = (token, month, year) =>
    axios.get(`${API}/summary?month=${month}&year=${year}`, getConfig(token));

export const createSpendingLimit = (token, data) =>
    axios.post(API, data, getConfig(token));

export const updateSpendingLimit = (token, id, data) =>
    axios.put(`${API}/${id}`, data, getConfig(token));

export const deleteSpendingLimit = (token, id) =>
    axios.delete(`${API}/${id}`, getConfig(token));

export const recalculateSpendingLimits = (token, data) =>
    axios.post(`${API}/recalculate`, data, getConfig(token));

export const getBalanceSuggestions = (token, data) =>
    axios.post(`${API}/balance-suggestions`, data, getConfig(token));

export const applyBudgetBalance = (token, data) =>
    axios.post(`${API}/apply-balance`, data, getConfig(token));
