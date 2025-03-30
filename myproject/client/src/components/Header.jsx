import React, { useEffect, useState } from 'react';
import axios from 'axios';
import logocat from "../assets/logocat.jpeg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../components/Profile/Profile.css";
import styled from 'styled-components';
import { FaUserCircle, FaBookMedical, FaRegEdit, FaBell } from "react-icons/fa";
import { FaRankingStar } from "react-icons/fa6";

const RightNav = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NavIcon = styled(Link)`
  margin-left: 1rem;
  color: #fff;
  transition: color 0.3s ease;
  position : relative;
  cursor: pointer;
  &:hover {
    color: #007bff;
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -5px;
  right: -5px;
  background: #e94560;
  color: white;
  border-radius: 50%;
  padding: 2px 6px;
  font-size: 0.8rem;
`;

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  //const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const shouldShowLink = (path) => location.pathname !== path;
  const [notificationCount, setNotificationCount] = useState(0);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);

  
  useEffect(() => {
    if (!token) return;

    const fetchNotifications = async () => {
      try {
        if (isAdmin) {
          const response = await axios.get('http://localhost:8080/api/book-requests/admin/notifications', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setAdminNotificationCount(response.data.newRequestsCount || 0);
        } else {
          const response = await axios.get('http://localhost:8080/api/book-requests/notifications', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setNotificationCount(response.data.length || 0);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [token, isAdmin]);

  const handleNotificationClick = async (event) => {
    event.preventDefault();
    if (!token) {
      navigate("/login");
      return;
    }

    navigate(isAdmin ? "/admin/requests" : "/user/requests");
  };

  return (
    <div>
    <nav className="navbar">
      <div className="leftNav">
        <div className="logoContainer">
          <img src={logocat} alt="logo" className="logoImage" />
          <div className="logoText">ClubReaders</div>
        </div>
      </div>
      <RightNav>
      {!isAdmin && location.pathname !== "/main" && <Link to="/main" className="navButton">Home</Link>}
      {!isAdmin && location.pathname !== "/club" && <Link to="/club" className="navButton">Club</Link>}
      {isAdmin && location.pathname !== "/admin/clubs" && <Link to="/club" className="navButton">Club</Link>}
      {location.pathname !== "/genre" && <Link to="/genre" className="navButton">Genre</Link>}
      {!isAdmin && location.pathname !== "/about" && <Link to="/about" className="navButton">About</Link>}
      {!isAdmin && shouldShowLink("/ranking") && (<Link to="/ranking" className="navButton"><FaRankingStar size={18} title="Rankings"/></Link>)}

      {location.pathname !== "/requests" && token && !isAdmin && (
        <NavIcon to="/requests">
          <FaRegEdit size={28} title="Requests" />
          {notificationCount > 0 && <NotificationBadge>{notificationCount}</NotificationBadge>}
        </NavIcon>
      )}

      {shouldShowLink("/admin") && isAdmin && (
        <NavIcon to="/admin" className="nav-icon">
          <FaBookMedical size={28} title="Admin Dashboard" />
        </NavIcon>
      )}

      {token && shouldShowLink("/user/requests") && (
        <NavIcon as="button" 
          onClick={handleNotificationClick} 
          style={{ background: "none", border: "none", cursor: "pointer" }}>
          <FaBell size={28} title="Notifications" />
          {(isAdmin ? adminNotificationCount : notificationCount) > 0 && (
                <NotificationBadge>
                  {isAdmin ? adminNotificationCount : notificationCount}
                </NotificationBadge>
              )}
        </NavIcon>
      )}

      {shouldShowLink("/profile") && NavIcon.pathname !== "/profile" && (
        <NavIcon to="/profile" className="nav-icon">
          <FaUserCircle size={32} title="Profile" />
        </NavIcon>
      )}
      </RightNav>
    </nav>
    </div>
  );
};

export default Header;