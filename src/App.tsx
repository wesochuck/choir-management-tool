import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { PageLayout } from './components/common/PageLayout';

const LoginView = lazy(() => import('./views/LoginView'));
const RosterView = lazy(() => import('./views/admin/RosterView'));
const EventsView = lazy(() => import('./views/admin/EventsView'));
const VenuesView = lazy(() => import('./views/admin/VenuesView'));
const SeatingView = lazy(() => import('./views/admin/SeatingView'));
const AttendanceView = lazy(() => import('./views/admin/AttendanceView'));
const AuditionsView = lazy(() => import('./views/admin/AuditionsView'));
const SettingsView = lazy(() => import('./views/admin/SettingsView'));
const CommunicationView = lazy(() => import('./views/admin/CommunicationView'));
const SetListView = lazy(() => import('./views/admin/SetListView'));
const ReportsView = lazy(() => import('./views/admin/ReportsView'));
const MusicLibraryView = lazy(() => import('./views/admin/MusicLibraryView'));
const AdminDashboardView = lazy(() => import('./views/admin/AdminDashboardView'));
const SingerDashboardView = lazy(() => import('./views/singer/DashboardView'));
const SeatingFinderView = lazy(() => import('./views/singer/SeatingFinderView'));
const PublicAuditionView = lazy(() => import('./views/PublicAuditionView'));
const PublicRsvpView = lazy(() => import('./views/PublicRsvpView'));

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
      <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/auditions" element={<PublicAuditionView />} />
          <Route path="/rsvp" element={<PublicRsvpView />} />
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

          <Route path="/admin/setlists" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Set Lists" backTo="/">
                <SetListView />
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

          <Route path="/admin/reports" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Reports & Insights" backTo="/">
                <ReportsView />
              </PageLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/library" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Music Library" backTo="/">
                <MusicLibraryView />
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
      </Suspense>
    </BrowserRouter>
  );
}
