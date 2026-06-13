import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://spendwise-ai-fwmp.onrender.com/api",
});

export default API;