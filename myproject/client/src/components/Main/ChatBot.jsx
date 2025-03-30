import React, { useState } from 'react';
import axios from 'axios';
import './ChatBot.css';
import botIcon from './bot.jpeg';

const ChatBot = () => {
  const [messages, setMessages] = useState([{ 
    from: 'bot', 
    text: 'Hi! I\'m BookBuddy AI 🤖 How can I assist you today?',
    animation: 'fadeIn'
  }]);
  const [userMessage, setUserMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const generateResponse = async (userInput) => {
    try {
      const response = await axios.post('http://localhost:8080/api/ai/chat', { 
        message: userInput 
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      return {
        text: response.data.text.replace(/\n/g, '\n'),
        books: response.data.books,
        actions: response.data.actions
      };
    } catch (error) {
      return {
        text: "Our librarians are currently busy. Try these options:",
        actions: ["Browse Books", "View Clubs"],
        books: null
      };
    }
  };

  const handleSendMessage = async () => {
    if (!userMessage.trim()) return;

    // Add user message with animation
    setMessages(prev => [...prev, {
      from: 'user',
      text: userMessage,
      animation: 'slideInRight'
    }]);

    const userInput = userMessage;
    setUserMessage('');
    setIsBotTyping(true);

    try {
      const { text, actions, books } = await generateResponse(userInput);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          from: 'bot',
          text: text,
          animation: 'slideInLeft',
          actions,
          books
        }]);
        setIsBotTyping(false);
      }, 1500);

    } catch (error) {
      setIsBotTyping(false);
      setMessages(prev => [...prev, {
        from: 'bot',
        text: 'Oops! Something went wrong. Please try again.',
        animation: 'shake'
      }]);
    }
  };

  const handleQuickAction = (action) => {
    setUserMessage(action);
    handleSendMessage();
  };

  return (
    <div className="chatbot-wrapper">
      <div 
        className={`chatbot-launcher ${isChatOpen ? 'pulse' : ''}`}
        onClick={() => setIsChatOpen(!isChatOpen)}
      >
        <img src={botIcon} alt="AI Assistant" className="bot-avatar" />
        {!isChatOpen && <div className="notification-dot"></div>}
      </div>

      {isChatOpen && (
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="ai-title">
              <h3>BookBuddy AI</h3>
              <span className="ai-status">🟢 Online</span>
            </div>
            <button className="close-btn" onClick={() => setIsChatOpen(false)}>
              &times;
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div 
                key={index}
                className={`message-bubble ${msg.from}`}
                data-animation={msg.animation}
              >
                <div className="message-content">
                {msg.genre && (
                    <div className="genre-header">
                    📚 {msg.genre}
                    </div>
                )}
                
                {msg.suggestedGenres && (
                    <div className="genre-suggestions">
                    <p>Try these genres instead:</p>
                    <div className="genre-tags">
                        {msg.suggestedGenres.map((genre, i) => (
                        <button
                            key={i}
                            className="genre-tag"
                            onClick={() => handleQuickAction(genre)}
                        >
                            {genre}
                            {i < msg.suggestedGenres.length - 1 && ', '}
                        </button>
                        ))}
                    </div>
                    </div>
                )}
                {msg.text.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                ))}
                
                {msg.books && (
                    <div className="book-recommendations">
                    {msg.books.map(book => (
                        <div key={book._id} className="book-card">
                        <h4>{book.title}</h4>
                        <p className="author">by {book.author}</p>
                        {book.averageRating && (
                            <div className="rating">
                            ⭐ {book.averageRating.toFixed(1)}
                            </div>
                        )}
                        </div>
                    ))}
                    </div>
                )}
                  {msg.actions && (
                    <div className="quick-actions">
                      {msg.actions.map((action, i) => (
                        <button
                          key={i}
                          className="action-btn"
                          onClick={() => handleQuickAction(action)}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isBotTyping && (
              <div className="typing-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Ask me about books, clubs, or anything..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              className="send-btn"
              onClick={handleSendMessage}
              disabled={isBotTyping}
            >
              <span className="send-icon">🚀</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;