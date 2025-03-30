const express = require("express");
const router = express.Router(); 
const authenticateToken = require("../middleware/authenticateToken");
const Book = require("../models/Book"); 

const getAvailableGenres = async () => {
    try {
      return await Book.distinct("genres");
    } catch (error) {
      console.error('Error fetching genres:', error);
      return [];
    }
  };

const bookQA = {
    greetings: {
      patterns: ["hi", "hello", "hey", "howdy"],
      responses: [
        "Welcome to BookBuddy! 📚 How can I help?",
        "Hello book lover! Need reading suggestions?"
      ],
      actions: ["Browse Books", "View Club"]
    },
    recommendations: {
      patterns: ["recommend", "suggest", "what should I read"],
      responses: [],
      actions: ["Fantasy", "Mystery", "Non-Fiction"]
    },
    clubs: {
      patterns: ["club", "group", "discuss"],
      responses: [
        "Join our active clubs: \n🔹 Mystery Readers \n🔹 Sci-Fi Fans \n🔹 Classic Literature",
        "Our book clubs meet every Thursday! Browse clubs →"
      ],
      actions: ["View Clubs"]
    },
    default: {
      responses: [
        "I'm here to help with: \n• Book recommendations \n• Club info \n• Reading tips",
        "Let's talk books! Ask me about: \n📖 Genres \n📚 Popular titles \n👥 Clubs"
      ],
      actions: ["Help", "Recommendations"]
    }
  };

  const getTopBooks = async (genre = null) => {
    try {
        const matchStage = { averageRating: { $gte: 4 }};
      
          if (genre) {
            matchStage.genres = {
                $elemMatch: {
                  $regex: new RegExp(genre, "i") // Case-insensitive regex search
                }
              };
          }
          return await Book.aggregate([
            { $match: matchStage },
            { $sort: { averageRating: -1, createdAt: -1 } },
            { $limit: 3 },
            { $project: { 
              title: 1, 
              author: 1, 
              genres: 1, 
              averageRating: 1
            }}
          ]);
        } catch (error) {
          console.error('Error fetching books:', error);
          return [];
        }
      };

  const matchCategory = async(message) => {
    const lowerMessage = message.toLowerCase();
    const availableGenres = await getAvailableGenres();  

    const detectedGenre = availableGenres.find(genre => {
        const genreRegex = new RegExp(`\\b${genre.toLowerCase()}\\b`, 'i');
        return genreRegex.test(lowerMessage);
      });    
    
      if (detectedGenre) return { category: 'genre', genre: detectedGenre };
    
      if (bookQA.greetings.patterns.some(p => lowerMessage.includes(p))) return { category: 'greetings' };
      if (bookQA.recommendations.patterns.some(p => lowerMessage.includes(p))) return { category: 'recommendations' };
      if (bookQA.clubs.patterns.some(p => lowerMessage.includes(p))) return { category: 'clubs' };
      return { category: 'default' };
    };
  
  router.post('/chat', authenticateToken, async(req, res) => {
    try {
      const {category, genre} = await matchCategory(req.body.message);
      let responseData = {...bookQA[category]};
      let topBooks = [];
      let suggestedGenres = [];

      if (category === 'genre') {
        topBooks = await getTopBooks(genre);
        suggestedGenres = (await getAvailableGenres())
        .filter(g => !g.toLowerCase().includes(genre.toLowerCase()))
        .slice(0, 5); 

        if (topBooks.length > 0) {
            responseData.responses = [
              `We found these ${genre} books:\n${topBooks.map((book, index) => 
                `${index + 1}. ${book.title} by ${book.author} (⭐ ${book.averageRating})`
              ).join('\n')}`
            ];
          } else {
            responseData.responses = [
              `No ${genre} books found. Try these genres: ${suggestedGenres.join(', ')}`
            ];
            responseData.actions = suggestedGenres;
          }
        }
        
        if (category === 'recommendations') {
          topBooks = await getTopBooks();
          responseData.responses = topBooks.length > 0 
            ? [`Our top-rated books:\n${topBooks.map((book, index) => 
                `${index + 1}. ${book.title} by ${book.author} (⭐ ${book.averageRating})`
              ).join('\n')}`]
            : ["Check out our new arrivals:\n1. The Midnight Library\n2. Project Hail Mary\n3. Circe"];
        }
    
        res.json({
          text: responseData.responses[Math.floor(Math.random() * responseData.responses.length)],
          actions: responseData.actions,
          books: topBooks,
          genre: category === 'genre' ? genre : null,
          suggestedGenres: category === 'genre' && topBooks.length === 0 ? suggestedGenres : null
        });
    
      } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
          text: "Let's talk books! What would you like to discuss?",
          actions: ["Recommendations", "Clubs", "Help"]
        });
      }
    });    

module.exports = router;