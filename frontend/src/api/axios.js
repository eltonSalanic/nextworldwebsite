import axios from "axios";

const apiUrl = import.meta.env.VITE_API_BASE_URL;

export const api = axios.create({
  baseURL: apiUrl,
  // Free ngrok otherwise returns an HTML interstitial for browser-like requests
  headers: apiUrl?.includes("ngrok")
    ? { "ngrok-skip-browser-warning": "true" }
    : undefined,
});