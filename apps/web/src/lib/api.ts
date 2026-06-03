import axios from 'axios';
import {
  enqueueTaskUpdate,
  isTaskMutationUrl,
} from './syncQueue';
import type { TaskStatus } from '@pulse/shared-types';

// Create a central Axios client pointing to the Rust backend
// Replace your existing axios.create and interceptors with this:
export const api = axios.create({
  baseURL: "/api", // Relies on the Vite proxy we just set up
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (!navigator.onLine && isTaskMutationUrl(config.url, config.method)) {
      const url = config.url ?? '';
      if (config.method?.toUpperCase() === 'PATCH' && url.includes('/tasks/') && url.includes('/status')) {
        const taskId = url.split('/tasks/')[1]?.split('/')[0];
        const status = (config.data as { status?: TaskStatus })?.status;
        if (taskId && status) {
          enqueueTaskUpdate({ id: taskId, status });
          return Promise.reject(new axios.Cancel('Queued for offline sync'));
        }
      }
    }

    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized, kick user to login page
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);