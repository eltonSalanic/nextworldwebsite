import useDelete from "../../../hooks/useDelete.jsx";
import useFetch from "../../../hooks/useFetch.jsx";
import { getPastEvents, deletePastEventById } from "../../../services/pastEventsService.js";
import Loading from "../../ui/Loading.jsx";
import ItemsList from "../ItemsList.jsx";
import ErrorMessage from "../../ui/ErrorMessage.jsx";
import ItemCard from "../ItemCard.jsx";
import H3 from "../../ui/H3.jsx";
import InfoMessage from "../../ui/InfoMessage.jsx";

export default function PastEventsAdminList({ onEditClick }) {
  const { isPending, isError, data: pastEvents } = useFetch({ 
    queryFn: getPastEvents, 
    queryKey: ['pastEvents'], 
    config: { staleTime: 10 * 60 * 1000 } 
  });
  
  const { isPending: isDeletePending, isError: isDeleteError, mutate: deletePastEvent } = useDelete({ 
    mutationFn: deletePastEventById, 
    queryKey: ['pastEvents'] 
  });

  return (
    <ItemsList itemsName="Past Events">
      {isPending ? <LoadingSpinner className="h-20 w-20" /> :
        isError ? <ErrorMessage>Could not get past events</ErrorMessage> :
          pastEvents.length === 0 ? <InfoMessage>No past events to display</InfoMessage> :
            pastEvents.map((pastEvent) => {
              return (
                <ItemCard key={pastEvent.id} onDelete={() => deletePastEvent(pastEvent.id)} onEdit={() => onEditClick(pastEvent)}>
                  <H3>{pastEvent.title}</H3>
                </ItemCard>
              )
            })}
      {isDeletePending && <Loading />}
      {isDeleteError && <ErrorMessage>Could not delete past event</ErrorMessage>}
    </ItemsList>
  );
}
