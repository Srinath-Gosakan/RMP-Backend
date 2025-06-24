import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import session from 'express-session';
import createRouter from './routes.js';
import './passport.js';

dotenv.config();
const app = express();
const PORT = 8080;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log(err));

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL, 
  credentials: true,               
}));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, 
        sameSite: 'none',
        secure: true
    },
}));
app.use(passport.initialize());
app.use(passport.session());


// Use the routes
app.use('/api', createRouter());

// Start the server
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
