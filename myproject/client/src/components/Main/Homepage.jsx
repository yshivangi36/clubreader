import React, { useState, useEffect } from "react";
import "../Main/Homepage.css";
import { useNavigate, useLocation } from "react-router-dom";
import BookCard from "../BookCard";
import Footer from "../Footer";
import Header from "../Header";
import axios from "axios";
import ChatBot from "../Main/ChatBot";

import ad1 from "../../assets/ad3 (2).jpg";
import ad2 from "../../assets/ad4.jpg";
import ad3 from "../../assets/ad6.jpg";

const adImages = [ad1, ad2, ad3];

export const Homepage = () => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [topBooks, setTopBooks] = useState([]);
  const [recommendedBooks, setRecommendedBooks] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});
  const navigate = useNavigate();
  const location = useLocation();

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  /* 🔥 Advertisement messages
  const advertisements = [
    "📚 Dive into 'The Last Kingdom' - Available Now!",
    "🔥 Discover 2024’s Top 10 Must-Read Books!",
    "🎭 Join Exclusive Book Clubs & Meet Like-minded Readers!",
    "💡 Get Personalized Book Recommendations – Just for You!",
    "📖 Special Deal! Get Your First E-Book for Free!",
  ];*/

  // 📝 Check if the user completed the survey
  useEffect(() => {
    const checkSurveyStatus = async () => {
      if (!userId || !token) return;

      try {
        const { data } = await axios.get(`http://localhost:8080/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!data.surveyCompleted) {
          console.log("Survey not completed. Redirecting...");
          navigate("/survey");
        } else {
          setUserPreferences(data.preferences || {});
        }
      } catch (error) {
        console.error("Error checking survey status:", error);
      }
    };

    checkSurveyStatus();
  }, [userId, token, navigate, location.state?.surveyCompleted]);

  // 📚 Fetch books based on preferences
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data } = await axios.get("http://localhost:8080/api/books", {
          params: { genres: userPreferences?.genres?.length ? userPreferences.genres : null },
        });

        if (userPreferences?.genres?.length) {
          setRecommendedBooks(data.slice(0, 5));
        } else {
          setTopBooks(data.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching books:", error);
      }
    };

    if (userPreferences) fetchBooks();
  }, [userPreferences]);

  // 🎭 Fetch book clubs
  useEffect(() => {
    const fetchClubs = async () => {
      if (!token) {
        console.error("No token found. User might be logged out.");
        return;
      }

      try {
        const { data } = await axios.get("http://localhost:8080/api/clubs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClubs(data.slice(0, 4));
      } catch (error) {
        console.error("Error fetching clubs:", error);
      }
    };

    fetchClubs();
  }, [token]);

  useEffect(() => {
    const adInterval = setInterval(() => {
      setCurrentAdIndex(prev => (prev + 1) % adImages.length);
    }, 3000);
    return () => clearInterval(adInterval);
  }, []);

  return (
    <div className="cyberpunk-container">
      <Header />
      <div className="card-slider-container">
        <div className="slider-track"
        style={{ transform: `translateX(-${currentAdIndex * 100}%)` }}>
          {adImages.map((img, index) => (
             <div key={index} className="slide-card-container">
             <div className="slide-card">
               <img src={img} alt={`Slide ${index + 1}`} />
             </div>
           </div>
          ))}
        </div>
        <div className="slider-nav">
          {adImages.map((_, index) => (
            <button
              key={index}
              className={`nav-dot ${index === currentAdIndex ? "active" : ""}`}
              onClick={() => setCurrentAdIndex(index)}
            />
          ))}
        </div>
      </div><br></br>

{/* 🎮 Club Hub */}
<section className="homepage-clubs clubs-section">
<section className="clubs-section">
        <div className="section-header">
          <h2 className="section-title">Recommended Clubs<span 
          className="see-all-btn" 
          onClick={() => navigate("/club")}
          style={{ cursor: 'pointer', marginLeft: '10px' }}
        >
          &gt;&gt;&gt;
        </span>
        </h2>  
        </div><br></br>
        <div className="section-divider"></div>
        <div className="club-grid">
          {clubs.map((club) => (
            <div 
              key={club._id} 
              className="club-card"
              onClick={() => navigate(`/club`)}
            >
              <div className="club-content">
                <h3 className="club-name">{club.name}</h3>
                <p className="club-genre">{(club.book?.genres?.[0] || "General Literature").toUpperCase()}</p>
                <div className="club-stats">
                <span className="members">{club.members?.length || 0}+ Members</span><br></br>
                  <span className="discussions">{club.discussions}+ Discussions</span>
                </div>
                <p className="club-description">{club.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section><br></br>


      {/* Recommended Reads Section */}
      <section className="recommendation-section">
        <div className="section-header">
          <h2>Recommend Reads
          <span 
          className="see-all-btn" 
          onClick={() => navigate("/genre")}
          style={{ cursor: 'pointer', marginLeft: '10px' }}
        >
          &gt;&gt;&gt;
        </span>
          </h2>
        </div><br></br>
        <div className="section-divider"></div>
        <div className="book-grid">
          {(userPreferences?.genres?.length ? recommendedBooks : topBooks).map((book) => (
            <BookCard key={book._id} book={book} userId={userId} />
          ))}
        </div>
      </section>
      </section><br></br>

      <ChatBot />
      <Footer />
    </div>
    
  );
};

export default Homepage;
