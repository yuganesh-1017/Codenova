// Global Configuration for Frontend
// Automatically uses local backend if running on localhost, otherwise uses Render backend
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? '' 
  : 'https://codenova-2-na4l.onrender.com';
