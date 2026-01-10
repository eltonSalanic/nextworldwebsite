import { useState } from 'react';
import { createPortal } from 'react-dom';

export default function Staff({ teamMembers }) {
  const [selectedMember, setSelectedMember] = useState(null);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            onClick={() => setSelectedMember(member)}
            className="
            group
            bg-purple-950
            rounded-lg
            overflow-hidden
            shadow-lg
            cursor-pointer
            transform transition
            hover:scale-105 hover:shadow-2xl
          "
          >
            <img
              src={member.photoUrl || member.photo}
              alt={`${member.firstName || member.name} ${member.lastName || ''}`}
              className="w-full h-48 object-cover object-top"
            />
            <div className="p-4 text-center">
              <h3 className="text-xl font-medium text-white bebas-kai-regular">
                {member.firstName && member.lastName 
                  ? `${member.firstName} ${member.lastName}`
                  : member.name}
              </h3>
              <p className="text-gray-400 oswald-400">{member.role}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Popup - Rendered via Portal */}
      {selectedMember && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedMember(null)}
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/70" />

          {/* Modal Content */}
          <div
            className="
              relative
              bg-gray-900
              rounded-lg
              p-8
              max-w-2xl w-full mx-4
              flex flex-col md:flex-row
              items-center md:items-start
              space-y-6 md:space-y-0 md:space-x-8
              z-10
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo on the left */}
            <img
              src={selectedMember.photoUrl || selectedMember.photo}
              alt={`${selectedMember.firstName || selectedMember.name} ${selectedMember.lastName || ''}`}
              className="w-48 h-48 object-cover rounded-lg flex-shrink-0 object-top"
            />

            {/* Description on the right */}
            <div className="text-white flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">
                    {selectedMember.firstName && selectedMember.lastName 
                      ? `${selectedMember.firstName} ${selectedMember.lastName}`
                      : selectedMember.name}
                  </h3>
                  <p className="text-gray-400">{selectedMember.role}</p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
                >
                  &times;
                </button>
              </div>
              <div className="mt-4 text-gray-300">
                <p>{selectedMember.description}</p>
                <p><strong>Fun Fact:</strong> {selectedMember.funFact}</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
