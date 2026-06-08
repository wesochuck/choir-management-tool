import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { PageLayout } from './components/common/PageLayout';

function lazyWithReload<T extends React.ComponentType<Record<string, never>>>(
  importer: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkLoadError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed') ||
        message.includes('Loading chunk') ||
        message.includes('MIME type of "text/html"');

      const now = Date.now();
      const lastReload = Number(sessionStorage.getItem('chunk-load-timestamp') || '0');

      if (isChunkLoadError && now - lastReload > 10000) {
        sessionStorage.setItem('chunk-load-timestamp', String(now));
        console.warn('Recovering from stale application chunk; refreshing once.', error);
        window.location.reload();
      }

      console.error('Lazy-loaded route failed to load.', error);
      throw error;
    }
  });
}

const LoginView = lazyWithReload(() => import('./views/LoginView'));
const ResetPasswordView = lazyWithReload(() => import('./views/ResetPasswordView'));
const RosterView = lazyWithReload(() => import('./views/admin/RosterView'));
const EventsView = lazyWithReload(() => import('./views/admin/EventsView'));
const EventRosterView = lazyWithReload(() => import('./views/admin/EventRosterView'));
const VenuesView = lazyWithReload(() => import('./views/admin/VenuesView'));
const SeatingView = lazyWithReload(() => import('./views/admin/SeatingView'));
const AttendanceView = lazyWithReload(() => import('./views/admin/AttendanceView'));
const AuditionsView = lazyWithReload(() => import('./views/admin/AuditionsView'));
const SettingsView = lazyWithReload(() => import('./views/admin/SettingsView'));
const CommunicationView = lazyWithReload(() => import('./views/admin/CommunicationView'));
const SetListView = lazyWithReload(() => import('./views/admin/SetListView'));
const ReportsView = lazyWithReload(() => import('./views/admin/ReportsView'));
const MusicLibraryView = lazyWithReload(() => import('./views/admin/MusicLibraryView'));
const ResourcesView = lazyWithReload(() => import('./views/admin/ResourcesView'));
const AdminDashboardView = lazyWithReload(() => import('./views/admin/AdminDashboardView'));
const PollsDashboardView = lazyWithReload(() => import('./views/admin/PollsDashboardView'));
const RsvpDashboardView = lazyWithReload(() => import('./views/admin/RsvpDashboardView'));
const SingerDashboardView = lazyWithReload(() => import('./views/singer/DashboardView'));
const SeatingFinderView = lazyWithReload(() => import('./views/singer/SeatingFinderView'));
const ProfileView = lazyWithReload(() => import('./views/singer/ProfileView'));
const PublicAuditionView = lazyWithReload(() => import('./views/PublicAuditionView'));
const PublicRsvpView = lazyWithReload(() => import('./views/PublicRsvpView'));
const PublicPollView = lazyWithReload(() => import('./views/PublicPollView'));
const PublicUnsubscribeView = lazyWithReload(() => import('./views/PublicUnsubscribeView'));
const PublicPlayerView = lazyWithReload(() => import('./views/PublicPlayerView'));
const PublicTicketListView = lazyWithReload(() => import('./views/PublicTicketListView'));
const PublicTicketPurchaseView = lazyWithReload(() => import('./views/PublicTicketPurchaseView'));
const PublicTicketSuccessView = lazyWithReload(() => import('./views/PublicTicketSuccessView'));
const PublicBundlePurchaseView = lazyWithReload(() => import('./views/PublicBundlePurchaseView'));
const PublicDonationView = lazyWithReload(() => import('./views/PublicDonationView'));
const PublicDonationSuccessView = lazyWithReload(() => import('./views/PublicDonationSuccessView'));
const AdminTicketingView = lazyWithReload(() => import('./views/admin/TicketingView'));
const DonationsView = lazyWithReload(() => import('./views/admin/DonationsView'));
const PatronsView = lazyWithReload(() => import('./views/admin/PatronsView'));




function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role || 'singer';
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />;

  return <>{children}</>;
}

function MainDashboard() {
  const { user } = useAuth();
  const role = user?.role || 'singer';
  return role === 'admin' ? <AdminDashboardView /> : <SingerDashboardView />;
}

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>
          <h1>Something went wrong.</h1>
          <p>
            The app may have been updated while your browser still had an older version cached.
            Refresh the page to load the latest version.
          </p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Suspense fallback={<div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading...</div>}>
          <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/reset-password" element={<ResetPasswordView />} />
          <Route path="/auditions" element={<PublicAuditionView />} />
          <Route path="/rsvp" element={<PublicRsvpView />} />
          <Route path="/poll" element={<PublicPollView />} />
          <Route path="/unsubscribe" element={<PublicUnsubscribeView />} />
          <Route path="/player" element={<PublicPlayerView />} />
          <Route path="/tickets" element={<PublicTicketListView />} />
          <Route path="/tickets/order/success" element={<PublicTicketSuccessView />} />
          <Route path="/tickets/bundle/:bundleId" element={<PublicBundlePurchaseView />} />
          <Route path="/tickets/:eventId" element={<PublicTicketPurchaseView />} />
          <Route path="/donate" element={<PublicDonationView />} />
          <Route path="/donate/success" element={<PublicDonationSuccessView />} />
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

          <Route path="/admin/events/:eventId/roster" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Event Roster" backTo="/admin/events">
                <EventRosterView />
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

          <Route path="/admin/rsvp" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Event RSVPs" backTo="/">
                <RsvpDashboardView />
              </PageLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/polls" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Engagement Polls" backTo="/">
                <PollsDashboardView />
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
              <PageLayout title="System Settings" backTo="/">
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

          <Route path="/admin/resources" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Singer Resources" backTo="/">
                <ResourcesView />
              </PageLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/tickets" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Ticketing" backTo="/">
                <AdminTicketingView />
              </PageLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/donations" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Donations" backTo="/">
                <DonationsView />
              </PageLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/patrons" element={
            <ProtectedRoute adminOnly>
              <PageLayout title="Patrons" backTo="/">
                <PatronsView />
              </PageLayout>
            </ProtectedRoute>
          } />

          <Route path="/seating/:eventId" element={<ProtectedRoute><SeatingFinderView /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
