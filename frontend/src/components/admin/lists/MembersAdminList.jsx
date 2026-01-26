import ItemsList from "../ItemsList.jsx"
import useFetch from "../../../hooks/useFetch.jsx";
import { deleteMemberById, getAllMembers } from "../../../services/membersService.js";
import Loading from "../../ui/Loading.jsx";
import ItemCard from "../ItemCard.jsx";
import H3 from "../../ui/H3.jsx";
import LoadingSpinner from "../../ui/LoadingSpinner.jsx";
import ErrorMessage from "../../ui/ErrorMessage.jsx";
import useDelete from "../../../hooks/useDelete.jsx";
import InfoMessage from "../../ui/InfoMessage.jsx";

export default function MembersAdminList({ onEditClick }) {
  const { isPending: isMembersPending, isError: isMembersError, data: allMembers } = useFetch({ queryFn: getAllMembers, queryKey: ['members'], config: { staleTime: 10 * 60 * 1000 } });
  const { mutate: deleteMember, isPending: isDeletePending, isError: isDeleteError } = useDelete({mutationFn: deleteMemberById, queryKey: ['members']})

  return (
    <ItemsList itemsName="Members">
      {true ? <div className="w-full h-full flex justify-center items-center"><LoadingSpinner className="h-20 w-20" /></div> :
        isMembersError ? <ErrorMessage>Could not get members</ErrorMessage> :
          allMembers.length === 0 ? <InfoMessage>No members to display</InfoMessage> :
            allMembers.map((member) => {
              return (
                <ItemCard key={member.id} onDelete={() => deleteMember(member.id)} onEdit={() => onEditClick(member)}>
                  <H3>{`${member.firstName} ${member.lastName}`}</H3>
                </ItemCard>
              )
            })}
      {isDeletePending && <Loading />}
      {isDeleteError && <ErrorMessage>Could not delete member</ErrorMessage>}
    </ItemsList>
  )
}