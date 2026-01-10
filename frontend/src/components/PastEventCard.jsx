import { useState } from 'react';
import { formatEventDate } from '../utils/dateFormatter';

export default function PastEventCard({ event }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* Event Card */}
      <div
        onClick={() => setIsModalOpen(true)}
        className="group bg-purple-950 rounded-lg shadow-lg overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer flex flex-col h-full"
      >
        <div className="relative h-40 w-full overflow-hidden bg-[#4b0082]">
          <img 
            src={event.flyerUrl} 
            alt={event.title} 
            className="w-full h-full object-cover" 
          />
          <div className="absolute inset-0 bg-[#4b0082] bg-opacity-60 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity" />
        </div>
        <div className="p-4 flex flex-col justify-between flex-1">
          <h3 className="text-xl font-semibold text-white bebas-kai-regular">
            {event.title}
          </h3>
          <p className="text-gray-200 text-sm oswald-400">
            {formatEventDate(event.date)}
          </p>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute w-screen h-screen inset-0 bg-black/50" />
          
          {/* Modal Content */}
          <div
            className="relative bg-white rounded-lg p-6 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold mb-2 racing-sans-one-regular">{event.title}</h3>
            <p className="text-gray-600 mb-4 bebas-kai-regular">{formatEventDate(event.date)}</p>
            
            {event.description && (
              <p className="text-gray-800 mb-4 oswald-400">{event.description}</p>
            )}
            
            {event.place && (
              <p className="text-gray-700 italic mb-4 bebas-kai-regular">Location: {event.place}</p>
            )}
            
            {event.artists && event.artists.length > 0 && (
              <>
                <h4 className="text-lg font-semibold mb-2 racing-sans-one-regular">Artists</h4>
                <ul className="list-disc list-inside mb-4 oswald-400">
                  {event.artists.map((artist, idx) => (
                    <li key={idx}>
                      <a
                        href={`https://www.instagram.com/${artist.contact}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-800 hover:underline"
                      >
                        {artist.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
            
            <img
              src={event.flyerUrl}
              alt={event.title}
              className="w-full h-96 object-contain rounded mb-4"
            />
            
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-2 px-4 py-2 bg-purple-950 text-white rounded hover:bg-purple-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
