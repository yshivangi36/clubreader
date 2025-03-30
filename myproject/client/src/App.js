import React, { useState, useEffect,useCallback } from 'react';
import axios from 'axios';
import {Route,Routes,Navigate, useNavigate } from "react-router-dom";
import Modal from 'react-modal';
import Main from "./components/Main/Homepage";
import Survey from "./components/Main/Survey";
import Signup from "./components/Signup";
import Login from "./components/Login";
import Home from "./Home/Home";
import GenrePage from "./components/Genre/GenrePage";
import Club from "./components/Club/Club";
import Profile from "./components/Profile/Profile";
import Chat from "./components/Chat/Chat";
import About from "./components/About";
import RankingPage from "./components/Ranking/RankingPage";

import Admin from "./pages/Admin";
import BookRequestPage from "./components/Profile/BookRequestPage";

import UserRequestsPage from './pages/UserRequestsPage';
import AdminRequestsPage from './pages/AdminRequestsPage';
import AdminClubsPage from "./components/Club/AdminClubsPage";

const RequireSurvey = ({ children }) => {
	const navigate = useNavigate();
	const [surveyCompleted, setSurveyCompleted] = useState(false);
  
	const checkSurveyStatus = useCallback(async () => {
		try {
			const token = localStorage.getItem("token");
		  const userId = localStorage.getItem("userId");
		  console.log("Retrieved User ID:", userId);

		  if (!userId || !token) {
			return;
		  }
	  
		  const response = await axios.get(`http://localhost:8080/api/users/${userId}`, {
			headers: {
			  Authorization: `Bearer ${token}`
			}
		  });
		  
		  if (!response.data.surveyCompleted) {
			navigate('/survey');
		  } else {
			setSurveyCompleted(true);
		  }
		} catch (error) {
		  console.error('Survey check error:', error);
		  localStorage.clear();
		}
	  },[navigate]);

	useEffect(() => {
	if (localStorage.getItem("token")) {
		checkSurveyStatus();
	}
	}, [checkSurveyStatus]);
  
	return surveyCompleted ? <Navigate to="/main" /> : children;
};

function App() {
  const user = localStorage.getItem("token");
  //const userId = localStorage.getItem("userId");
  const isAdmin = localStorage.getItem("isAdmin") === "true"; 

  Modal.setAppElement('#root');

	return (

		<Routes>
			<Route path="/" element={<Home />}/>
			{user && <Route path="/main" element={isAdmin ? <Navigate to="/profile" /> : <Main />} />}
			<Route path="/survey" element={isAdmin ? <Navigate to="/profile" /> : <RequireSurvey><Survey /></RequireSurvey>} />
			<Route path="/signup" exact element={<Signup />} />
			<Route path="/login" exact element={<Login />} />
			<Route path="*" element={<Navigate replace to="/login" />} />
			<Route path="/genre" exact element={<GenrePage />}/>
			<Route path="/club" exact element={isAdmin ? (<Navigate to="/admin/clubs" replace />
				) : (
				<Club /> 
			) } />
			<Route path="/profile" exact element={<Profile />} />
			<Route path="/chat/:clubId" exact element={<Chat />} />
			<Route path="/about" exact element={isAdmin ? <Navigate to="/profile" /> : <About />}  />
			<Route path="/ranking" exact element={<RankingPage />} />
			{isAdmin && <Route path="/admin" exact element={<Admin />} />}
			{user && <Route path="/requests" exact element={<BookRequestPage />} />}
			<Route path="!" element={<Navigate replace to="/profile" />} />
			<Route path="/user/requests" element={<UserRequestsPage />} />
			<Route path="/admin/requests" element={<AdminRequestsPage />} />
			<Route path="/admin/clubs" element={<AdminClubsPage />} />
		</Routes>
	);
}
export default App;
