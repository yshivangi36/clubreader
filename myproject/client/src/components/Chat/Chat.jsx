import React, { useState, useEffect, useRef } from 'react';
import { useParams } from "react-router-dom";
import { io } from 'socket.io-client';
import './Chat.css';
import Header from '../Header';
import { BiSolidSend } from "react-icons/bi";
import Message from './Message/Message';
import axios from 'axios';
import { RiDeleteBinLine } from "react-icons/ri";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Chat = () => {
  const { clubId } = useParams();  // ✅ Extract clubId from route
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [clubName, setClubName] = useState('');
  const [members, setMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [clubCreatorId, setClubCreatorId] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  
  console.log("Club ID:", clubId);  // ✅ Debugging output

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found!");
      // Redirect to login
    }
  }, []);

  // ✅ Fetch club details (name and members)
  useEffect(() => {
    if (!clubId) {
      console.error("❌ clubId is undefined");
      return;
    }
    const fetchClubDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/clubs/${clubId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("📌 Club Data:", res.data);
        console.log("📌 Members List:", res.data.members);
        if (!res.data.members || res.data.members.length === 0) {
          console.warn("⚠️ No members found in this club.");
        } else {
          console.log("✅ Members Fetched:", res.data.members);
        }

        setClubName(res.data.name);
        setMembers(res.data.members || []);
        setClubCreatorId(res.data.createdBy._id);
        console.log("Fetched Club Members:", res.data.members); // Debugging Log
      } catch (error) {
        console.error("Error fetching club details:", error.response?.data || error.message);
      }
    };

    fetchClubDetails();
  }, [clubId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");  // ✅ Get token from localStorage
        if (!token) {
          console.error("❌ No token found, user is not authenticated");
          return;
        }

        const response = await axios.get("http://localhost:8080/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.data || !response.data._id) {
          console.error("❌ Invalid user data received:", response.data);
          return;
        }

        setLoggedInUser(response.data);
        console.log("✅ Logged-in user:", response.data);
      } catch (error) {
        console.error("❌ Error fetching user:", error.response?.data || error.message);
      }
    };

    fetchUser();
  }, []);

  // ✅ Fetch messages when component mounts
  useEffect(() => {
    if (!clubId) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`http://localhost:8080/api/messages/${clubId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        console.log("📌 Fetched Messages:", res.data);
        setMessages(res.data);
        setTimeout(() => {  
          messagesEndRef.current?.scrollTo(0, messagesEndRef.current.scrollHeight);
        }, 100);
      } catch (error) {
        console.error("Error fetching messages:", error.response?.data || error.message);
      }
    };

    fetchMessages();
  }, [clubId]);

  // ✅ Fetch messages and setup socket connection
  useEffect(() => {
    if (!loggedInUser || !clubId) return; // ✅ Only connect if user is authenticated

    const newSocket = io("http://localhost:8080", {
      query: { userId: loggedInUser._id, clubId },
      transports: ["websocket"], 
      reconnectionAttempts: 5, 
      reconnectionDelay: 2000, 
    });

    setSocket(newSocket);

    newSocket.emit("joinClub", { clubId, userId: loggedInUser._id });

    newSocket.on("chatMessage", (msg) => {
      setMessages((prevMessages) => {
        if (!prevMessages.some((m) => m._id === msg._id)) {
          return [...prevMessages, msg];
        }
        return prevMessages;
      });
    }
    );

    newSocket.on("chatMessage", (msg) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        messagesEndRef.current?.scrollTo({
          top: messagesEndRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    });

    setSocket(newSocket);

    newSocket.emit("joinClub", { clubId, userId: loggedInUser._id });

    newSocket.on("chatMessage", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    newSocket.on("updateOnlineUsers", (onlineUserList) => {
      setOnlineUsers(new Set(onlineUserList));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [loggedInUser, clubId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-menu") && !event.target.closest(".dropdown-button")) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  
  const toggleDropdown = (messageId) => {
    setOpenDropdownId(prev => (prev === messageId ? null : messageId));
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !socket || !loggedInUser?._id) {
      console.error("❌ Cannot send message. Missing required data:", { message, socket, loggedInUser });
      return;
    }

    console.log("✅ Logged-in user before sending message:", loggedInUser);

    const msgData = {
      clubId: clubId,
      user: loggedInUser?._id,  
      username: loggedInUser?.UserName || loggedInUser?.username || "Unknown User",
      avatar: loggedInUser?.avatar || "/default-avatar.png", 
      message: message.trim(),  
      timestamp: new Date().toISOString(),
    };

    if (editMode && editingMessageId) {
      try {
        // Update message instead of sending a new one
        const res = await axios.put(`http://localhost:8080/api/messages/${editingMessageId}`, msgData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
  
        socket.emit("editMessage", res.data);  
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === editingMessageId ? { ...msg, message: msgData.message } : msg
          )
        );

        toast.success("✏️ Message edited successfully!");
      } catch (error) {
        console.error("Error updating message:", error.response?.data || error.message);
        toast.error("❌ Failed to edit message");
      }
    } else {
      try {
        const res = await axios.post(`http://localhost:8080/api/messages`, msgData, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

    console.log("📌 Sending Message Data:", msgData); // ✅ Debugging log
    if (!msgData.user || !msgData.clubId) {
      console.error("❌ Missing user ID or club ID:", msgData);
      return;
    }

      console.log("📌 Message sent:", res.data);

      // ✅ Emit to Socket.IO
      socket.emit("sendMessage", res.data);

      // ✅ Update messages in real-time
      setMessages((prevMessages) => [...prevMessages, res.data]);
      setMessage("");  // ✅ Clear input after sending
    } catch (error) {
      console.error("Error sending message:", error.response?.data || error.message);
    }
    }
    setMessage("");  // Clear input after sending/updating
  setEditMode(false);  // Reset edit mode after sending/updating
  setEditingMessageId(null);  // Reset the message being edited
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      await axios.delete(`http://localhost:8080/api/messages/${msgId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`,
        "x-club-id": clubId,
        "x-user-role": loggedInUser?.isAdmin ? "admin" : "user" },
      });
      
      setMessages(prev => prev.map(msg => 
        msg._id === msgId ? {
          ...msg,
          deleted: true,
          deletedBy: loggedInUser?._id === clubCreatorId 
          ? "creator" 
          : loggedInUser?.isAdmin 
            ? "admin" 
            : "user"
        } : msg
      ));
      toast.success("🗑️ Message deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("❌ Failed to delete message.");
      alert("You don't have permission to delete this message.");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await axios.delete(
        `http://localhost:8080/api/clubs/${clubId}/removeMember/${userId}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setMembers(prev => prev.filter(member => member._id !== userId));
      toast.success("🚫 Member removed successfully!");
    } catch (error) {
      console.error("Remove member error:", error);
      toast.error("❌ Failed to remove member.");
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTo(0, messagesEndRef.current.scrollHeight);
    }
  }, [messages]);
  
  useEffect(() => {
    const messagesContainer = messagesEndRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      setShowScrollButton(scrollTop + clientHeight < scrollHeight - 50);
    };
    
    messagesContainer?.addEventListener('scroll', handleScroll);
    return () => messagesContainer?.removeEventListener('scroll', handleScroll);
  }, []);  

  useEffect(() => {
    // Initial scroll to bottom
    const timeout = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
      }
    }, 300);
  
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (messagesEndRef.current) {
      const container = messagesEndRef.current;
      const isNearBottom = container.scrollHeight - (container.scrollTop + container.clientHeight) < 100;
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    // Scroll button visibility
    const container = messagesEndRef.current;
    const updateScrollButton = () => {
      if (container) {
        const show = container.scrollHeight > container.clientHeight && 
                    container.scrollTop + container.clientHeight < container.scrollHeight - 100;
        setShowScrollButton(show);
      }
    };
  
    container?.addEventListener('scroll', updateScrollButton);
    updateScrollButton();
  
    return () => {
      container?.removeEventListener('scroll', updateScrollButton);
    };
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on("updateOnlineUsers", (onlineUserList) => {
      console.log("👥 Online Users Updated:", onlineUserList); // Debugging Log
      if (!onlineUserList || onlineUserList.length === 0) {
        console.warn("⚠️ No online users detected!");
      }
      setOnlineUsers(new Set(onlineUserList)); // ✅ Store online users as a Set
    });
    socket.on("deleteMessage", (deletedMsgId) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== deletedMsgId));
    });
    
    socket.on("editMessage", (editedMsg) => {
      setMessages((prev) => 
        prev.map((msg) => msg._id === editedMsg._id ? editedMsg : msg)
      );
    });

    return () => {
      socket.off("updateOnlineUsers");
    };

    
  }, [socket]);

  // Date formatting function
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (date.getTime() === today.getTime()) return "Today";
    if (date.getTime() === yesterday.getTime()) return "Yesterday";
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleEditMessage = (msg) => {
    setEditMode(true);
    setEditingMessageId(msg._id);
    setMessage(msg.message);
  };  

  return (
    <div className="chat-container">
      <Header />
      <div className="chat-layout">
        {/* Members Sidebar */}
        <div className="members-panel">
          <div className="panel-header">
            <h2>ClubReaders</h2>
            <div className="members-status">
              <span>{members.length} Members</span>
              <div className="online-indicator">
                <div className="online-dot" />
                <span>{onlineUsers.size} Online</span>
              </div>
            </div>
          </div>
          
          <div className="members-list">
            {members.length > 0 ? (
              members.map((member) => {
                console.log("👤 Member Data:", member); // Debugging Log

                return (
                  <div key={member._id} className="member-item">
                    <div className="member-info">
                      {/* Online Indicator */}
                      {onlineUsers.has(member._id) && <span className="online-dot"></span>}

                      {/* Profile Image */}
                      <img
                        src={member.avatar ? `http://localhost:8080${member.avatar}` : "/default-avatar.png"}
                        alt={member.username || "Unknown"}
                        className="member-avatar"
                        onError={(e) => (e.target.src = "/default-avatar.png")} // Fallback image
                      />

                      {/* Username */}
                      <span className="member-name">
                        {member.UserName ? member.UserName : "Unknown User"}
                      </span>
                    </div>
                    {loggedInUser?._id === clubCreatorId && (
                      <button
                        className="remove-member-button"
                        onClick={() => handleRemoveMember(member._id)}
                        aria-label="Remove member"
                      >
                        <RiDeleteBinLine size={18} />
                      </button>
                    )}
                  </div>
                );
              })
            ) : (
              <p>No members found</p>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="chat-panel">
          <div className="panel-header">
            <h3>{clubName} Chat</h3>
          </div>
          
          <div className="messages-container" ref={messagesEndRef}>
            {messages.reduce((acc, msg, index) => {
              const currentDate = formatDate(msg.timestamp);
              const prevDate = index > 0 ? formatDate(messages[index - 1].timestamp) : null;

              if (currentDate !== prevDate) {
                acc.push(
                  <div key={`date-${currentDate}`} className="date-header">
                    {currentDate}
                  </div>
                );
              }

              const isOwnMessage = msg.user === loggedInUser?._id;
              acc.push(
                <Message
                  key={msg._id || index}
                  message={msg}
                  own={isOwnMessage}
                  username={msg.username}
                  profileImage={msg.avatar}
                  onEdit={() => handleEditMessage(msg)}
                  onDelete={() => handleDeleteMessage(msg._id)}
                  currentUserId={loggedInUser?._id}
                  clubCreatorId={clubCreatorId}
                  openDropdownId={openDropdownId}
                  toggleDropdown={toggleDropdown}
                  loggedInUser={loggedInUser}
                />
              );
              return acc;
            }, [])}
          </div>
          {showScrollButton && (
            <button 
              className="scroll-to-bottom"
              onClick={() => messagesEndRef.current.scrollTo({
                top: messagesEndRef.current.scrollHeight,
                behavior: 'smooth'
              })}
            >
            </button>
          )}
          <div className="message-input">
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage} className="send-button">
              <BiSolidSend className="send-icon" size={28} />
            </button>
          </div>
        </div>
      </div>
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default Chat;
