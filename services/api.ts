import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const getResource = async (url: string, params = {}) => {
  try {
    const response = await api.get(url, { params });
    return response;
  } catch (error) {
    throw error;
  }
};

export const postResource = async (url: string, data: any) => {
  try {
    const response = await api.post(url, data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const putResource = async (url: string, data: any) => {
  try {
    const response = await api.put(url, data);
    return response;
  } catch (error) {
    throw error;
  }
};

export const deleteResource = async (url: string) => {
  try {
    const response = await api.delete(url);
    return response;
  } catch (error) {
    throw error;
  }
};

export const uploadFile = async (url: string, file: any, onProgress?: (progress: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded * 100) / progressEvent.total;
          onProgress(progress);
        }
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export default api;