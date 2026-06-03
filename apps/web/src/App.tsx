import { LoginPage } from "./features/auth/LoginPage";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import MainLayout from './layout/MainLayout';
import ProjectsList from './features/projects/ProjectsList';
import ProjectDashboard from './features/projects/ProjectDashboard';
import PlaceholderPage from './features/placeholder/PlaceholderPage';
import Inbox from './features/inbox/Inbox';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, // Prevents draining bandwidth when switching browser tabs
      staleTime: 5 * 60 * 1000, // Cache data for 5 minutes before re-fetching
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/projects" replace />} />
              <Route path="projects" element={<ProjectsList />} />
              <Route path="projects/:projectId" element={<ProjectDashboard />} />
              <Route path="projects/:projectId/:tab" element={<ProjectDashboard />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="inbox/:tab" element={<Inbox />} />
              <Route path="audit-logs" element={<PlaceholderPage title="Audit Logs" />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" />} />
              <Route path="help" element={<PlaceholderPage title="Help" />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
