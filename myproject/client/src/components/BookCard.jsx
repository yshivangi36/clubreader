import React, { useState, useEffect, useCallback, useRef } from "react";
import "./BookCard.css";
import axios from "axios";
import { FcDownload } from "react-icons/fc";
import { FaBookmark, FaBookOpen,FaTrash, FaEdit, 
  FaTimes, FaUser, FaRegCommentDots, FaPlus, FaMinus,
  FaUndo, FaRedo, FaList, FaCompress, FaExpand } from "react-icons/fa";
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const BookCard = ({ book, isAdmin, onDelete, onUpdate }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [commentsList, setCommentsList] = useState([]);
  const [ratingCount, setRatingCount] = useState(0);
  const [showRatingSuccess, setShowRatingSuccess] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [, setTotalPages] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...book });
  const [error, setError] = useState('');
  const [isUpdating, ] = useState(false);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [scale, setScale] = useState(1.2);
  const [allPages, ] = useState([]);
  const containerRef = useRef(null);
  const [pagePositions, setPagePositions] = useState([]);
  const [isPdfReady, setIsPdfReady] = useState(false);
  const [rotation, setRotation] = useState(0);
  const isMountedRef = useRef(false);
  const [tocItems, setTocItems] = useState([]);
  const [tocVisible, setTocVisible] = useState(false); 
  const isProgrammaticScroll = useRef(false);
  const userScrollInterrupted = useRef(false);
  const [, setSelection] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const renderTasks = useRef(new Map());

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const navigateToPage = (page) => {
    const validatedPage = Math.max(1, Math.min(numPages, page));
    setPageNumber(validatedPage);
    scrollToPage(validatedPage);
    setTocVisible(false);
  };

  // PDF Controls
  const handleZoomIn = () => {
    setScale(prev => Math.min(3, prev + 0.2));
  };
  
  const handleZoomOut = () => {
    setScale(prev => Math.max(0.5, prev - 0.2));
  };

  const rotateLeft = () => {
    setRotation(prev => (prev - 90) % 360);
  };
  
  const rotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  const updatePagePositions = useCallback((pages, scale) => {
    const positions = [];
    let totalHeight = 0;
    
    pages.forEach((page) => {
      const viewport = page.getViewport({ scale, rotation });
      positions.push(totalHeight);
      totalHeight += viewport.height + 40; 
    });
    
    setPagePositions(positions);
  }, [rotation]); 

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const renderPage = useCallback(async (currentScale = scale) => {
    if (!pdfDocument) return;
    if (!isMountedRef.current) return;

    try {
      renderTasks.current.forEach(task => task.cancel());
      renderTasks.current.clear();

      const container = containerRef.current;
      if (!container) return;

      const newPagePositions = [];
      let totalHeight = 0;

      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: currentScale, rotation });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const task = page.render({ canvasContext: context, viewport });
      renderTasks.current.push(i, task);
      await task.promise;

        newPagePositions.push(totalHeight);
        totalHeight += viewport.height + 40;
      }

      if (isMountedRef.current) {
        setPagePositions(newPagePositions);
        setIsPdfReady(true);
      }
    } catch (error) {
      if (error.name === 'RenderingCancelledException') {
        console.log('Rendering intentionally cancelled');
        return;
      }
      console.error("Failed to render PDF pages:", error);
      toast.error("Failed to render PDF pages");
    }
  }, [pdfDocument, scale, rotation]);

  useEffect(() => {
    if (pdfDocument) {
      
      renderPage();
    }
  }, [pdfDocument, renderPage]);
    
    useEffect(() => {
      if (pdfDocument && allPages.length > 0) {
        updatePagePositions(allPages, scale);
        renderPage();
      }
    }, [rotation, pdfDocument, allPages, scale, updatePagePositions, renderPage]);
    
    useEffect(() => {
      return () => {
        renderTasks.current.forEach(task => task.cancel());
        renderTasks.current.clear();
      };
    }, []);


  const renderPdfPage = async (canvas, pageNumber) => {
    if (!canvas || !pdfDocument) return;
  
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const context = canvas.getContext("2d");
  
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (renderTasks.current.has(pageNumber)) {
        renderTasks.current.get(pageNumber).cancel();
        renderTasks.current.delete(pageNumber);
      }
    
      const renderTask = page.render({ canvasContext: context, viewport });
      renderTasks.current.set(pageNumber, renderTask);
  
      await renderTask.promise;
      renderTasks.current.delete(pageNumber); 
    } catch (error) {
      if (error.name !== "RenderingCancelledException") {
        console.error("Error rendering PDF page:", error);
      }
    }
  };

  useEffect(() => {
    const debouncedRender = debounce(() => {
      if (isMountedRef.current && isPdfReady) renderPage();
    }, 500);
  
    const currentContainer = containerRef.current; // Capture current value
    const observer = new ResizeObserver(debouncedRender);
  
    if (currentContainer) {
      observer.observe(currentContainer);
    }
  
    return () => {
      observer.disconnect();
      debouncedRender.cancel();
      // Cleanup using captured value
      if (currentContainer) {
        observer.unobserve(currentContainer);
      }
    };
  }, [renderPage, isPdfReady]);

  const debounce = (func, wait) => {
    let timeout;
    const debounced = (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
  };

  const scrollToPage = useCallback((pageNum) => {
    if (!containerRef.current || !pagePositions.length) return;

    const pageIndex = pageNum - 1;
    if (pageIndex < 0 || pageIndex >= pagePositions.length) return;

    containerRef.current.scrollTo({
      top: pagePositions[pageIndex],
      behavior: 'smooth'
    });
  }, [pagePositions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
  
    const handleUserScroll = () => {
      if (isProgrammaticScroll.current) {
        userScrollInterrupted.current = true;
        isProgrammaticScroll.current = false;
        const scrollTop = container.scrollTop + 50;
        const currentPage = pagePositions.findIndex(pos => pos > scrollTop);
        setPageNumber(currentPage === -1 ? pagePositions.length : currentPage + 1);
      }
    };
  
    container.addEventListener('wheel', handleUserScroll);
    container.addEventListener('touchmove', handleUserScroll);
  
    return () => {
      container.removeEventListener('wheel', handleUserScroll);
      container.removeEventListener('touchmove', handleUserScroll);
    };
  }, [pagePositions]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
  
    const handleWheel = (e) => {
      userScrollInterrupted.current = true;
      isProgrammaticScroll.current = false;
    };
  
    container.addEventListener('wheel', handleWheel);
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    if (isPdfReady && pagePositions.length > 0 && pageNumber <= pagePositions.length) {
      if (containerRef.current) { // Add null check here
        const scrollTop = pagePositions[pageNumber - 1];
        containerRef.current.scrollTo({
          top: scrollTop,
          behavior: 'auto'
        });
      }
    }
  }, [pagePositions, pageNumber, isPdfReady]);

  const handlePageChange = (e) => {
    const inputPage = parseInt(e.target.value);
    if (!isNaN(inputPage)) {
      const validPage = Math.max(1, Math.min(numPages, inputPage));
      setPageNumber(validPage);
      scrollToPage(validPage);
    }
  };

  useEffect(() => {
    setAverageRating(book?.averageRating || 0);
}, [book]);

