import axios from 'axios';

const API = 'http://localhost:5000/api/ai-chat';

const getConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

export const sendMessage = (token, message) =>
    axios.post(`${API}/message`, { message }, getConfig(token));

export const getChatHistory = (token) =>
    axios.get(`${API}/history`, getConfig(token));

export const clearChatHistory = (token) =>
    axios.delete(`${API}/history`, getConfig(token));
