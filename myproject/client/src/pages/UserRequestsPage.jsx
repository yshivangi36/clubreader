import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import "../pages/UserRequestsPage.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const UserRequestsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [viewedNotifications, setViewedNotifications] = useState(new Set());
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  // Single notification click handler
  const handleNotificationClick = async (id) => {
    try {
      await axios.patch(
        `http://localhost:8080/api/book-requests/notifications/${id}/mark-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => 
        n._id === id ? { ...n, viewed: true } : n
      ));
    } catch (error) {
      console.error("Mark Read Error:", error.response?.data || error.message);
    }
  };

  // Mark all as read handler
  const handleMarkAllRead = async () => {
    try {
      await axios.put(
        'http://localhost:8080/api/book-requests/notifications/mark-read',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications(prev => prev.map(n => ({ ...n, viewed: true })));
      toast.success("Marked All Read");
    } catch (error) {
      console.error("Mark Read Error:", error.response?.data || error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date unknown';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(
          'http://localhost:8080/api/book-requests/notifications',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (Array.isArray(data)) {
          setNotifications(data);
        } 
      } catch (error) {
        console.error("Fetch Error:", error.response?.data || error.message);
        navigate("/login");
      }
    };

    fetchData();
  }, [token, navigate]);

  return (
    <div>
      <Header />
      <div className="notifications-container">
    <div className="activity-header">
      <div className="header-controls">
        <h2 className="text-primary">Your Reading Activity</h2>
        <div className="button-group">
          <button 
            className="mark-read-button"
            onClick={handleMarkAllRead}
          >
            Mark All as Read
          </button>
          <button className="clear-button"
              onClick={async () => {
                try {
                  await axios.post(
                    'http://localhost:8080/api/book-requests/clear-notifications',
                    {},
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  setNotifications([]);
                  setViewedNotifications(new Set());
                  toast.success("Successfully Cleared All Notifications");
                } catch (error) {
                  console.error("Clear Error:", error.response?.data || error.message);
                }
              }}
            >
              Clear All Notifications
            </button>
          </div>
        </div>
      </div>

        {notifications.length > 0 ? (
          notifications.map((notification) => {
            const status = notification.status || 'Pending';
            const isViewed = viewedNotifications.has(notification._id);
          
            return (
              <div 
                key={notification._id} 
                className={`notification-card ${isViewed ? 'viewed' : ''}`}
                onClick={() => handleNotificationClick(notification._id)}
              >
                <p className="notification-message">
                  {notification.message}
                </p>
                {status.toLowerCase() === 'rejected' && (
                  <p className="text-danger">
                    Reason: {notification.reason || 'No reason provided'}
                  </p>
                )}
                {status.toLowerCase() === 'approved' && (
                  <p className="text-success">
                    Find this book in the Genre section
                  </p>
                )}
                <div className="notification-meta">
                {!notification.viewed && (
                    <span className={`status-badge ${
                      status.toLowerCase() === 'approved' ? 'approved-badge' :
                      status.toLowerCase() === 'rejected' ? 'rejected-badge' : 'pending-badge'
                    }`}>
                      {status.toUpperCase()}
                    </span>
                  )}
                  <span className="notification-date">
                    {formatDate(notification.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-5">
            <p className="empty-state-text">No reading activity to show yet</p>
            <Link to="/genre" className="explore-button">
              Explore Books
            </Link>
          </div>
        )}
      </div>
      <ToastContainer position="top-center" autoClose={3000} />
      <Footer />
    </div>
  );
};

export default UserRequestsPage;