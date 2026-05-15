import { useMyEvents } from '../../hooks/useMyEvents';
import { EventCard } from '../../components/singer/EventCard';

export default function DashboardView() {
  const { events, myRosters, isLoading, error, updateRSVP } = useMyEvents();

  if (isLoading) return <div style={{ padding: '20px' }}>Loading your events...</div>;
  if (error) return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>;

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());

  return (
    <div style={{ padding: '24px', backgroundColor: '#f0f4f8', minHeight: '100vh' }}>
      <h1>Upcoming Events</h1>
      <p style={{ color: '#718096', marginBottom: '24px' }}>Please let us know if you can make it!</p>

      {upcomingEvents.map((e) => (
        <EventCard 
          key={e.id} 
          event={e} 
          rsvp={myRosters[e.id]?.rsvp} 
          onRSVP={(rsvp) => updateRSVP(e.id, rsvp)} 
        />
      ))}

      {upcomingEvents.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '12px' }}>
          No upcoming events at this time.
        </div>
      )}
    </div>
  );
}
