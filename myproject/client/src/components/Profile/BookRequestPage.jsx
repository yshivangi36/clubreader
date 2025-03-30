import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { BiBookAdd } from 'react-icons/bi';
import Header from '../Header';
import Footer from '../Footer';

const RequestContainer = styled.div`
max-width: 700px;
margin: 2rem auto;
padding: 2rem;
background: #fff;
border-radius: 12px;
box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2rem;
  font-weight: bold;
  color: #333;
`;

const RequestForm = styled.form`
display: flex;
flex-direction: column;
background: #f9f9f9;
padding: 1.5rem;
border-radius: 8px;
box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  resize: none;
  height: 80px;
  margin-bottom: 1rem;
`;

const SubmitButton = styled.button`
  background: #007bff;
  color: white;
  font-size: 1rem;
  padding: 10px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;

  &:hover {
    background: #0056b3;
  }
`;

const StatusCard = styled.div`
  background: ${props => 
    props.status === 'accepted' ? '#d4edda' :
    props.status === 'rejected' ? '#f8d7da' : '#fff3cd'};
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    font-size: 1rem;
`;

const BookRequestPage = () => {
  const [requestText, setRequestText] = useState('');
  const [requests, setRequests] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    axios.get('http://localhost:8080/api/book-requests', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setRequests(res.data));
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!requestText.trim()) {
      alert("Book title cannot be empty!");
      return;
    }
    axios.post('http://localhost:8080/api/book-requests', 
    { bookTitle: requestText }, 
    { headers: { Authorization: `Bearer ${token}` , "Content-Type": "application/json" }
    }).then(() => {
      setRequestText('');
      // Refresh requests
      axios.get('http://localhost:8080/api/book-requests', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => setRequests(res.data));
    }).catch(error => {
      console.error("Request Submission Error:", error.response?.data || error.message);
    });
  };

  return (
    <div>
      <Header />
      <RequestContainer>
        <Title>Request a Book</Title>
        
        <RequestForm onSubmit={handleSubmit}>
          <TextArea
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            placeholder="Enter book title.."
            required
          />
          <SubmitButton type="submit">
            <BiBookAdd size={20} style={{ marginRight: "8px" }} />
            Submit Request
          </SubmitButton>
        </RequestForm>

        <h2 style={{ marginTop: '2rem' }}>Your Requests</h2>
        {requests.length > 0 ? (
          requests.map(request => (
            <StatusCard key={request._id} status={request.status}>
              <p><strong>{request.bookTitle}</strong></p>
              <p>Status: <strong>{request.status}</strong></p>
              {request.status === "Rejected" && request.reason && (
                <p><strong>Reason:</strong> {request.reason}</p>
              )}
            </StatusCard>
          ))
        ) : (
          <p>No book requests yet.</p>
        )}
      </RequestContainer>
      <Footer />
    </div>
  );
};

export default BookRequestPage;