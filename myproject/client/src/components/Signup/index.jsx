import React,{ useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import styles from "./styles.module.css";

const Signup = () => {
	const [data, setData] = useState({
		UserName: "",
		email: "",
		password: "",
	});
	const [error, ] = useState("");
	const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
	const navigate = useNavigate();

	const handleChange = ({ currentTarget: input }) => {
		setData({ ...data, [input.name]: input.value });
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const url = "http://localhost:8080/api/users";
			const { data: response }  = await axios.post(url, data);

			setPopupMessage("Registration successful!!");
            setIsSuccess(true);
            setShowPopup(true);

			setTimeout(() => {
				navigate(response.user.surveyCompleted ? '/' : '/survey');
			}, 1500);

        } catch (error) {
            const errorMessage = error.response?.data?.message || "Registration failed. Please try again.";
            
            setPopupMessage(errorMessage);
            setIsSuccess(false);
            setShowPopup(true);
        }
    };

	useEffect(() => {
        if (showPopup) {
            const timer = setTimeout(() => {
                setShowPopup(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showPopup]);

	return (
		<div className={styles.signup_container}>
			{showPopup && (
                <div className={`${styles.popup} ${isSuccess ? styles.success : styles.error}`}>
                    {popupMessage}
                </div>
            )}
			<div className={styles.signup_form_container}>
				<div className={styles.left}>
					<h1>Welcome Back</h1><br></br>
					<Link to="/login">
						<button type="button" className={styles.white_btn}>
							Sign in
						</button>
					</Link>
				</div>
				<div className={styles.right}>
					<form className={styles.form_container} onSubmit={handleSubmit}>
						<h1>Create Account</h1><br></br>
						<input
							type="text"
							placeholder="User Name"
							name="UserName"
							onChange={handleChange}
							value={data.UserName}
							required
							className={styles.input}
						/>
						<input
							type="email"
							placeholder="Email"
							name="email"
							onChange={handleChange}
							value={data.email}
							required
							className={styles.input}
						/>
						<input
							type="password"
							placeholder="Password"
							name="password"
							onChange={handleChange}
							value={data.password}
							required
							className={styles.input}
							autoComplete="new-password"
						/>
						{error && <div className={styles.error_msg}>{error}</div>}
						<button type="submit" className={styles.green_btn}>
							Sign Up
						</button>
					</form>
				</div>
			</div>
		</div>
	);
};

export default Signup;