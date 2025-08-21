import axios from "axios";
const baseURL = import.meta.env.VITE_API_BASE || "/api";
export const api = axios.create({ baseURL });
export const apiUrl = (path = "") => `${baseURL}${path.startsWith("/") ? "" : "/"}${path}`;