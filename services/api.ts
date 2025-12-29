import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://api.oakhillpines.com/api/socius';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('session_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);


export const uploadAvatar = async (uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', { uri, name: filename, type } as any);

    const response = await api.post('/users/me/avatar', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const deleteAvatar = async () => {
    const response = await api.delete('/users/me/avatar');
    return response.data;
};

export default api;
