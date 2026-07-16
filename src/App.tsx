import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useChoirSettings } from './hooks/useDocumentTitle';
import { Button } from './components/ui';
import { PageLayout } from './components/common/PageLayout';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './lib/queryKeys';
import { settingsService } from './services/settingsService';
import { SetupGate } from './components/setup/SetupGate';
import { ModuleRoute } from './components/common/ModuleRoute';

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
const PublicWebsiteView = lazyWithReload(() => import('./views/admin/PublicWebsiteView'));
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
const DirectoryView = lazyWithReload(() => import('./views/singer/DirectoryView'));
const PublicAuditionView = lazyWithReload(() => import('./views/PublicAuditionView'));
const PublicRsvpView = lazyWithReload(() => import('./views/PublicRsvpView'));
const PublicPollView = lazyWithReload(() => import('./views/PublicPollView'));
const PublicUnsubscribeView = lazyWithReload(() => import('./views/PublicUnsubscribeView'));
const PublicPlayerView = lazyWithReload(() => import('./views/PublicPlayerView'));
const PublicTicketListView = lazyWithReload(() => import('./views/PublicTicketListView'));
const PublicTicketPurchaseView = lazyWithReload(() => import('./views/PublicTicketPurchaseView'));
const EventRSVPView = lazyWithReload(() => import('./views/EventRSVPView'));
const PublicTicketSuccessView = lazyWithReload(() => import('./views/PublicTicketSuccessView'));
const PublicBundlePurchaseView = lazyWithReload(() => import('./views/PublicBundlePurchaseView'));
const PublicDonationView = lazyWithReload(() => import('./views/PublicDonationView'));
const PublicDonationSuccessView = lazyWithReload(() => import('./views/PublicDonationSuccessView'));
const PublicLandingView = lazyWithReload(() => import('./views/PublicLandingView'));
const PublicHistoryView = lazyWithReload(() => import('./views/PublicHistoryView'));
const PublicPastPerformancesView = lazyWithReload(
  () => import('./views/PublicPastPerformancesView')
);
const AdminTicketingView = lazyWithReload(() => import('./views/admin/TicketingView'));
const DonationsView = lazyWithReload(() => import('./views/admin/DonationsView'));
const PatronsView = lazyWithReload(() => import('./views/admin/PatronsView'));
const TicketScanView = lazyWithReload(() => import('./views/admin/TicketScanView'));
const SetupView = lazyWithReload(() => import('./views/setup/SetupView'));
const ModuleSettingsView = lazyWithReload(() => import('./views/admin/ModuleSettingsView'));
const SetupChecklistView = lazyWithReload(() => import('./views/admin/SetupChecklistView'));

const AppLoader = () => (
  <div className="bg-bg flex h-screen w-screen flex-col items-center justify-center gap-4">
    <div
      className="border-border border-t-primary size-10 animate-spin rounded-full border-4"
      role="status"
      aria-label="Loading"
    />
    <span className="text-muted text-sm font-semibold tracking-wide">
      Loading Choir Management...
    </span>
  </div>
);

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AppLoader />;
  if (!user) return <Navigate to="/login" replace />;

  const role = user.role || 'singer';
  if (adminOnly && role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

function MainDashboard() {
  const { user } = useAuth();
  const role = user?.role || 'singer';
  return role === 'admin' ? <AdminDashboardView /> : <SingerDashboardView />;
}

function FallbackRoute() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/'} replace />;
}

export function DirectoryRoute() {
  const { data: settings, isLoading } = useQuery({
    queryKey: queryKeys.appSettings.directory,
    queryFn: () => settingsService.getDirectorySettings(),
    staleTime: 5 * 60_000,
  });
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { performerLabel } = useChoirSettings();

  if (isLoading) return <AppLoader />;
  if (!settings?.enabled && !isAdmin) return <Navigate to="/dashboard" replace />;
  return (
    <PageLayout title={`${performerLabel} Directory`} backTo="/dashboard">
      <DirectoryView />
    </PageLayout>
  );
}

function ResourcesRoute() {
  const { performerLabel } = useChoirSettings();
  return (
    <PageLayout title={`${performerLabel} Resources`} backTo="/dashboard">
      <ResourcesView />
    </PageLayout>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-bg flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <div className="border-border bg-surface mx-auto max-w-md rounded-2xl border p-8 shadow-lg">
            <span className="mb-4 inline-block text-4xl" role="img" aria-label="Warning">
              ⚠️
            </span>
            <h1 className="text-text mb-2 text-2xl font-bold tracking-tight">
              Something went wrong.
            </h1>
            <p className="text-muted mb-6 text-sm leading-relaxed">
              The app may have been updated while your browser still had an older version cached.
              Refresh the page to load the latest version.
            </p>
            <Button
              variant="primary"
              onClick={() => window.location.reload()}
              className="w-full justify-center"
            >
              Refresh Page
            </Button>
          </div>
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
        <Suspense fallback={<AppLoader />}>
          <SetupGate>
            <Routes>
              <Route path="/setup" element={<SetupView />} />
              <Route path="/login" element={<LoginView />} />
              <Route path="/reset-password" element={<ResetPasswordView />} />
              <Route
                path="/auditions"
                element={
                  <ModuleRoute module="auditions">
                    <PublicAuditionView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/rsvp"
                element={
                  <ModuleRoute module="rsvps">
                    <PublicRsvpView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/poll"
                element={
                  <ModuleRoute module="polls">
                    <PublicPollView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/unsubscribe"
                element={
                  <ModuleRoute module="rsvps">
                    <PublicUnsubscribeView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/player"
                element={
                  <ModuleRoute module="musicLibrary">
                    <PublicPlayerView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ModuleRoute module="ticketSales">
                    <PublicTicketListView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/tickets/order/success"
                element={
                  <ModuleRoute module="ticketSales">
                    <PublicTicketSuccessView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/tickets/bundle/:bundleId"
                element={
                  <ModuleRoute module="ticketSales">
                    <PublicBundlePurchaseView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/rsvp/:eventId"
                element={
                  <Suspense fallback={<AppLoader />}>
                    <EventRSVPView />
                  </Suspense>
                }
              />
              <Route
                path="/tickets/:eventId"
                element={
                  <ModuleRoute module="ticketSales">
                    <PublicTicketPurchaseView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/donate"
                element={
                  <ModuleRoute module="donations">
                    <PublicDonationView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/donate/success"
                element={
                  <ModuleRoute module="donations">
                    <PublicDonationSuccessView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ModuleRoute module="publicWebsite">
                    <PublicLandingView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ModuleRoute module="publicWebsite">
                    <PublicHistoryView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/performances"
                element={
                  <ModuleRoute module="publicWebsite">
                    <PublicPastPerformancesView />
                  </ModuleRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/roster"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="roster">
                      <PageLayout title="Roster Management" backTo="/dashboard">
                        <RosterView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/events"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="events">
                      <PageLayout title="Event Management" backTo="/dashboard">
                        <EventsView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/events/:eventId/roster"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="events">
                      <PageLayout title="Event Roster" backTo="/admin/events">
                        <EventRosterView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/setlists"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="setLists">
                      <PageLayout title="Set Lists" backTo="/dashboard">
                        <SetListView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/venues"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="events">
                      <PageLayout title="Venue Templates" backTo="/dashboard">
                        <VenuesView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/seating"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="seating">
                      <PageLayout title="Seating Charts" backTo="/dashboard" maxWidth="1400px">
                        <SeatingView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/attendance"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="attendance">
                      <PageLayout title="Attendance Check-in" backTo="/dashboard">
                        <AttendanceView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/rsvp"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="rsvps">
                      <PageLayout title="Event RSVPs" backTo="/dashboard">
                        <RsvpDashboardView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/polls"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="polls">
                      <PageLayout title="Engagement Polls" backTo="/dashboard">
                        <PollsDashboardView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/auditions"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="auditions">
                      <PageLayout title="Auditions" backTo="/dashboard">
                        <AuditionsView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="reports">
                      <PageLayout title="Reports & Insights" backTo="/dashboard">
                        <ReportsView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/library"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="musicLibrary">
                      <PageLayout title="Music Library" backTo="/dashboard">
                        <MusicLibraryView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/website"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="publicWebsite">
                      <PageLayout title="Public Website" backTo="/dashboard">
                        <PublicWebsiteView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute adminOnly>
                    <PageLayout title="System Settings" backTo="/dashboard">
                      <SettingsView />
                    </PageLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings/modules"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleSettingsView />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/settings/setup-checklist"
                element={
                  <ProtectedRoute adminOnly>
                    <SetupChecklistView />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/communications"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="communications">
                      <PageLayout title="Communications" backTo="/dashboard">
                        <CommunicationView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/resources"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="resources">
                      <ResourcesRoute />
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/tickets"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="ticketSales">
                      <PageLayout title="Ticketing" backTo="/dashboard">
                        <AdminTicketingView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/tickets/scan"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="ticketSales">
                      <PageLayout title="Ticket Scanner" backTo="/admin/tickets">
                        <TicketScanView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/donations"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="donations">
                      <PageLayout title="Donations" backTo="/dashboard">
                        <DonationsView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/patrons"
                element={
                  <ProtectedRoute adminOnly>
                    <ModuleRoute module="patrons">
                      <PageLayout title="Patrons" backTo="/dashboard">
                        <PatronsView />
                      </PageLayout>
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/seating/:eventId"
                element={
                  <ProtectedRoute>
                    <ModuleRoute module="seating">
                      <SeatingFinderView />
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfileView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/directory"
                element={
                  <ProtectedRoute>
                    <ModuleRoute module="directory">
                      <DirectoryRoute />
                    </ModuleRoute>
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<FallbackRoute />} />
            </Routes>
          </SetupGate>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
