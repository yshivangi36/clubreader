import React, { useEffect, useState } from "react";
import axios from "axios";
import "../Profile/Profile.css";
import BookCard from "../BookCard";
import Footer from "../Footer";
import { FaUserEdit } from "react-icons/fa";
import { IoMdLogOut } from "react-icons/io";
import Header from "../Header";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [bookHistory, setBookHistory] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", bio: "" });
  const [avatar, setAvatar] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("recents"); // For smooth transition
  const token = localStorage.getItem("token");
  

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!token) return;

      try {
        const profileResponse = await axios.get("http://localhost:8080/api/auth/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUserData(profileResponse.data);
        setFormData({
          name: profileResponse.data.name,
          email: profileResponse.data.email,
          bio: profileResponse.data.bio || "",
        });
        setAvatar(profileResponse.data.avatar || null);

        // book history fetch:
        if (profileResponse.data.bookHistory?.length) {
          const bookHistoryResponse = await axios.post(
            "http://localhost:8080/api/books/by-ids",
            { ids: profileResponse.data.bookHistory },
            { headers: { Authorization: `Bearer ${token}` }}
          );
          setBookHistory(bookHistoryResponse.data);
        }

        // Fetch Favorite Books
        const favoriteResponse = await axios.get("http://localhost:8080/api/users/favorites", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (Array.isArray(favoriteResponse.data)) {
          setFavoriteBooks(favoriteResponse.data);
        }
      } catch (error) {
        console.error("Error fetching profile data:", error.response?.data || error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [token]);

  const handleEditToggle = () => setIsEditing(!isEditing);
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatar(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("bio", formData.bio);
      if (avatarFile) {
        formDataToSend.append("avatar", avatarFile);
      }

      await axios.put("http://localhost:8080/api/auth/profile", formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setIsEditing(false);
      toast.success("Succcessfully Edited!!");
      window.location.reload(); 
    } catch (error) {
      console.error("Error updating profile:", error.response?.data || error);
      toast.error("Failed to Edit");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("surveyStep");
    setUserData(null);
    alert("Logged out successfully");
    window.location.href = "/login";
  };

  if (!token) {
    return <p>Please log in to view your profile.</p>;
  }

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
<Header/>
      {/* Profile Container */}
      <div className="profile-content">
        
        <div className="user-info-card">
        <div className="profile-controls">
            <button onClick={handleEditToggle} className="edit-btn">
              <FaUserEdit className="icon" />
              {isEditing ? "Cancel Edit" : "Edit Profile"}
            </button>
            <button onClick={handleLogout} className="logout-btn">
              <IoMdLogOut className="icon" />
              Log Out
            </button>
          </div>
          <div className="avatar-section">
            <label htmlFor="avatar" className="avatar-label">
            {avatar ? (
              <img src={avatar.startsWith("blob") ? avatar : `http://localhost:8080${avatar}`} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">
                <span className="upload-text">Upload Photo</span>
              </div>
            )}
          </label>
          <input type="file" id="avatar" name="avatar" onChange={handleAvatarChange} style={{ display: "none" }} />
        </div>

          {isEditing ? (
            <div className="edit-form">
              <div className="form-group">
                <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Name" />
              </div>
              <div className="form-group">
                <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email" />
              </div>
              <div className="form-group">
                <label>Bio</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Bio" />
              </div>
                <button onClick={handleSave} className="save-btn">Save Changes</button>
            </div>
          ) : (
            <div className="user-details">
              <div className="detail-item">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{userData?.name || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email:</span>
                <span className="detail-value">{userData?.email || "N/A"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Bio:</span>
                <p className="bio-text">{userData?.bio || "No bio yet"}</p>
              </div>
            </div>
          )}
        </div>

      {/* Three-column Row */}
      {!userData?.isAdmin && (
      <div className="library-section">
          <div className="section-tabs">
        <button className={activeTab === "recents" ? "active" : ""} onClick={() => setActiveTab("recents")}>
          Recents
        </button>
        <button className={activeTab === "favorites" ? "active" : ""} onClick={() => setActiveTab("favorites")}>
          Saved Books
        </button>
        <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>
          Book History
        </button>
      </div>

      <div className="books-container">
            {activeTab === "recents" && (
              <div className="books-grid">
                {bookHistory.slice(0, 5).map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            )}

            {activeTab === "favorites" && (
              <div className="books-grid">
                {favoriteBooks.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            )}

            {activeTab === "history" && (
              <div className="books-grid">
                {bookHistory.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            )}
        </div>
      </div>
              )}
    </div> <br></br>
    <ToastContainer position="top-center" autoClose={3000} />
    <Footer/>
    </div>
  );
};

export default Profile;
