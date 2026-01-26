import useDelete from "../../../hooks/useDelete.jsx";
import useFetch from "../../../hooks/useFetch.jsx";
import { getUpcomingEvents, deleteUpcomingEventById } from "../../../services/upcomingEventsService.js";
import Anchor from "../../ui/Anchor.jsx";
import LoadingSpinner from "../../ui/LoadingSpinner.jsx";
import ItemsList from "../ItemsList.jsx";
import ErrorMessage from "../../ui/ErrorMessage.jsx";
import ItemCard from "../ItemCard.jsx";
import H3 from "../../ui/H3.jsx";
import InfoMessage from "../../ui/InfoMessage.jsx";

export default function UpcomingEventsList({ onEditClick }) {
  const { isPending, isError, data: upcomingEvents } = useFetch({ queryFn: getUpcomingEvents, queryKey: ['upcomingEvents'], config: { staleTime: 10 * 60 * 1000 } });
  const { isPending: isDeletePending, isError: isDeleteError, mutate: deleteUpcomingEvent } = useDelete({ mutationFn: deleteUpcomingEventById, queryKey: ['upcomingEvents'] });

  return (
    <ItemsList itemsName="Upcoming Events">
      {isPending ? <div className="w-full h-full flex justify-center items-center"><LoadingSpinner className="h-20 w-20" /></div>:
        isError ? <ErrorMessage>Could not get upcoming events</ErrorMessage> :
          upcomingEvents.length === 0 ? <InfoMessage>No upcoming events to display</InfoMessage> :
            upcomingEvents.map((upcomingEvent) => {
              return (
                <ItemCard key={upcomingEvent.id} onDelete={() => deleteUpcomingEvent(upcomingEvent.id)} onEdit={() => onEditClick(upcomingEvent)}>
                  <H3>{upcomingEvent.title}</H3>
                  <Anchor>{upcomingEvent.url}</Anchor>
                </ItemCard>
              )
            })}
      {isDeletePending && <Loading />}
      {isDeleteError && <ErrorMessage>Could not delete upcoming event</ErrorMessage>}
    </ItemsList>
  );
}