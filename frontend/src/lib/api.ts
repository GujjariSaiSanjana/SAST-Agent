import axios from 'axios';

export const api = axios.create({
    baseURL: '/api', // Proxied by Vite to backend
    withCredentials: true,
});

export const authApi = axios.create({
    baseURL: '/auth',
    withCredentials: true,
});

const responseInterceptor = (response: any) => {
    if (response.data && response.data.success) {
        return response.data.data;
    }
    return response;
};

const errorInterceptor = (error: any) => Promise.reject(error);

api.interceptors.response.use(responseInterceptor, errorInterceptor);
authApi.interceptors.response.use(responseInterceptor, errorInterceptor);
