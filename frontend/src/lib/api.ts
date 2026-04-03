import axios from 'axios';

export const api = axios.create({
    baseURL: '/api', // Proxied by Vite to backend
    withCredentials: true,
});

export const authApi = axios.create({
    baseURL: '/auth',
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => {
        // Backend uses { success: true, data: {} } format
        if (response.data && response.data.success) {
            // For paginated responses, we might want to return the whole data object
            if (response.data.meta && response.data.meta.total !== undefined) {
                return response;
            }
            return response.data.data;
        }
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
