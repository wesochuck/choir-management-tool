import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardCounts } from '../../hooks/useDashboardCounts';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { Button } from '../../components/ui';

const dashboardSections = [
  {
    title: 'People & membership',
    dotClassName: 'bg-section-green',
    links: [
      {
        to: '/admin/roster',
        icon: '👥',
        colorClass: 'bg-emerald-500/10 text-emerald-500',
        label: 'Manage Roster',
        desc: 'Add singers and track status',
      },
      {
        to: '/directory',
        icon: '📖',
        colorClass: 'bg-emerald-500/10 text-emerald-500',
        label: 'Singer Directory',
        desc: 'View opted-in singer contact info',
      },
      {
        to: '/admin/auditions',
        icon: '🎵',
        colorClass: 'bg-primary/10 text-primary',
        label: 'Auditions',
        desc: 'Review public audition requests',
      },
      {
        to: '/admin/communications',
        icon: '✉️',
        colorClass: 'bg-slate-500/10 text-slate-500',
        label: 'Communications',
        desc: 'Send announcements and review history',
      },
      {
        to: '/admin/polls',
        icon: '📊',
        colorClass: 'bg-pink-500/10 text-pink-500',
        label: 'Engagement Polls',
        desc: 'Review volunteer responses and counts',
      },
      {
        to: '/admin/donations',
        icon: '🎁',
        colorClass: 'bg-pink-500/10 text-pink-500',
        label: 'Donations',
        desc: 'Track giving and manage donor levels',
      },
      {
        to: '/admin/patrons',
        icon: '💎',
        colorClass: 'bg-cyan-500/10 text-cyan-500',
        label: 'Patrons Dashboard',
        desc: 'View donor/buyer LTV and message patrons',
      },
    ],
  },
  {
    title: 'Events & attendance',
    dotClassName: 'bg-section-amber',
    links: [
      {
        to: '/admin/events',
        icon: '📅',
        colorClass: 'bg-amber-500/10 text-amber-500',
        label: 'Manage Events',
        desc: 'Schedule performances and rehearsals',
      },
      {
        to: '/admin/tickets',
        icon: '🎟️',
        colorClass: 'bg-amber-500/10 text-amber-500',
        label: 'Ticket Sales',
        desc: 'Track sales and process refunds',
      },
      {
        to: '/admin/rsvp',
        icon: '🗓️',
        colorClass: 'bg-amber-500/10 text-amber-500',
        label: 'Event RSVPs',
        desc: 'Track responses and roster balances',
      },
      {
        to: '/admin/attendance',
        icon: '✅',
        colorClass: 'bg-emerald-500/10 text-emerald-500',
        label: 'Take Attendance',
        desc: 'Track check-ins for events',
      },
      {
        to: '/admin/venues',
        icon: '🏛️',
        colorClass: 'bg-slate-500/10 text-slate-500',
        label: 'Manage Venues',
        desc: 'Configure venue capacities',
      },
      {
        to: '/admin/seating',
        icon: '🪑',
        colorClass: 'bg-primary/10 text-primary',
        label: 'Seating Charts',
        desc: 'Design layouts and assign seats',
      },
    ],
  },
  {
    title: 'Music & performance',
    dotClassName: 'bg-section-cyan',
    links: [
      {
        to: '/admin/library',
        icon: '🎼',
        colorClass: 'bg-cyan-500/10 text-cyan-500',
        label: 'Music Library',
        desc: 'Catalog, repertoire, and CSV import',
      },
      {
        to: '/admin/setlists',
        icon: '📋',
        colorClass: 'bg-cyan-500/10 text-cyan-500',
        label: 'Set Lists',
        desc: 'Build and reorder event music',
      },
      {
        to: '/admin/resources',
        icon: '📂',
        colorClass: 'bg-cyan-500/10 text-cyan-500',
        label: 'Singer Resources',
        desc: 'Upload documents and links for singers',
      },
    ],
  },
  {
    title: 'Admin',
    dotClassName: 'bg-section-slate',
    links: [
      {
        to: '/admin/reports',
        icon: '📈',
        colorClass: 'bg-slate-500/10 text-slate-500',
        label: 'Reports & Insights',
        desc: 'Attendance trends and concert summaries',
      },
      {
        to: '/admin/website',
        icon: '🌐',
        colorClass: 'bg-slate-500/10 text-slate-500',
        label: 'Public Website',
        desc: 'Landing page, hero image, and public branding',
      },
      {
        to: '/admin/settings',
        icon: '⚙️',
        colorClass: 'bg-slate-500/10 text-slate-500',
        label: 'System Settings',
        desc: 'Configure global preferences',
      },
    ],
  },
];

