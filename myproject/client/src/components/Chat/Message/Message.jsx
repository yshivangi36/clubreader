import React from "react";
import { RiArrowDropDownLine } from "react-icons/ri";
import "./Message.css"; 

const Message = ({ message, own, username, onEdit, onDelete, currentUserId,clubCreatorId,openDropdownId,toggleDropdown, loggedInUser }) => {
  const isCreator = currentUserId === clubCreatorId;
  const showDropdown = (message.user === currentUserId || isCreator || loggedInUser?.isAdmin) && !message.deleted;
  const isOpen = openDropdownId === message._id;
  console.log("Current User:", currentUserId);
console.log("Club Creator:", clubCreatorId);
console.log("Is Creator:", isCreator);
console.log("Show Dropdown:", showDropdown);

  return (
    <div className={`message-container ${own ? "own-message" : "other-message"}`}>
      {!message.deleted ? (
        <>
      <img src={message.avatar ? `http://localhost:8080${message.avatar}` : "/default-avatar.png"} alt="Profile" className="profile-img" />
      <div className="message-bubble">
     <div className="message-header">
          <span className="message-username">{username}</span>

          {showDropdown && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDropdown(message._id);
                  }}
                  className="dropdown-button"
                >
                  <RiArrowDropDownLine size={24} />
                </button>
              )}
            </div>
            <p className="message-text">{message.message}</p>
            <span className="message-timestamp">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
            {isOpen && (
              <div className="dropdown-menu">
                {message.user === currentUserId && (
                  <button className="dropdown-item" onClick={() => onEdit(message)}>
                    Edit
                  </button>
                )}
                <button
                  className="dropdown-item delete"
                  onClick={() => onDelete(message._id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="deleted-message-notice">
          {message.deletedBy === "creator" 
            ? "This message was deleted by the club creator"
              : message.deletedBy === "admin"
              ? "This message was deleted by an admin"
            : "Message deleted"}
        </div>
      )}
    </div>
  );
};

export default Message;
