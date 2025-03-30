import React from "react";
import bookgrid from "./bookgrid.png";
import { Link } from 'react-router-dom';
import logocat from "./logocat.jpeg";
import "./index.css";

const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  backgroundColor: "#333",
  color: "white",
  padding: "20px 30px",
  flexWrap: "wrap",
  width: "100vw",
};

const footerRowStyle = {
  flex: 1,
  minWidth: "150px",
  margin: "0 0px",
};

const headingStyle = {
  fontSize: "1.5rem",
};

const paragraphStyle = {
  fontSize: "1rem",
  margin: "0",
};

const Home = () => {
  return (
    <div>
      {/* Menubar */}
      <nav className="navbar">
      <div className="leftNav">
        <div className="logoContainer">
          <img src={logocat} alt="logo" className="logoImage" />
          <div className="logoText">ClubReaders</div>
        </div>
      </div>
      <div className="rightNav">
      <Link to="/login" className="navButton">Sign In</Link>

      <Link to="/signup" className="navButton">Sign Up</Link>

      <Link to="/about" className="navButton">About</Link>
          
      </div>
    </nav>

      {/* Container */}
      <div className="grid-container">
        <div className="leftSection">
          <div className="textContent">
            <h1>ClubReaders</h1>
            <p>Because life's too short for a book you're not in the mood for.</p>
            <div className="buttons">
              <Link to="/register" className="signUpButton">Start Reading</Link>
            </div>
          </div>
        </div>

        <div className="rightSection">
          <img src={bookgrid} className="bookgridImage" alt="Book Grid" />
        </div>
      </div>

      {/* Benefits Section */}
      <section className="benefits">
        <h2>📖 Why Join ClubReaders?</h2>
        <div className="benefitList">
          <div className="benefitItem">
            <h3>📚 Diverse Selection</h3>
            <p>Explore books from various genres curated by fellow readers.</p>
          </div>
          <div className="benefitItem">
            <h3>🌍 Engaging Community</h3>
            <p>Connect with book lovers and discuss your favorite reads.</p>
          </div>
          <div className="benefitItem">
            <h3>🔍 Personalized Picks</h3>
            <p>Receive book recommendations tailored to your taste.</p>
          </div>
          <div className="benefitItem">
            <h3>🎉 Fun Challenges</h3>
            <p>Join book clubs, reading challenges, and themed discussions.</p>
          </div>
        </div>
      </section>

      {/* Book Quotes Section */}
      <section className="bookQuotes">
        <h2>📜 Inspiring Book Quotes</h2>
        <div className="quoteList">
          <blockquote>"A reader lives a thousand lives before he dies." - George R.R. Martin</blockquote>
          <blockquote>"Not all those who wander are lost." - J.R.R. Tolkien</blockquote>
          <blockquote>"So many books, so little time." - Frank Zappa</blockquote>
          <blockquote>"Until I feared I would lose it, I never loved to read. One does not love breathing." - Harper Lee</blockquote>
        </div>
      </section>

      {/* Footer Section */}
      <footer style={footerStyle}>
        <div style={footerRowStyle}>
          <h3 style={headingStyle}>About</h3>
          <p style={paragraphStyle}>Learn more about ClubReaders and our mission.</p>
        </div>
        <div style={footerRowStyle}>
          <h3 style={headingStyle}>Reader</h3>
          <p style={paragraphStyle}>Explore the world of reading with us.</p>
        </div>
        <div style={footerRowStyle}>
          <h3 style={headingStyle}>Author</h3>
          <p style={paragraphStyle}>Get in touch with authors and their works.</p>
        </div>
        <div style={footerRowStyle}>
          <h3 style={headingStyle}>Contact</h3>
          <p style={paragraphStyle}>Email us at support@clubreaders.com</p>
        </div>
      </footer>
    </div>
  );
};
export default Home;