useEffect(() => {
  setFormData({ ...book });
}, [book]);

useEffect(() => {
  const fetchPageCount = async () => {
    try {
      if (book?.pdfUrl) {
        const response = await axios.get(`http://localhost:8080/api/books/${book._id}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` } 
        });
        setTotalPages(response.data.pageCount);
      }} catch (error) {
        console.error('Error fetching page count:', error);
        if (error.response?.status === 401) {
          alert('Please login to view book details');
        }
      }
  };
  if (book && token) { 
    fetchPageCount();
  }
}, [book, token]);

const fetchCommentsAndRatings = useCallback(async () => {
  try {
    const [bookRes, commentsRes, bookmarkRes] = await Promise.all([
      axios.get(`http://localhost:8080/api/books/${book._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`http://localhost:8080/api/books/${book._id}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get(`http://localhost:8080/api/books/${book._id}/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]);

    const userBookmark = bookmarkRes.data.find(b => b.userId.toString() === userId.toString());
    if (userBookmark) {
      setPageNumber(userBookmark.page);
      setIsBookmarked(true);
    }
    
    const userRating = bookRes.data.ratings.find(r =>  r.userId.toString() === userId.toString());
    
    setHasRated(!!userRating);
    setSelectedRating(userRating?.rating || 0);

    setAverageRating(bookRes.data.averageRating || 0);
    setRatingCount(bookRes.data.ratingCount || 0);
    setCommentsList(commentsRes.data.filter(c => c && c._id && c.user && c.text));
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}, [book?._id, userId, token]); 

useEffect(() => {
  if (isModalOpen) {
    fetchCommentsAndRatings();
  }
}, [isModalOpen, fetchCommentsAndRatings]);

const fetchPdf = useCallback(async () => {
  if (!book?._id || !token) return;
  const abortController = new AbortController();

  try {
    setIsPdfLoading(true);
    const response = await axios.get(`http://localhost:8080/api/books/${book._id}/pdf`, {
      responseType: "arraybuffer",
      headers: { Authorization: `Bearer ${token}` },
      signal: abortController.signal
    });

    if (!isMountedRef.current) return;

    const pdf = await pdfjsLib.getDocument({ data: response.data }).promise;
    console.log("Fetched PDF successfully:", pdf);
    setPdfDocument(pdf);
    setNumPages(pdf.numPages);
    setIsPdfLoading(false);
  } catch (error) {
    if (error.name === 'CanceledError') return;
    console.error("PDF Load Error:", error);
    setIsPdfLoading(false);
  } finally {
    if (isMountedRef.current) setIsPdfLoading(false);
  }

  return () => abortController.abort();
},[book?._id, token]);

useEffect(() => {
  if (isModalOpen) {
    fetchPdf(); 
  }
}, [isModalOpen, fetchPdf]); 

useEffect(() => {
  if (!isModalOpen) {
    setIsPdfFullscreen(false);
  }
}, [isModalOpen]);

//handling submit button of rating
const handleRatingSubmit = async () => {
  if (!token || !userId) {
    alert('Please login to rate books');
    return;
  }
  if (hasRated) {
    alert('You have already rated this book!');
    return;
  }
  if (!selectedRating) {
    alert('Please select a rating before submitting');
    return;
  }

  try {
    setIsSubmittingRating(true);
    const response = await axios.post(
      `http://localhost:8080/api/books/${book._id}/rate`,
      { rating: selectedRating },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setHasRated(true);
    setSelectedRating(response.data.userRating);
    setAverageRating(response.data.averageRating);
    setRatingCount(response.data.ratingCount);

    setShowRatingSuccess(true);
    setTimeout(() => setShowRatingSuccess(false), 3000);

  } catch (error) {
    if (error.response?.status === 409) {
      setHasRated(true);
      setSelectedRating(error.response.data.existingRating);
    } else {
      console.error("Rating error:", error);
      alert(`Rating failed: ${error.response?.data?.error || 'Server error'}`);
    }
  } finally {
    setIsSubmittingRating(false);
  }
};

const StarRating = ({ rating, onRate, disabled = false }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const stars = [1, 2, 3, 4, 5];

  const handleRate = (star) => {
    setIsProcessing(true);
    onRate(star);
    setTimeout(() => setIsProcessing(false), 1000); // Debounce clicks
  };
  
  return (
    <div className="star-rating">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          className={`star ${star <= rating ? 'active' : ''}`}
          onClick={() => !disabled && !isProcessing && handleRate(star)}
          disabled={disabled || isProcessing}
          aria-label={`Rate ${star} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
};

  // Add useEffect to check saved status
useEffect(() => {
  const checkSavedStatus = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/users/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && Array.isArray(response.data)) {
        setIsSaved(response.data.some(fav => fav._id? fav._id.toString() === book._id.toString() : false));
      }
    } catch (error) {
      console.error("Error checking saved status:", error);
    }
  };
  
  if ( token) checkSavedStatus();
}, [book._id, token]);

// Add toggle handler
const handleToggleSave = async () => {
  if (!userId || !token) {
    toast.alert('Please login to save books');
    return;
  }

  try {
    const response = await axios.post(
      `http://localhost:8080/api/users/toggle-favorite`,
      { bookId: book._id },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    setIsSaved(response.data.inFavorites);

    if (response.data.inFavorites) {
      toast.success('📚 Book saved for later!');
    } else {
      toast.success('Book removed from saved list.');
    }
  } catch (error) {
    console.error("Save error:", error);
    toast.error('Error saving book');
  }
};

useEffect(() => {
  const fetchToc = async () => {
    if (!book?._id) return;

    try {
      const response = await axios.get(
        `http://localhost:8080/api/books/${book._id}/toc`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data?.length > 0) {
        const validToc = response.data.filter(item => 
          Number.isInteger(item.page) && item.title?.trim()
        );
        setTocItems(validToc);
      }
    } catch (error) {
      console.error("TOC fetch error:", error);
      setTocItems([]);
    }
  };

  if (isModalOpen && book?._id && token) {
    fetchToc();
  }
}, [isModalOpen, book?._id, token]);

useEffect(() => {
  const handleSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      setSelection({
        text: sel.toString(),
        rects: Array.from(sel.getRangeAt(0).getClientRects())
      });
    }
  };

  document.addEventListener('selectionchange', handleSelection);
  return () => document.removeEventListener('selectionchange', handleSelection);
}, []);

//download pdf
const handleDownloadPDF = async () => {
  try {
    const response = await axios.get(`http://localhost:8080/api/books/${book._id}/pdf`, {
      responseType: 'blob',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000) // 15 second timeout
    });

    const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${book.title}.pdf`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }, 100);
    } catch (error) {
      if (error.name !== 'CanceledError') {
        setError('Failed to download PDF: ' + error.message);
        toast.error('PDF download failed');
      }
  }
};

  //hadle comment submit button
  const handleSubmitComment = async () => {
    if (!comment.trim()) return;
    if (!userId) {
      alert('Please login to comment');
      return;
    }
    try {
      const res = await axios.post(
        `http://localhost:8080/api/books/${book._id}/comments`,
        { text: comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Comment submitted successfully:", res.data); // Debugging
      
      setCommentsList(prev => [res.data, ...prev]);
      setComment("");
      toast.success('✅ Comment added successfully!');
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast.error('❌ Failed to add comment.');
    }
  };

  if (!book) return null;

  // Bookmark handling
const handleBookmark = async () => {
  try {
    await axios.post(
      `http://localhost:8080/api/books/${book._id}/bookmarks`,
      { page: pageNumber },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setIsBookmarked(!isBookmarked);
    toast.success(`Successfully Bookmarked page ${pageNumber}!`);
  } catch (error) {
    console.error("Bookmark error:", error);
    toast.error("Failed to bookmark page!");
  }
};

const handleDelete = async () => {
  const token = localStorage.getItem("token"); 

    if (!token) {
        alert("You must be logged in to delete a book.");
        return;
    }

  if (window.confirm('Are you sure you want to delete this book?')) {
    try {
      await axios.delete(`http://localhost:8080/api/books/${book._id}/admin` , {
         headers: { Authorization: `Bearer ${token}`,
         "Content-Type": "application/json" 
         }
      });
      if (onDelete) {
        onDelete(book._id); 
      }
      setIsModalOpen(false);
      toast.success("Successfully deleted book");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to delete book');
      toast.error("Delete error:", error);
    }
  }
};

const handleUpdate = async () => {
  try {
    const updatedBook = {
      ...formData,
      genres: Array.isArray(formData.genres) ? 
        formData.genres : 
        formData.genres.split(',').map(g => g.trim())
    };

    const response = await axios.put(`http://localhost:8080/api/books/${book._id}/admin`,
      updatedBook,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    setIsEditing(false);
    if (onUpdate) {
      onUpdate(response.data); // Update parent state with new data
    }
    fetchCommentsAndRatings(); // Refresh local data
    setError('');
    toast.success("Successfully Updated book");
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to update book. Please check your inputs.';
    setError(errorMessage);
    toast.error("Update error:", error.response?.data);
  }
};

const renderPDFViewer = () => (
  <div className={`book-modal ${isPdfFullscreen ? 'fullscreen' : ''}`}>
    <div className="pdf-viewer-container">
    {isPdfLoading && (
        <div className="pdf-loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading PDF content...</p>
        </div>
      )}
      <div className="pdf-controls">
        <div className="left-controls">
          <button 
            onClick={() => setTocVisible(!tocVisible)}
            aria-label="Toggle table of contents"
          >
            <FaList />
          </button>
          <div className="page-navigation">
            <span>Page: </span>
            <input
              type="number"
              min="1"
              max={numPages || 1}
              value={pageNumber}
              onChange={handlePageChange}
              className="page-input"
              disabled={!numPages}
            />
            <span> of {numPages || "Loading..."}</span>
          </div>                
        </div>
        
        <div className="center-controls">
          <button onClick={handleZoomOut}><FaMinus /></button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={handleZoomIn}><FaPlus /></button>
          <button onClick={rotateLeft}><FaUndo /></button>
          <button onClick={rotateRight}><FaRedo /></button>
          <button 
            onClick={handleBookmark} 
            className={isBookmarked ? 'active' : ''}
          >
            <FaBookmark />
          </button>
        </div>

        <div className="right-controls">
        <button onClick={handleDownloadPDF}>
            <FcDownload />
          </button>
          <button onClick={() => setIsPdfFullscreen(!isPdfFullscreen)}>
            {isPdfFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
          <button onClick={() => {setIsModalOpen(false);}}>
          <FaTimes />
          </button>
        </div>
      </div>

      <div className="pdf-content-container">
      {tocVisible && (
        <div className="toc-sidebar">
          <h3>Table of Contents</h3>
          {tocItems.length === 0 ? (
            <div className="toc-empty">No table of contents available</div>
          ) : (
            tocItems.map((item, index) => (
              <div
                key={index}
                className="toc-item"
                onClick={() => navigateToPage(item.page)}
              >
                <span className="page-marker">Pg. {item.page}</span>
                <span className="toc-title">{item.title}</span>
              </div>
            ))
          )}
        </div>
      )}
      {pdfDocument && (
         <div className="pdf-pages-container">
            {[...Array(numPages)].map((_, i) => (
      <canvas key={i} ref={(el) => el && renderPdfPage(el, i + 1)} />
    ))}
        </div>
      )}
      </div>
    </div>
  </div>
);

  return (
    <>
    {showRatingSuccess && (
      <div className="rating-success-popup">
        ✓ Successfully rated {selectedRating} stars!
      </div>
    )}
      <div className="compact-book-card" onClick={() => setIsModalOpen(true)}>
        <div className="compact-card-image">
          <img 
            src={`http://localhost:8080${book.coverImage}`} 
            alt={book.title}
            onError={(e) =>{
            e.target.src = '/placeholder-book.jpg';
            e.target.style.objectFit = 'contain';
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <h4 className="compact-card-title">{book.title}</h4>
        </div>

      {isModalOpen && (
        <div className="book-modal-overlay">
          <div className="book-modal">
          {!isPdfFullscreen ? (
            <>
            <button 
              className="close-modal" 
              onClick={() => setIsModalOpen(false)}
              >
              <FaTimes />
            </button>
            {isEditing ? (
              <div className="edit-form">
                <h2>Edit Book Details</h2>
                {error && <div className="error-banner">{error}</div>}
                <div className="form-group">
                  <label>Title:</label>
                  <input
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Author:</label>
                  <input
                    value={formData.author}
                    onChange={(e) => setFormData({...formData, author: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Genres:</label>
                  <input
                    value={Array.isArray(formData.genres) ? formData.genres.join(', ') : formData.genres}
                    onChange={(e) => {
                      const genres = e.target.value.split(',').map(g => g.trim());
                      if (genres.length <= 5) { // Limit to 5 genres
                        setFormData({...formData, genres});
                      }
                    }}
                    placeholder="Comma-separated genres (max 5)"
                  />
                  <div className="input-hint">Example: Fiction, Classic, Historical</div>
                </div>
                <div className="form-actions">
                  <button 
                  onClick={handleUpdate}
                  disabled={isUpdating}>
                    {isUpdating ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button onClick={() => {
                    setIsEditing(false);
                    setFormData({ ...book });
                  }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>

               <div className="book-info-card">
               {isAdmin && (
                <div className="card-admin-controls">
                  <button 
                    className="edit-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true); 
                    }}
                    aria-label="Edit book"
                  >
                    <FaEdit className="icon" />
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    aria-label="Delete book"
                  >
                    <FaTrash className="icon" />
                  </button>
                </div>
              )}
              <div className="modal-image">
                <img 
                  src={`http://localhost:8080${book.coverImage}`} 
                  alt={book.title}
                  onError={(e) => e.target.src = '/placeholder-book.jpg'}
                />
              </div>
                
              <div className="modal-details">
                <h1 className="book-title">{book.title}</h1>
                
                <p className="book-author">By {book.author}</p>

                <div className="genre-pills">
                  {book?.genres?.map((genre, index) => (
                    <span key={genre._id || index} className="genre-pill">
                    {typeof genre === 'object' ? genre.name : genre}
                  </span>
                  ))}
                </div>
        
                <div className="average-rating">
                  <h3>Ratings</h3>
                  <div className="rating-display">
                    <div className="star-value">
                      <span className="average">{averageRating.toFixed(1)}</span>
                      <StarRating 
                        rating={Math.round(averageRating)}
                        onRate={() => {}}
                        disabled
                      />
                    </div>
                    <span className="rating-count">({ratingCount} People Rated)</span>
                  </div>
                </div><br></br>

                <h3>About the Book</h3>
                <div className="description-content">
                <p className={`description ${isExpanded ? 'expanded' : ''}`}>
                  {isExpanded ? book.description : `${book.description.slice(0, 150)}...`}
                </p>
                {book.description.length > 100 && (
                  <button className="toggle-description" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? "Show Less" : "Read More"}
                  </button>
                )}
                </div>
                {!isAdmin && (
                <div className="action-buttons">
                  <button 
                    className="read-button"
                    onClick={() => setIsPdfFullscreen(true)}
                  >
                    <FaBookOpen /> Read Now
                  </button>
                  <button 
                    className={`save-btn ${isSaved ? 'saved' : ''}`}
                    onClick={handleToggleSave}
                  >
                    <FaBookmark /> {isSaved ? "Saved" : "Save to Read Later"}
                  </button>
                </div>
                )}
              </div>
              </div>

            {!isAdmin && (
            <div className="community-card">
            <div className="ratings-comments-box">
              <div className="user-rating">
                {hasRated ? (
                  <div className="rating-confirmation">
                    <div className="star-display">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`star ${i < selectedRating ? 'filled' : ''}`}>
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="rated-message">
                      ✓ You rated this {selectedRating} stars
                    </div>
                  </div>
                ) : (
                  <div className="rating-input">
                    <StarRating 
                      rating={selectedRating}
                      onRate={setSelectedRating}
                    />
                    <button
                      className="submit-rating"
                      onClick={handleRatingSubmit}
                      disabled={!selectedRating || isSubmittingRating}
                      >
                      {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </div>  
                )}
              </div>
              
              <p className="comment-notice">Your comments and ratings will help other readers to make their choices</p>
              <div className="comments-section">
                <h3><FaRegCommentDots /> Community Discussions ({commentsList.length})</h3>
                
                <div className="comment-input">
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows="3"
                  />
                  <button 
                    className="submit-comment" 
                    onClick={handleSubmitComment}
                    disabled={!comment.trim()}
                  >
                    Post Comment
                  </button>
                </div><br></br>

              <div className="comments-list">
                {commentsList.map(comment => (
                  comment && comment.text && ( 
                <div key={comment._id} className="comment-card">
                  <div className="user-info">
                    {comment.user?.avatar ? (
                      <img 
                        src={`http://localhost:8080${comment.user.avatar}`} 
                        alt="Profile" 
                        className="user-avatar"
                        style={{ width: '50px', height: '50px' }} 
                      />
                      ) : (
                        <FaUser className="user-avatar" style={{ fontSize: '16px' }}/>
                      )}
                      <div className="user-details">
                        <span className="username">
                          {comment.user?.UserName || 'Anonymous'}
                        </span>
                        <span className="comment-time">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                  </div>
                  <p className="comment-text">{comment.text}</p>
                </div>
                  )
                ))}
              </div>
              </div>
              </div>
            </div>
            )}
            </>
            )}
            </>
          ):
            renderPDFViewer()}
          </div>
      <ToastContainer position="top-center" />
      </div>
)}
</>
 );
};

export default BookCard;