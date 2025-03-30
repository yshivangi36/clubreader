// Frontend: AdminDashboard.jsx
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import styled, { keyframes } from 'styled-components';
import { FiUploadCloud, FiImage, FiFileText, FiX  } from 'react-icons/fi';
import Header from "../../src/components/Header";
import Footer from "../components/Footer";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;
const DashboardContainer = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  min-height: 100vh;
  padding: 2rem;
  color: #fff;
  display: grid;
  place-items: center;
`;

const UploadCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 2.5rem;
  width: 100%;
  max-width: 800px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.1);
  animation: ${fadeIn} 0.6s ease-out, ${float} 6s ease-in-out infinite;
`;

const DropZone = styled.div`
  border: 2px dashed ${props => props.$isDragAccept ? '#4CAF50' : '#e94560'};
  padding: 2.5rem 2rem;
  text-align: center;
  border-radius: 15px;
  transition: all 0.3s ease;
  margin-bottom: 2rem;
  background: ${props => props.$isDragActive ? 'rgba(233,69,96,0.1)' : 'transparent'};
  cursor: pointer;
  position: relative;
  overflow: hidden;
  &:hover {
    border-color: #ff6b6b;
    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, 
        rgba(233,69,96,0.1) 0%, 
        rgba(42,45,62,0.2) 100%);
    }
  }
`;

const GenreGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.8rem;
  margin: 1rem 0;
`;

const GenreButton = styled.button`
  background: ${props => props.selected ? '#e94560' : 'rgba(255,255,255,0.1)'};
  border: 1px solid ${props => props.selected ? '#e94560' : 'rgba(255,255,255,0.2)'};
  color: ${props => props.selected ? '#fff' : 'rgba(255,255,255,0.8)'};
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(233,69,96,0.3);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const InputField = styled.input`
  width: 100%;
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px #e94560;
    background: rgba(255,255,255,0.15);
  }
`;

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const LoadingSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  border-top-color: transparent;
  animation: ${rotate} 0.8s linear infinite;
`;

const SubmitButton = styled.button`
  background: #e94560;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;

  &:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
  }

  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const FilePreview = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: center;
  flex-wrap: wrap;
`;

const PreviewItem = styled.div`
  background: rgba(255,255,255,0.1);
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Admin = () => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    genres: []
  });
  const [files, setFiles] = useState({
    coverImage: null,
    bookPdf: null
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const image = acceptedFiles.find(f => f.type.startsWith('image/'));
    const pdf = acceptedFiles.find(f => f.type === 'application/pdf');

    if (!image || !pdf) {
      setError('Please upload both a cover image and PDF file');
      return;
    }

    setFiles({
      coverImage: Object.assign(image, { preview: URL.createObjectURL(image) }),
      bookPdf: pdf
    });
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragAccept } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    maxFiles: 2,
    validator: file => {
      if (!file.type.match(/(image\/.*|application\/pdf)/)) {
        return 'Invalid file type';
      }
      return null;
    }
  });

  const genresList = [
    'Fiction', 'Non-Fiction', 'Mystery', 'Science Fiction',
    'Fantasy', 'Romance', 'Thriller', 'Biography', 'Classic', 'Historical', 
    'Horror'
  ];

  const toggleGenre = (genre) => {
    setFormData(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  // Frontend: AdminDashboard.jsx (Enhanced Error Handling)
const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError('');

  try {
    // Validate form data before submission
    if (!formData.title || !formData.author || !formData.description || formData.genres.length === 0) {
      throw new Error('All fields are required');
    }

    if (!files.coverImage || !files.bookPdf) {
      throw new Error('Please upload both cover image and PDF file');
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('author', formData.author);
    data.append('description', formData.description);
    data.append('genres', JSON.stringify(formData.genres));
    data.append('coverImage', files.coverImage);
    data.append('bookPdf', files.bookPdf);

    const response = await axios.post('http://localhost:8080/api/books/books', data, {
      headers: { 
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      timeout: 60000 // 1 minute timeout
    });

    if (response.status === 201) {
      setFormData({ title: '', author: '', description: '', genres: [] });
      setFiles({ coverImage: null, bookPdf: null });
      alert('Book uploaded successfully!');
    }
  } catch (err) {
    const errorMessage = err.response?.data?.error ||
      err.message ||
      'Upload failed. Please check your connection and try again.';
    
    setError(errorMessage);
    
    if (errorMessage.includes('token') || errorMessage.includes('authentication')) {
      // Handle authentication errors
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <div>      
      <Header />
    <DashboardContainer>
      <UploadCard>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Upload New Book</h1>
        
        <form onSubmit={handleSubmit}>
          <DropZone {...getRootProps()} $isDragActive={isDragActive} $isDragAccept={isDragAccept}>
            <input {...getInputProps()} />
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              <FiUploadCloud />
            </div>
            <p>Drag & drop files here, or click to select</p>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              (One cover image and one PDF file)
            </p>
          </DropZone>

          {error && <p style={{ color: '#ff6b6b', textAlign: 'center' }}>{error}</p>}

          <FilePreview>
            {files.coverImage && (
              <PreviewItem>
                <FiImage />
                <span>{files.coverImage.name}</span>
                <FiX onClick={() => setFiles(prev => ({ ...prev, coverImage: null }))} />
              </PreviewItem>
            )}<br></br>
            {files.bookPdf && (
              <PreviewItem>
                <FiFileText />
                <span>{files.bookPdf.name}</span>
              </PreviewItem>
            )}
          </FilePreview>

          <FormGroup>
            <InputField
              type="text"
              placeholder="Book Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <InputField
              type="text"
              placeholder="Author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <InputField
              as="textarea"
              placeholder="Description"
              rows="4"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </FormGroup>

          <FormGroup>
            <label>Select Genres</label>
            <GenreGrid>
              {genresList.map(genre => (
                <GenreButton
                  type="button"
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  selected={formData.genres.includes(genre)}
                >
                  {genre}
                  {formData.genres.includes(genre) && ' ✓'}
                </GenreButton>
              ))}
            </GenreGrid>
          </FormGroup>

          <SubmitButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
              <>
                <LoadingSpinner />
                Uploading...
              </>
            ) : (
              'Publish Book 🚀'
            )}
          </SubmitButton>
        </form>
      </UploadCard>
    </DashboardContainer>
    <Footer/>
    </div>
  );
};

export default Admin;