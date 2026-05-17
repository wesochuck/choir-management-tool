import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginView from './views/LoginView';
import RosterView from './views/admin/RosterView';
import EventsView from './views/admin/EventsView';
import VenuesView from './views/admin/VenuesView';
import SeatingView from './views/admin/SeatingView';
import AttendanceView from './views/admin/AttendanceView';
import AuditionsView from './views/admin/AuditionsView';
import SettingsView from './views/admin/SettingsView';
import CommunicationView from './views/admin/CommunicationView';
import AdminDashboardView from './views/admin/AdminDashboardView';
import SingerDashboardView from './views/singer/DashboardView';
import SeatingFinderView from './views/singer/SeatingFinderView';
import PublicAuditionView from './views/PublicAuditionView';
import { PageLayout } from './components/common/PageLayout';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role || (user.collectionName === '_superusers' ? 'admin' : 'singer');
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}

function MainDashboard() {
  const { user } = useAuth();
  const role = user?.role || (user?.collectionName === '_superusers' ? 'admin' : 'singer');
  return role === 'admin' ? <AdminDashboardView /> : <SingerDashboardView />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/auditions" element={<PublicAuditionView />} />
        <Route path="/" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />

        <Route path="/admin/roster" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Roster Management" backTo="/">
              <RosterView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/events" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Event Management" backTo="/">
              <EventsView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/venues" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Venue Templates" backTo="/">
              <VenuesView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/seating" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Seating Charts" backTo="/" maxWidth="1400px">
              <SeatingView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/attendance" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Attendance Check-in" backTo="/">
              <AttendanceView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/auditions" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Auditions" backTo="/">
              <AuditionsView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/settings" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Settings" backTo="/">
              <SettingsView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/communications" element={
          <ProtectedRoute adminOnly>
            <PageLayout title="Communications" backTo="/">
              <CommunicationView />
            </PageLayout>
          </ProtectedRoute>
        } />

        <Route path="/seating/:eventId" element={<ProtectedRoute><SeatingFinderView /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
