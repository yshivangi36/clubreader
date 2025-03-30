import { useEffect, useState } from 'react';
import axios from 'axios';

const AdminProfile = () => {
  const [requests, setRequests] = useState([]);
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    description: '',
    cover: null
  });

  useEffect(() => {
    fetchBookRequests();
  }, []);

  const fetchBookRequests = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/admin/requests', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      await axios.put(`http://localhost:8080/api/admin/requests/${requestId}`, 
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }
      );
      fetchBookRequests();
    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  const handleFileUpload = (e) => {
    setNewBook({...newBook, cover: e.target.files[0]});
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newBook.title);
    formData.append('author', newBook.author);
    formData.append('description', newBook.description);
    formData.append('cover', newBook.cover);

    try {
      await axios.post('http://localhost:8080/api/admin/books', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      setNewBook({ title: '', author: '', description: '', cover: null });
    } catch (error) {
      console.error('Error uploading book:', error);
    }
  };

  return (
    <div className="admin-profile">
      <h1>Admin Dashboard</h1>
      
      {/* Book Upload Section */}
      <div className="book-upload-section">
        <h2>Upload New Book</h2>
        <form onSubmit={handleBookSubmit}>
          <input
            type="text"
            placeholder="Title"
            value={newBook.title}
            onChange={(e) => setNewBook({...newBook, title: e.target.value})}
            required
          />
          <input
            type="text"
            placeholder="Author"
            value={newBook.author}
            onChange={(e) => setNewBook({...newBook, author: e.target.value})}
            required
          />
          <textarea
            placeholder="Description"
            value={newBook.description}
            onChange={(e) => setNewBook({...newBook, description: e.target.value})}
            required
          />
          <input type="file" onChange={handleFileUpload} accept="image/*" required />
          <button type="submit">Upload Book</button>
        </form>
      </div>

      {/* Book Requests Section */}
      <div className="book-requests">
        <h2>User Requests</h2>
        <div className="requests-list">
          {requests.map(request => (
            <div key={request._id} className="request-card">
              <h3>{request.bookTitle}</h3>
              <p>Requested by: {request.user.name}</p>
              <p>Status: <span className={`status-${request.status}`}>
                  {request.status}
                </span></p>
              
              <div className="request-actions">
                <button onClick={() => handleRequestAction(request._id, 'pending')}>
                  Mark as Pending
                </button>
                <button onClick={() => handleRequestAction(request._id, 'uploaded')}>
                  Mark as Uploaded
                </button>
                <button onClick={() => handleRequestAction(request._id, 'rejected')}>
                  Reject Request
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;