const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");

const userSchema = new mongoose.Schema({
	UserName: { type: String, required: true, unique: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	avatar:{ type: String, default: "" },
	isAdmin: { type: Boolean, default: false },
	joinedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Club" }],
	createdAt: { type: Date, default: Date.now },
	bio: { type: String  },
	bookHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
	favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Book" }],
	notifications: [{
		message: { type: String, required: true },
		status: { 
		  type: String, 
		  enum: ["Pending", "Approved", "Rejected", 'unread', 'read'],
		  required: true 
		},
		reason: { type: String, default: "No reason provided" },
		createdAt: { type: Date, default: Date.now },
		viewed: { type: Boolean, default: false }
	  }],
	  surveyCompleted: { type: Boolean, default: false },
	  preferences: {
		gender: { type: String, default: '' },
		genres: { type: [String], default: [] },
		age: { type: String, default: '' },
		favoriteAuthor: { type: String, default: '' }
	  }
});

userSchema.methods.generateAuthToken = function () {
	const token = jwt.sign(
		{ _id: this._id ,
			email:this.email,
			isAdmin: this.isAdmin 
		}, process.env.JWTPRIVATEKEY, {
		expiresIn: "7d",
	});
	console.log(token);
	return token;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

const validate = (data) => {
	const schema = Joi.object({
		UserName: Joi.string().required().label("User Name"),
		email: Joi.string().email().required().label("Email"),
		password: passwordComplexity().required().label("Password"),
		bio: Joi.string().max(500).label("Bio"),
		isAdmin: Joi.boolean().default(false)
	});
	return schema.validate(data);
};

module.exports = { User, validate };