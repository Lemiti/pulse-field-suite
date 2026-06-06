import { LoginPage } from "./features/auth/LoginPage";
import Landing from "./features/public/Landing";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import MainLayout from './layout/MainLayout';
import Home from './features/home/Home';
import ProjectsList from './features/projects/ProjectsList';
import ProjectDashboard from './features/projects/ProjectDashboard';
import PlaceholderPage from './features/placeholder/PlaceholderPage';
import HelpPage from './features/help/HelpPage';
import AuditLogs from './features/audit_logs/AuditLogs';
import Reports from './features/reports/Reports';
import Settings from './features/settings/Settings';
import Inbox from './features/inbox/Inbox';
import Partners from './features/partners/Partners';
import { ActiveCountryProvider } from "./features/auth/ActiveCountryContext";
import Logistics from './features/logistics/Logistics';
import Beneficiaries from './features/beneficiaries/Beneficiaries';
import { AuthProvider } from "./features/auth/AuthContext";
import SyncManager from "./features/sync/SyncManager";
import { ThemeProvider } from "./context/ThemeContext";
import { Toaster } from 'sonner';

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
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ActiveCountryProvider>
          <SyncManager />
          <Toaster richColors closeButton position="top-right" />
          <BrowserRouter>

            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="dashboard" element={<Home />} />
                  <Route path="projects" element={<ProjectsList />} />
                  <Route path="projects/:projectId" element={<ProjectDashboard />} />
                  <Route path="projects/:projectId/:tab" element={<ProjectDashboard />} />
                  <Route path="inbox" element={<Inbox />} />
                  <Route path="inbox/:tab" element={<Inbox />} />
                  <Route path="audit-logs" element={<AuditLogs />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="partners" element={<Partners />} />
                  <Route path="logistics" element={<Logistics />} />
                  <Route path="beneficiaries" element={<Beneficiaries />} />
                  <Route path="help" element={<HelpPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </ActiveCountryProvider>
      </AuthProvider>
    </QueryClientProvider>
   </ThemeProvider>
  );
}

export default App;
