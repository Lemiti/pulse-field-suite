import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainLayout from './layout/MainLayout';
import ProjectsList from './features/projects/ProjectsList';
import ProjectDashboard from './features/projects/ProjectDashboard';
import PlaceholderPage from './features/placeholder/PlaceholderPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/projects" replace />} />
            <Route path="projects" element={<ProjectsList />} />
            <Route path="projects/:projectId" element={<ProjectDashboard />} />
            <Route path="projects/:projectId/:tab" element={<ProjectDashboard />} />
            <Route path="inbox" element={<PlaceholderPage title="Inbox" />} />
            <Route path="audit-logs" element={<PlaceholderPage title="Audit Logs" />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="help" element={<PlaceholderPage title="Help" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
