import React, { useState, useEffect } from 'react';
import './GenrePage.css';
import Header from '../Header';
import Footer from '../Footer';
import BookCard from '../BookCard';
import axios from 'axios';

const genres = [
  'All', 'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction',
  'Fantasy', 'Romance', 'Thriller', 'Biography', 'Classic', 'Historical', 
  'Horror'
];

const GenrePage = () => {
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleDelete = (deletedId) => {
    setBooks(prev => prev.filter(book => book._id !== deletedId));
    alert("Book deleted successfully!");
  };
  
  const handleUpdate = (updatedBook) => {
    setBooks(prev => prev.map(book => 
      book._id === updatedBook._id ? updatedBook : book
    ));
    alert("Book updated successfully!");
  };

  // Fetch books from MongoDB
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/books');
        setBooks(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to load books');
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  const filteredBooks = books.filter(book => {
    const lowerQuery = searchQuery.toLowerCase();
  const bookGenres = Array.isArray(book.genres) ? 
    book.genres.map(g => typeof g === 'object' ? g.name : g) : 
    [];
  
  const matchesGenre = selectedGenre === 'All' || 
    bookGenres.some(g => g.toLowerCase() === selectedGenre.toLowerCase());
  
  const matchesSearch = book.title.toLowerCase().includes(lowerQuery) ||
    book.author.toLowerCase().includes(lowerQuery);

  return matchesGenre && matchesSearch;
});

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Books...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
      </div>
    );
  }

  return (
    <div className="genre-page">
      <Header /><br></br>
      <div className="genre-container">
        <h1 className="page-title">Explore Our Library</h1>
        
        <div className="search-filter-container">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="fas fa-search"></i>
          </div>

          <div className="genre-filters">
            {genres.map((genre) => (
              <button
                key={genre}
                className={`genre-filter ${selectedGenre === genre ? 'active' : ''}`}
                onClick={() => setSelectedGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard 
            key={book._id} 
            book={book} 
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            userId={localStorage.getItem("userId")} 
            isAdmin={localStorage.getItem("isAdmin") === "true"}
            />
          ))}
        </div>

        {filteredBooks.length === 0 && (
          <div className="no-results">
            <p>No books found matching your criteria</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default GenrePage;