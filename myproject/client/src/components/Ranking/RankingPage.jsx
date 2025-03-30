import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Select, List, Avatar, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import "../Ranking/RankingPage.css";
import Header from '../Header';
import Footer from '../Footer';
import BookCard from '../BookCard';

const RankingPage = () => {
  const [timeRange, setTimeRange] = useState('weekly');
  const [activeTab, setActiveTab] = useState('clubs');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const navigate = useNavigate();

  // Rank color configuration
  const getRankStyle = (index) => {
    switch(index) {
      case 0: return { backgroundColor: '#ffd700', fontSize: '1.2rem' }; // Gold
      case 1: return { backgroundColor: '#c0c0c0', fontSize: '1.1rem' }; // Silver
      case 2: return { backgroundColor: '#cd7f32', fontSize: '1rem' };   // Bronze
      default: return { backgroundColor: '#87d068' };                    // Default
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const endpointMap = {
          'most-visited': 'http://localhost:8080/api/books/rankings/most-visited',
          'highest-rated': 'http://localhost:8080/api/books/rankings/highest-rated',
          'most-discussed': 'http://localhost:8080/api/books/rankings/most-discussed',
          'most-members': 'http://localhost:8080/api/clubs/rankings/most-members',
        };
        
        const response = await axios.get(endpointMap[activeTab]);
        
        if (response.data && Array.isArray(response.data)) {
          setData(response.data.slice(0, 5)); // ✅ Safe slicing
        } else {
          console.error("Invalid API response:", response.data);
          setData([]); // ✅ Avoids undefined errors
        }
      } catch (error) {
        console.error("Error fetching rankings:", error);
        setData([]); // ✅ Avoids undefined errors
      }
      setLoading(false);
    };

    fetchData();
  }, [activeTab, timeRange]);

  const handleItemClick = (item) => {
    if (activeTab === 'most-members') {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      if (item?._id) {
        navigate(`/clubs/${item._id}`);
      } else {
        console.error('Club ID not found:', item);
      }
    } else {
      setSelectedBook(item);
    }
  };

  const renderRankAvatar = (index) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#3498db', '#27ae60']; // Gold, Silver, Bronze, Blue, Green
    return (
      <span 
        className="rank-badge" 
        style={{ backgroundColor: colors[index] || '#95a5a6' }}
      >
        {index + 1}
      </span>
    );
  };

  const tabItems = [
    {
      key: 'most-visited',
      label: '🔥 Most Visited Books',
      children: (
        <Spin spinning={loading}>
          <List
            dataSource={data}
            renderItem={(book, index) => (
              <List.Item onClick={() => handleItemClick(book)} style={{ cursor: 'pointer' }}>
                <List.Item.Meta
                  avatar={renderRankAvatar(index, book)}
                  title={book.title}
                  description={`Reads: ${book.reads}`}
                />
              </List.Item>
            )}
          />
        </Spin>
      ),
    },
    {
      key: 'highest-rated',
      label: '⭐ Highest Rated Books',
      children: (
        <Spin spinning={loading}>
          <List
            dataSource={data}
            renderItem={(book, index) => (
              <List.Item onClick={() => handleItemClick(book)} style={{ cursor: 'pointer' }}>
                <List.Item.Meta
                  avatar={renderRankAvatar(index, book)}
                  title={book.title}
                  description={`Rating: ${book.averageRating} ⭐`}
                />
              </List.Item>
            )}
          />
        </Spin>
      ),
    },
    {
      key: 'most-discussed',
      label: '💬 Most Discussed Books',
      children: (
        <Spin spinning={loading}>
          <List
            dataSource={data}
            renderItem={(book, index) => (
              <List.Item onClick={() => handleItemClick(book)} style={{ cursor: 'pointer' }}>
                <List.Item.Meta
                  avatar={renderRankAvatar(index, book)}
                  title={book.title || "Unknown Book"}
              description={`Comments: ${book.commentCount ?? 0}`}
                />
              </List.Item>
            )}
          />
        </Spin>
      ),
    },
    {
      key: 'most-members',
      label: '👥 Clubs with Most Members',
      children: (
        <Spin spinning={loading}>
          <List
            dataSource={data}
            renderItem={(club, index) => (
              <List.Item onClick={() => handleItemClick(club)} style={{ cursor: 'pointer' }}>
                <List.Item.Meta
                  avatar={<Avatar style={getRankStyle(index)}>{index + 1}</Avatar>}
                  title={club.name}
                  description={`Members: ${club.memberCount}`}
                />
              </List.Item>
            )}
          />
        </Spin>
      ),
    },
  ];

  return (
    <div>
      <Header />
      <div className="ranking-container">
        <div className="ranking-header">
          <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#2c3e50' }}>📊 Top Rankings</h1>
          <Select
            className="time-range-select"
            defaultValue="weekly"
            onChange={setTimeRange}
            style={{ width: 120 }}
          >
            <Select.Option value="weekly">Weekly</Select.Option>
            <Select.Option value="monthly">Monthly</Select.Option>
            <Select.Option value="yearly">Yearly</Select.Option>
          </Select>
        </div>

        <div className="ranking-content">
          <div className="ranking-list">
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={tabItems}
            />
          </div>

          {selectedBook && selectedBook.title ? (
            <div className="book-card-sidebar">
              <div className="close-btn" onClick={() => setSelectedBook(null)}>✖</div>
              <BookCard book={selectedBook} />
            </div>
          ) : selectedBook ? (
            <p className="error-message">⚠️ Error: Book data not available</p>
          ) : null}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RankingPage;