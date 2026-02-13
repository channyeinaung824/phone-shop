import axios from 'axios';

// Create base URL that works both on localhost and network IP
const baseURL = typeof window !== 'undefined'
    ? `http://${window.location.hostname}:3001`
    : 'http://localhost:3001';

console.log('🔌 API Base URL:', baseURL);

const api = axios.create({
    baseURL,
    withCredentials: true, // Important for handling HTTP-only cookies
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors (e.g., redirect to login on 401)
        if (error.response?.status === 401) {
            // Optional: Redirect to login or clear state
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
