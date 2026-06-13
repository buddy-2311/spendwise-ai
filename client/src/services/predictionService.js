import axios from 'axios';

const API = 'http://localhost:5000/api/predictions';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const predictNextMonth = (token) =>
    axios.get(`${API}/next-month`, getConfig(token));

export const getCategoryPredictions = (token) =>
    axios.get(`${API}/category`, getConfig(token));

export const getTrends = (token) =>
    axios.get(`${API}/trends`, getConfig(token));
