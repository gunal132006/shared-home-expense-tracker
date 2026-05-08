import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Safely configure Axios Base URL for Production (Vercel -> Render)
let apiUrl = import.meta.env.VITE_API_URL || '';
// Remove trailing slash to prevent double slashes (e.g., domain.com//api/expenses)
if (apiUrl.endsWith('/')) {
  apiUrl = apiUrl.slice(0, -1);
}
// Remove /api suffix if user accidentally included it in Vercel settings
if (apiUrl.endsWith('/api')) {
  apiUrl = apiUrl.slice(0, -4);
}
axios.defaults.baseURL = apiUrl;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
