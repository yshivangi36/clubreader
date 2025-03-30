import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FaSearch } from "react-icons/fa";
import { FaArrowRightFromBracket, FaTrash } from "react-icons/fa6";
import { Link } from "react-router-dom";
import "./Club.css";
import Header from "../Header";
import { MdMarkUnreadChatAlt } from "react-icons/md";
import Footer from "../Footer";

const Club = () => {
  const [clubs, setClubs] = useState([]);
  const [joinedClubs, setJoinedClubs] = useState([]);
  const [createdClubs, setCreatedClubs] = useState([]);
  const [clubName, setClubName] = useState("");
  const [bookName, setBookName] = useState("");
  const [description, setDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [availableBooks, setAvailableBooks] = useState([]);
  const [bookList, setBookList] = useState([]); 
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [error, setError] = useState(null);
  const [genresList, setGenresList] = useState([]);

  //const userId = localStorage.getItem("userId");
  const userToken = localStorage.getItem("token");

  // Function to check if token exists and is valid
  const isTokenValid = useCallback(() => {
    if (!userToken) {
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      return false;
    }
    return true;
  }, [userToken]);
  

  // Fetch books from MongoDB
useEffect(() => {
  const fetchBooks = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/books');
      setBookList(response.data);
      setError(null);

      // Extract unique genres from books
      const uniqueGenres = new Set();
      response.data.forEach(book => {
        if (Array.isArray(book.genres)) {
          book.genres.forEach(g => uniqueGenres.add(g));
        } else if (book.genres) {
          uniqueGenres.add(book.genres);
        }
      });
      const sortedGenres = Array.from(uniqueGenres).sort();
      setGenresList(sortedGenres);
    } catch (error) {
      console.error('Error fetching books:', error);
      setError('Failed to load books. Please try again later.');
    } finally {
      setLoadingBooks(false);
    }
  };
  fetchBooks();
}, []);

   // Set initial genre after genresList is populated
   useEffect(() => {
    if (genresList.length > 0 && !selectedGenre) {
      setSelectedGenre(genresList[0]);
    }
  }, [genresList, selectedGenre]);

  // Update available books when genre changes
  useEffect(() => {
    if (loadingBooks) return;
    
    const filteredBooks = bookList.filter(book => {
      if (!selectedGenre) return true;
      return Array.isArray(book.genres) 
        ? book.genres.includes(selectedGenre) 
        : book.genres === selectedGenre;
    });
    setAvailableBooks(filteredBooks);
    setBookName("");
  }, [selectedGenre, bookList, loadingBooks]);

  // Fetch all clubs
  const fetchClubs = useCallback(async () => {
    if (!isTokenValid()) return;

    try {
      console.log("📡 Fetching clubs...");
      const res = await axios.get("http://localhost:8080/api/clubs", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setClubs(res.data);
    } catch (error) {
      console.error("❌ Error fetching clubs:", error.response?.data || error.message);
    }
  }, [userToken, isTokenValid]);

  // Fetch user's joined clubs
  const fetchUserClubs = useCallback(async () => {
    if (!isTokenValid()) return;

    try {
      console.log("📡 Fetching user's joined and created clubs...");
      const res = await axios.get("http://localhost:8080/api/clubs/userClubs", {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      setJoinedClubs(res.data.joinedClubs);
      setCreatedClubs(res.data.createdClubs);
    } catch (error) {
      console.error("❌ Error fetching user clubs:", error.response?.data || error.message);
    }
  }, [userToken, isTokenValid]);

  useEffect(() => {
    fetchClubs();
    fetchUserClubs();
  }, [fetchClubs,fetchUserClubs]);

  // Create a new club
  const handleCreateClub = async () => {
    if (!isTokenValid()) return;
    if (!clubName || !bookName || !description) return alert("Please fill all fields");

    try {
      console.log("➡️ Creating club...");
      await axios.post(
        "http://localhost:8080/api/clubs",
        { name: clubName, book: bookName, description },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      fetchClubs();
      fetchUserClubs();
      setClubName("");
      setBookName("");
      setDescription("");
    } catch (error) {
      console.error("❌ Error creating club:", error.response?.data || error.message);
    }
  };

  // Join a club
  const handleJoinClub = async (clubId) => {
    if (!isTokenValid()) return;
    try {
      console.log(`➡️ Joining club: ${clubId}`);
      await axios.post(
        "http://localhost:8080/api/clubs/joinClub",
        { clubId },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      console.log("✅ Successfully joined club");
      fetchClubs();
      fetchUserClubs();
    } catch (error) {
      console.error("❌ Error joining club:", error.response?.data || error.message);
      alert(`Error: ${error.response?.data?.error || "Could not join club"}`);
    }
  };

  // Leave a club
  const handleLeaveClub = async (clubId) => {
    if (!isTokenValid()) return;
    try {
      console.log(`➡️ Leaving club: ${clubId}`);
      await axios.post(
        "http://localhost:8080/api/clubs/leaveClub",
        { clubId },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      console.log("✅ Successfully left club");
      fetchUserClubs();
    } catch (error) {
      console.error("❌ Error leaving club:", error.response?.data || error.message);
      alert(`Error: ${error.response?.data?.error || "Could not leave club"}`);
    }
  };

  // Delete a club
  const handleDeleteClub = async (clubId) => {
    if (!isTokenValid()) return;
    try {
      console.log(`🗑️ Deleting club: ${clubId}`);
      await axios.delete(`http://localhost:8080/api/clubs/${clubId}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      fetchClubs();
      fetchUserClubs();
    } catch (error) {
      console.error("❌ Error deleting club:", error.response?.data || error.message);
    }
  };

  // Filter clubs based on search query
  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      club.book.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>      
      <Header />
    <div className="club-container">
      <div className="club-grid">
        {/* Left Column - Create a New Club */}
        <div className="create-club box">
          <h3>Create a New Club</h3>
          {error && <div className="error-message">{error}</div>}

          <input type="text" placeholder="Club Name" 
          value={clubName} onChange={(e) => setClubName(e.target.value)} />

          <div className="form-group">
            <label>Genre:</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option value="">All Genres</option>
              {genresList.length > 0 ? (
    genresList.map(genre => (
      <option key={genre} value={genre}>{genre}</option>
    ))
  ) : (
    <option disabled>No genres available</option>
  )}
</select>
          </div>

          <div className="form-group">
            <label>Book:</label>
            {loadingBooks ? (
              <div className="loading-books">Loading books...</div>
            ) : (
              <select value={bookName} onChange={(e) => setBookName(e.target.value)}>
                <option value="">Select a Book</option>
                {availableBooks.map(book => (
                  <option key={book._id} value={book.title}>
                    {book.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <textarea placeholder="Description" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}></textarea>
<br></br>
          <button className="create-btn" onClick={handleCreateClub}>
            Create Club
            </button>
        </div>

         {/* Middle Column - Available Clubs */}
         <div className="available-clubs box">
          <h3>All Clubs</h3>
          <div className="search-bar">
            <input type="text" placeholder="Search clubs or books" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <FaSearch className="react-icons" />
          </div>
          <div className="club-list">
            {filteredClubs.map((club) => (
              <div key={club._id} className="club-card">
                <p><strong>Club:</strong> {club.name}</p>
                <p><strong>Book:</strong> {club.book}</p>
                <p><strong>Description:</strong> {club.description}</p>
                <p><strong>Members:</strong> {club.members.length}</p>
                <div className="club-actions">
                {createdClubs.some(cc => cc._id === club._id) ? (

                <span className="created">Created</span>

                ) : joinedClubs.some(jc => jc._id === club._id) ? (

                <span className="joined">Joined</span>

                ) : (

                <button className="join-btn" onClick={() => handleJoinClub(club._id)}>Join</button>

                )}
              </div>
              </div>
            ))}
          </div>
        </div>

        {/* User's Created Clubs Section */}
<div className="user-clubs box">
  <div className="club-box">
    <h3>Your Created Clubs</h3>
    {createdClubs.map((club) => (
      <div key={club._id} className="club-card user-club-card">
        <span className="club-name">{club.name}</span>
        <div className="icons-container">
          <Link to={`/chat/${club._id}`}>
            <MdMarkUnreadChatAlt className="chat-icon" />
          </Link>
          <FaTrash className="delete-icon" onClick={() => handleDeleteClub(club._id)} />
        </div>
      </div>
    ))}
  </div>
</div>

{/* Joined Clubs Section */}
<div className="user-clubs box">
  <div className="club-box">
    <h3>Your Joined Clubs</h3>
    {joinedClubs.map((club) => (
      <div key={club._id} className="club-card user-club-card">
        <span className="club-name">{club.name}</span>
        <div className="icons-container">
          <Link to={`/chat/${club._id}`}>
            <MdMarkUnreadChatAlt className="chat-icon" />
          </Link>
          <FaArrowRightFromBracket className="leave-icon" onClick={() => handleLeaveClub(club._id)} />
        </div>
      </div>
    ))}
  </div>
</div>
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default Club;
