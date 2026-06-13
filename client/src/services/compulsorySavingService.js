import axios from 'axios';

const API = 'http://localhost:5000/api/compulsory-savings';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const getCurrentSaving = (token, month, year) =>
    axios.get(`${API}?month=${month}&year=${year}`, getConfig(token));

export const getAllSavings = (token) =>
    axios.get(`${API}/all`, getConfig(token));

export const setTarget = (token, data) =>
    axios.post(`${API}/target`, data, getConfig(token));

export const addSavedAmount = (token, data) =>
    axios.post(`${API}/add-saved`, data, getConfig(token));
