import { LoginPage } from "./features/auth/LoginPage";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import MainLayout from './layout/MainLayout';
import Home from './features/home/Home';
import ProjectsList from './features/projects/ProjectsList';
import ProjectDashboard from './features/projects/ProjectDashboard';
import PlaceholderPage from './features/placeholder/PlaceholderPage';
import AuditLogs from './features/audit_logs/AuditLogs';
import Reports from './features/reports/Reports';
import Settings from './features/settings/Settings';
import Inbox from './features/inbox/Inbox';
import { ActiveCountryProvider } from "./features/auth/ActiveCountryContext";
import { AuthProvider } from "./features/auth/AuthContext";
import SyncManager from "./features/sync/SyncManager";

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
      <AuthProvider>
        <ActiveCountryProvider>
          <SyncManager />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="projects" element={<ProjectsList />} />
                  <Route path="projects/:projectId" element={<ProjectDashboard />} />
                  <Route path="projects/:projectId/:tab" element={<ProjectDashboard />} />
                  <Route path="inbox" element={<Inbox />} />
                  <Route path="inbox/:tab" element={<Inbox />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="help" element={<PlaceholderPage title="Help" />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ActiveCountryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
