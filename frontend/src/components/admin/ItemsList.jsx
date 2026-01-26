import Loading from "../ui/Loading.jsx";
import InfoMessage from "../ui/InfoMessage.jsx";
import ErrorMessage from "../ui/ErrorMessage.jsx";
import ItemCard from "./ItemCard.jsx";

//this component is meant to be reusable for any item. Pass the Card (CardComponent) of the item you want to render. You can build this card using ItemCard and pass all text components you want to render inide
export default function ItemsList({ itemsName, onEditClick, onDeleteClick, children }){
  
  return (
    <div className="bg-gray-900 rounded-lg shadow-2xl p-8 fade-in delay-400 flex flex-col gap-4 flex-1">
      <h2 className="text-3xl font-bold text-white racing-sans-one-regular mb-6">
        All {itemsName}
      </h2>

      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  )
}