import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import "../pages/AdminRequestsPage.css";
import { useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminRequestsPage = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('tab') || 'pending';
  });

  const token = localStorage.getItem("token");

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8080/api/book-requests/admin/all', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setPendingRequests(res.data.pendingRequests);
      setApprovedRequests(res.data.approvedRequests);
      setRejectedRequests(res.data.rejectedRequests);
    } catch (error) {
      setError(error.response?.data?.message || "Failed to load requests. Please try again.");
      console.error("Error fetching book requests:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusUpdate = async (id, status) => {
    try {
      if (status === "Rejected" && !reason.trim()) {
        alert("Please provide a valid reason for rejection.");
        return;
      }

      const requestData = {
        status,
        ...(status === "Rejected" && { reason }) // Only include reason for rejections
      };

      const response = await axios.put(
        `http://localhost:8080/api/book-requests/admin/${id}`,
        requestData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        const message = status === "Approved" 
        ? `✅ Book request "${response.data.bookTitle}" approved successfully!` 
        : `❌ Book request "${response.data.bookTitle}" rejected.\nReason: ${reason}`;

        toast.success(message);
        
        await fetchRequests();
        setReason("");
        setSelectedRequest(null);
        setActiveTab(status.toLowerCase());
      }
    } catch (error) {
      toast.error(`⚠️ Failed to update request: ${error.response?.data?.message || error.message}`);
      console.error("Update error:", error);
    }
  };

// Update tab handling to modify URL
const handleTabChange = (tab) => {
  setActiveTab(tab);
  searchParams.set('tab', tab);
  setSearchParams(searchParams);
};

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Manage Book Requests</h2>
        {error && <div className="error-message">{error}</div>}
        
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <>
            <div className="tab-buttons">
              <button 
                className={activeTab === "pending" ? "active" : ""} 
                onClick={() => handleTabChange("pending")}
              >
                Pending ({pendingRequests.length})
              </button>
              <button 
                className={activeTab === "approved" ? "active" : ""} 
                onClick={() => handleTabChange("approved")}
              >
                Approved ({approvedRequests.length})
              </button>
              <button 
                className={activeTab === "rejected" ? "active" : ""} 
                onClick={() => handleTabChange("rejected")}
              >
                Rejected ({rejectedRequests.length})
              </button>
            </div>

            <div className="request-list">
              {activeTab === "pending" && (
                pendingRequests.length === 0 ? (
                  <div className="empty-state">No pending requests</div>
                ) : (
                  pendingRequests.map(request => (
                    <div key={request._id} className="request-card">
                      <img 
                      src={request.user?.avatar ? `http://localhost:8080${request.user.avatar}` : "/default-avatar.png"} 
                      alt="User Avatar" 
                      className="user-avatar" 
                    />
                      <div className="request-info">
                        <h3>{request.bookTitle}</h3>
                        <p>Requested by: {request.user?.UserName } ({request.user?.email})</p>
                        <div className="status-controls">
                          <button onClick={() => handleStatusUpdate(request._id, "Approved")}>Approve</button>
                          <button onClick={() => setSelectedRequest(request)}>Reject</button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}

              {activeTab === "approved" && (
                  approvedRequests.map(request => (
                    <div key={request._id} className="request-card">
                      <img 
                        src={request.user?.avatar ? `http://localhost:8080${request.user.avatar}` : "/default-avatar.png"} 
                        alt="User Avatar" 
                        className="user-avatar" 
                      />
                      <div className="request-info">
                        <h3>{request.bookTitle}</h3>
                        <p>Requested by: {request.user?.UserName} ({request.user?.email})</p>
                        <p className="status-approved">Approved ✅</p>
                      </div>
                    </div>
                  ))
              )}

              {activeTab === "rejected" && (
                  rejectedRequests.map(request => (
                    <div key={request._id} className="request-card">
                      <img 
                        src={request.user?.avatar ? `http://localhost:8080${request.user.avatar}` : "/default-avatar.png"} 
                        alt="User Avatar" 
                        className="user-avatar" 
                      />
                      <div className="request-info">
                        <h3>{request.bookTitle}</h3>
                        <p>Requested by: {request.user?.UserName} ({request.user?.email})</p>
                        <p className="status-rejected">Rejected ❌</p>
                        <p><strong>Reason:</strong> {request.reason}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        )}

        {selectedRequest && (
          <div className="popup-overlay">
            <div className="popup-content">
              <h3>Reject Book Request</h3>
              <p>Book: {selectedRequest.bookTitle}</p>
              <textarea
                placeholder="Enter rejection reason (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              />
              <div className="popup-buttons">
                <button 
                  onClick={() => handleStatusUpdate(selectedRequest._id, "Rejected")}
                  disabled={!reason.trim()}
                >
                  Confirm Reject
                </button>
                <button 
                  onClick={() => {
                    setSelectedRequest(null);
                    setReason("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
      <Footer />
    </div>
  );
};

export default AdminRequestsPage;