export default function AdminDashboardView() {
  const { user, logout } = useAuth();
  useDocumentTitle('Choir Admin');

  const { activeSingers, upcomingEvents, pendingAuditions, errorMessage } = useDashboardCounts();

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name || user?.email?.split('@')[0] || 'Admin';
  const greeting = `${getGreeting()}, ${userName}`;

  return (
    <div className="bg-bg flex min-h-screen flex-col">
      <header className="bg-surface sticky top-0 z-10 border-b border-gray-200">
        <div className="mx-auto flex w-full max-w-[1200px] flex-row items-center justify-between gap-6 px-6 py-2">
          <div className="flex flex-row items-center gap-6">
            <div className="flex flex-col">
              <h2 className="m-0 text-xl font-bold text-gray-800">Choir Admin</h2>
            </div>
          </div>
          <div className="flex flex-row items-center gap-4">
            <Button as={Link} to="/directory" variant="outline">
              Singer Directory
            </Button>
            <Button as={Link} to="/profile" variant="outline">
              My Profile
            </Button>
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="from-primary-deep to-primary text-surface mb-6 w-full bg-gradient-to-r py-8 shadow-sm">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-6 px-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-surface m-0 text-[clamp(2rem,4vw,2.5rem)] font-bold tracking-tight">
              {greeting}
            </h1>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link
              to="/admin/roster"
              className="flex h-11 cursor-pointer items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 no-underline backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/15"
            >
              <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">
                Active Singers
              </span>
              <span className="text-section-amber text-xl font-bold">
                {activeSingers !== undefined ? activeSingers : '...'}
              </span>
            </Link>
            <Link
              to="/admin/events"
              className="flex h-11 cursor-pointer items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 no-underline backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/15"
            >
              <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">
                Upcoming Events
              </span>
              <span className="text-section-amber text-xl font-bold">
                {upcomingEvents !== undefined ? upcomingEvents : '...'}
              </span>
            </Link>
            <Link
              to="/admin/auditions"
              className="flex h-11 cursor-pointer items-center gap-4 rounded-full border border-white/20 bg-white/10 px-6 no-underline backdrop-blur transition-all duration-200 hover:border-white/30 hover:bg-white/15"
            >
              <span className="text-sm font-semibold tracking-wider text-white/90 uppercase">
                Pending Auditions
              </span>
              <span className="text-section-amber text-xl font-bold">
                {pendingAuditions !== undefined ? pendingAuditions : '...'}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="mx-auto mb-4 w-full max-w-[1200px] px-6">
          <div className="border-danger-text/30 bg-danger-bg text-danger-text rounded-md border p-3 text-sm">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-[1200px] px-6">
        {/* Quick Action Bar */}
        <div className="mt-1 mb-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
          Quick Actions
        </div>
        <section className="bg-surface mb-8 rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/attendance"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <span className="text-lg" aria-hidden="true">
                ✅
              </span>{' '}
              Take Attendance
            </Link>
            <Link
              to="/admin/communications"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <span className="text-lg" aria-hidden="true">
                ✉️
              </span>{' '}
              Send Announcement
            </Link>
            <Link
              to="/admin/roster?add=true"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <span className="text-lg" aria-hidden="true">
                👥
              </span>{' '}
              Add Singer
            </Link>
            <Link
              to="/admin/events?add=true"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <span className="text-lg" aria-hidden="true">
                📅
              </span>{' '}
              New Event
            </Link>
            <Link
              to="/admin/library"
              className="bg-bg hover:border-primary hover:bg-primary-light hover:text-primary-deep inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-6 text-sm font-semibold text-gray-800 no-underline transition-all duration-200 hover:-translate-y-px active:translate-y-0"
            >
              <span className="text-lg" aria-hidden="true">
                🎼
              </span>{' '}
              Add Music
            </Link>
          </div>
        </section>

        {/* Categorized Link Sections */}
        {dashboardSections.map((section) => (
          <section key={section.title}>
            <div className="mt-8 mb-4 flex items-center gap-2">
              <div className={`size-2.5 flex-shrink-0 rounded-full ${section.dotClassName}`} />
              <h2 className="m-0 text-sm font-bold tracking-widest text-gray-500 uppercase">
                {section.title}
              </h2>
            </div>

            <div className="mb-8 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
              {section.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="group bg-surface hover:border-primary relative flex min-h-[180px] cursor-pointer flex-col items-start rounded-xl border border-gray-200 p-6 no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={`mb-4 flex size-12 items-center justify-center rounded-lg text-2xl transition-transform duration-200 group-hover:scale-105 ${link.colorClass}`}
                  >
                    <span aria-hidden="true">{link.icon}</span>
                  </div>
                  <h3 className="m-0 mb-1 text-lg font-semibold text-gray-800">{link.label}</h3>
                  <p className="m-0 mb-4 flex-1 text-sm leading-relaxed text-gray-500">
                    {link.desc}
                  </p>
                  <span className="group-hover:text-primary mt-auto self-end text-xl leading-none text-gray-500 transition-all duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
