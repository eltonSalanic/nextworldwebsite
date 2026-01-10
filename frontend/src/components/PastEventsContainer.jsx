import useFetch from '../hooks/useFetch.jsx';
import { getPastEvents } from '../services/pastEventsService.js';
import PastEventCard from './PastEventCard.jsx';
import Loading from './ui/Loading.jsx';
import ErrorMessage from './ui/ErrorMessage.jsx';
import InfoMessage from './ui/InfoMessage.jsx';

export default function PastEventsContainer() {
  const { isPending, isError, data: events } = useFetch({ 
    queryFn: getPastEvents, 
    queryKey: ['past-events'], 
    config: { staleTime: 10 * 60 * 1000 } // 10 minutes cache
  });

  // Sort events by date (most recent first)
  const sortedEvents = events ? [...events].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  }) : [];

  return (
    <>
      <h2 className="text-5xl text-white font-bold mb-6 racing-sans-one-regular">
        Past Events
      </h2>
      {isPending ? <Loading item="Past Events" /> : 
      isError ? <ErrorMessage>Could not load past events</ErrorMessage> :
      sortedEvents.length === 0 ? <InfoMessage>No past events found</InfoMessage> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          {sortedEvents.map(event => (
            <PastEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </>
  );
}
