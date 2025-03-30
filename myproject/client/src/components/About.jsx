import React from 'react';
import './About.css'; 
import Header from './Header';
import Footer from './Footer';

const About = () => {
  return (
    <div classname="about-page">
      <Header />
    <div className="about-container">
      <h1>About Our Book Reading and Chatting Website</h1>
      <p>
        Welcome to our ClubReader Website! We believe that reading can take you to new worlds, ignite your imagination, and broaden your knowledge. Our platform offers a wide range of books in various genres including Classic, Fantasy, Horror, Romance, Thriller, and more.
      </p>

      <h2>Our Mission</h2>
      <p>
      Our mission is to provide a seamless platform where readers can easily discover, read, and enjoy their favorite books. Whether you're drawn to timeless classics or the latest fantasy epics, we've got something for everyone. We strive to foster a vibrant reading community where members can share insights, exchange recommendations, and engage in lively discussions.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Wide collection of books across multiple genres.</li>
        <li>Ability to rate and review books.</li>
        <li>Comment on books and interact with other readers.</li>
        <li>Add books to your favorites for easy access.</li>
        <li>Search functionality to help you find your next read.</li>
        <li>Join book clubs, participate in discussions, and make new friends.</li>
      </ul>

      <h2>Get Involved</h2>
      <p>
        Join us today and start your reading journey! Whether you're an avid reader or just starting out, we have something for you. Share your thoughts on books you've read, discover new titles, and be part of our growing reading community.
      </p>
      <p>
        If you have any questions or suggestions, feel free to reach out to us via our <a href="/contact">Contact</a> page. We would love to hear from you!
      </p>
    </div>
    <Footer />
    </div>
  );
};

export default About;
