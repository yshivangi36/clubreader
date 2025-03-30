import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Header from '../Header';
import Footer from '../Footer';
import { FaTrash, FaTimes } from 'react-icons/fa';
import "../Club/AdminClubsPage.css";
import { MdMarkUnreadChatAlt } from 'react-icons/md';
import { Link } from 'react-router-dom';
import Modal from 'react-modal';

const customStyles = {
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: '400px',
      padding: '20px'
    },
  };

const AdminClubsPage = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(null);

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Unauthorized! Please log in again.");
          localStorage.clear();
          window.location.href = '/login';
          return;
        }

        const response = await axios.get('http://localhost:8080/api/clubs', { 
          headers: { 
            Authorization: `Bearer ${token.trim()}`,
            'Content-Type': 'application/json'
          }
        });

// Handle both populated and unpopulated createdBy
const formattedClubs = response.data.map(club => ({
    ...club,
    createdBy: club.createdBy?.UserName ||  // Match backend response
    (club.createdBy?._id || 'Unknown')
}));

  setClubs(formattedClubs);
        console.log('API Response:', response.data); // Add logging
      } catch (error) {
        console.error('Fetch error:', error);
        setError('Failed to load clubs');
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.clear();
          window.location.href = "/login";
        }
      } finally {
        setLoading(false);
      }
    };
    fetchClubs();
  }, []);

  // Search functionality
  const filteredClubs = clubs.filter(club => {
    const searchContent = `${club.name} ${club.book} ${club.description} ${club.createdBy}`.toLowerCase();
    return searchContent.includes(searchTerm.toLowerCase());
  });

  const handleDelete = async (clubId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Unauthorized! Please log in again.");
      localStorage.clear();
      window.location.href = "/login";
      return;
  }
  
  // Properly extract admin status
  const decodedToken = JSON.parse(atob(token.split('.')[1]));
  const isAdmin = decodedToken?.isAdmin || false;

  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json',
};

  if (decodedToken?.isAdmin && deleteReason.trim()) {
    headers['X-Admin-Reason'] = deleteReason.trim();
}

  // Always set selected club ID
  setSelectedClubId(clubId);

  if (isAdmin) {
    setShowReasonModal(true);
  } else {
    // Directly confirm for non-admins
    if (window.confirm("Are you sure you want to delete this club?")) {
      confirmDelete();
    }
  }
};
  
const confirmDelete = async () => {
        setShowReasonModal(false);
try{
            const token = localStorage.getItem("token")?.trim();
            const headers = {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            };
        
            // Only add reason header for admin deletions
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            const isAdmin = decodedToken?.isAdmin || false;
            if (decodedToken?.isAdmin && deleteReason) {
              headers['X-Admin-Reason'] = deleteReason;
            }

            if (isAdmin && deleteReason.trim()) {
              headers['X-Admin-Reason'] = deleteReason.trim();
            }
      
            console.log("🗑️ Sending DELETE request for club:", selectedClubId);
            console.log("📜 Headers being sent:", headers);
        
            const response = await axios.delete(
              `http://localhost:8080/api/clubs/${selectedClubId}`,
              { headers }
            );

            console.log("🗑️ Delete Response:", response.data);
        
            if (response.status === 200) {
              setClubs(prev => prev.filter(club => club._id !== selectedClubId));
              alert(response.data.message);
              alert("✅ Club deleted successfully!");
              setDeleteReason('');
            }
          } catch (error) {
            console.error("❌ Delete error:", error.response?.data || error.message);
            alert(`Delete failed: ${error.response?.data?.message || error.message}`);
        }
        };

  return (
    <div>
      <Header />
      <div className="admin-clubs-container">
        <h2>Manage All Clubs</h2>
        <Modal
        isOpen={showReasonModal}
        onRequestClose={() => setShowReasonModal(false)}
        style={customStyles}
        contentLabel="Delete Reason"
      >
        <div className="modal-header">
          <h3>Admin Deletion Reason</h3>
          <button 
            className="close-btn"
            onClick={() => setShowReasonModal(false)}
          >
            <FaTimes />
          </button>
        </div>
        <textarea
          placeholder="Enter reason for deletion..."
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          className="reason-input"
        />
        <div className="modal-actions">
          <button 
            className="cancel-btn"
            onClick={() => setShowReasonModal(false)}
          >
            Cancel
          </button>
          <button 
            className="confirm-btn"
            onClick={confirmDelete}
            disabled={!deleteReason.trim()}
          >
            Confirm Delete
          </button>
        </div>
      </Modal>

        {/* Search Bar */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search clubs by name, book, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {loading ? (
          <div>Loading clubs...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredClubs.length === 0 ? (
          <div>No clubs found matching your search</div>
        ) : (
          <div className="clubs-grid">
            {filteredClubs.map(club => (
              <div key={club._id} className="club-card">
                <div className="club-header">
                  <h3>{club.name}</h3>
                  <div className="club-actions">
                    <Link to={`/chat/${club._id}`} className="chat-link">
                      <MdMarkUnreadChatAlt className="chat-icon" />
                    </Link>
                    <button 
                      className="delete-btn"
                      onClick={() => handleDelete(club._id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <div className="club-details">
                  <p><strong>Book:</strong> {club.book}</p>
                  <p><strong>Description:</strong> {club.description}</p>
                  <div className="club-meta">
                    <span>Created by: {club.createdBy}</span>
                    <span>Members: {club.members?.length || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminClubsPage;