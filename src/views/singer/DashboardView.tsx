import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';
import { pb } from '../../lib/pocketbase';
import { PageLayout } from '../../components/common/PageLayout';

export default function DashboardView() {
  const { events, myRosters, isLoading, error, updateRSVP } = useMyEvents();

  if (isLoading && events.length === 0) return <div className="container" style={{ textAlign: 'center', paddingTop: 'var(--space-xl)' }}>Loading your events...</div>;
  if (error) return <div className="container" style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());

  return (
    <PageLayout 
      title="Upcoming Events" 
      subtitle="Please let us know if you can make it!"
      actions={<button onClick={() => pb.authStore.clear()} className="btn btn-ghost">Logout</button>}
      maxWidth="800px"
    >
      <div className="flex-col" style={{ gap: 'var(--space-lg)', padding: 'var(--space-xl) 0' }}>
        {upcomingEvents.map((e) => (
          <EventCard 
            key={e.id} 
            event={e} 
            rsvp={myRosters[e.id]?.rsvp} 
            onRSVP={(rsvp) => updateRSVP(e.id, rsvp)} 
          />
        ))}

        {upcomingEvents.length === 0 && (
          <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <p className="text-muted">No upcoming events at this time.</p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}
