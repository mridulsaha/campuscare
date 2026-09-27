import axios from 'axios';
import {notifyExternal} from '../context/ToastContext';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'https://campus-care-api-21v8.onrender.com/api/v1',
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        const status = error.response?.status;
        const errorMessage =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'Failed to communicate with backend service.';

        const isAuthMe = error.config?.url?.includes('/auth/me');

        if (!isAuthMe && !error.config?.skipGlobalToast) {
            notifyExternal(errorMessage, 'error', status ? `HTTP Error ${status}` : 'Connection Error');
        }

        return Promise.reject(error.response?.data || error);
    }
);

export default api;