import axios from 'axios';

const API = 'https://spendwise-ai-fwmp.onrender.com/api/net-worth';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getNetWorthItems = (token, type) =>
    axios.get(`${API}${type ? `?type=${type}` : ''}`, getConfig(token));

export const getNetWorthSummary = (token) =>
    axios.get(`${API}/summary`, getConfig(token));

export const getNetWorthHistory = (token) =>
    axios.get(`${API}/history`, getConfig(token));

export const createNetWorthItem = (token, data) =>
    axios.post(API, data, getConfig(token));

export const updateNetWorthItem = (token, id, data) =>
    axios.put(`${API}/${id}`, data, getConfig(token));

export const deleteNetWorthItem = (token, id) =>
    axios.delete(`${API}/${id}`, getConfig(token));
