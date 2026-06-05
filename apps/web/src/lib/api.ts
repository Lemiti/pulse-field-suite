import axios from 'axios';
import {
  enqueueTaskUpdate,
  isTaskMutationUrl,
} from './syncQueue';
import type { TaskStatus } from '@pulse/shared-types';
import { getApiErrorMessage } from './errors';
import { toast } from 'sonner';

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
    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    // Check if it was a successful mutation (POST, PUT, PATCH, DELETE)
    const method = response.config.method?.toUpperCase();
    if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const url = response.config.url ?? '';
      let message: string | null = null;
      let payload: any = {};
      if (response.config.data) {
        try {
          payload = typeof response.config.data === 'string'
            ? JSON.parse(response.config.data)
            : response.config.data;
        } catch (_) {}
      }

      if (url.includes('/projects') && method === 'POST') {
        if (payload.status !== 'DRAFT') {
          message = "Project created successfully!";
        }
      } else if (url.includes('/projects/') && method === 'PUT') {
        if (payload.status === 'DRAFT') {
          // Silent draft auto-save
        } else {
          message = "Project updated successfully!";
        }
      } else if (url.includes('/phases') && method === 'POST') {
        message = "Phase created successfully!";
      } else if (url.includes('/tasks') && method === 'POST') {
        message = "Task created successfully!";
      } else if (url.includes('/tasks/') && url.includes('/status') && method === 'PATCH') {
        message = "Task status updated successfully!";
      } else if (url.includes('/notes') && method === 'POST') {
        message = "Field note added successfully!";
      } else if (url.includes('/notes/') && method === 'PATCH') {
        message = "Field note updated successfully!";
      } else if (url.includes('/notes/') && method === 'DELETE') {
        message = "Field note deleted successfully!";
      } else if (url.includes('/messages') && method === 'POST') {
        message = "Message sent successfully!";
      } else if (url.includes('/impact') && method === 'POST') {
        message = "Impact metric assigned successfully!";
      } else if (url.includes('/impact/') && method === 'PATCH') {
        message = "Impact metric updated successfully!";
      } else if (url.includes('/budget') && method === 'PATCH') {
        message = "Expense logged successfully!";
      } else if (url.includes('/partners') && method === 'POST') {
        message = "Partner added successfully!";
      } else if (url.includes('/partners/') && method === 'PUT') {
        message = "Partner updated successfully!";
      } else if (url.includes('/partners/') && method === 'DELETE') {
        message = "Partner removed successfully!";
      } else if (url.includes('/media') && method === 'POST') {
        message = "Media uploaded successfully!";
      } else if (url.includes('/media/') && method === 'DELETE') {
        message = "Media deleted successfully!";
      }

      if (message) {
        toast.success(message);
      }
    }
    return response;
  },
  (error) => {
    // If unauthorized, kick user to login page
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else if (error.response && error.response.status >= 400) {
      const message = getApiErrorMessage(error, "An unexpected error occurred");
      toast.error(message);
    }
    return Promise.reject(error);
  }
);