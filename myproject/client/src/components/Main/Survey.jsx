import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "../Main/Survey.css";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Survey = () => {
  const [formData, setFormData] = useState({
    gender: '',
    genres: [],
    age: '',
    favoriteAuthor: ''
  });
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    const fetchBooksAndGenres = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get('http://localhost:8080/api/books', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const books = response.data;

        const uniqueGenres = new Set();
        books.forEach(book => {
          if (Array.isArray(book.genres)) {
            book.genres.forEach(g => uniqueGenres.add(g));
          } else if (book.genres) {
            uniqueGenres.add(book.genres);
          }
        });

        setGenres(Array.from(uniqueGenres).sort());
        setError(null);
      } catch (err) {
        console.error('Failed to fetch books:', err);
        setError('Failed to load genres. Using default selections.');
        setGenres([
          'Fantasy', 'Mystery', 'Romance', 
          'Sci-Fi', 'Non-Fiction', 'Thriller'
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooksAndGenres();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Session expired. Please login again.");
        navigate('/login');
        return;
      }

      const response = await axios.patch(
        `http://localhost:8080/api/users/${userId}`,
        { surveyCompleted: true, preferences: formData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
  
      if (response.data.surveyCompleted) {
        navigate('/main');
      } else {
        throw new Error("Survey completion not acknowledged by server");
      }
      toast.success("successfully completed survey!!");
    } catch (error) {
      console.error('Submission error:', error);
    }
  };

  const handleCheckboxChange = (genre) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  return (
    <div className="survey-container">
      <div className="survey-header">
        <h1>Welcome to Your Reading Journey! 📚</h1>
        <p>Help us curate the perfect books for you</p>
        {error && <div className="error-message">{error}</div>}
      </div>

      {loading ? (
        <div className="loading-spinner">🌀 Loading genres...</div>
      ) : (
        <form onSubmit={handleSubmit} className="survey-steps">
          {/* Basic Information */}
          <h2>Basic Information</h2>
          <div className="form-group">
            <label>Gender:</label>
            <div className="gender-select">
              {['male', 'female', 'other'].map(option => (
                <label key={option}>
                  <input
                    type="radio"
                    name="gender"
                    value={option}
                    checked={formData.gender === option}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  />
                  <span className="gender-option">
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Age Group:</label>
            <div className="age-buttons">
              {['18-25', '26-35', '36-45', '45+'].map(age => (
                <button
                  type="button"
                  key={age}
                  className={`age-option ${formData.age === age ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, age })}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Preferences */}
          <h2>Genre Preferences</h2>
          <div className="genre-grid">
            {genres.map(genre => (
              <label key={genre} className="genre-card">
                <input
                  type="checkbox"
                  checked={formData.genres.includes(genre)}
                  onChange={() => handleCheckboxChange(genre)}
                  hidden
                />
                <div className="genre-content">
                  <span>{genre}</span>
                </div>
              </label>
            ))}
          </div>

          {/* Favorite Author */}
          <div className="form-group">
            <label>Favorite Author:</label>
            <input
              type="text"
              value={formData.favoriteAuthor}
              onChange={(e) => setFormData({ ...formData, favoriteAuthor: e.target.value })}
              placeholder="Enter your favorite author"
              className="text-input"
            />
          </div>

          {/* Submit & Skip Buttons */}
          <div className="navigation-buttons">
            <button type="submit">Complete Setup</button>
            <button 
              type="button" 
              className="skip-button" 
              onClick={async () => {
                try {
                  const token = localStorage.getItem("token");
                  if (!token) {
                    alert("Session expired. Please login again.");
                    navigate('/login');
                    return;
                  }
            
                  // Mark survey as completed in the backend
                  await axios.patch(`http://localhost:8080/api/users/${userId}`, 
                    { surveyCompleted: true }, 
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
            
                  // Navigate to the main page with updated state
                  navigate('/main');
            
                } catch (error) {
                  console.error('Skipping error:', error);
                }
              }}
            >
              Skip for Now
            </button>
          </div>
        </form>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Survey;
