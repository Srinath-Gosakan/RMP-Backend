import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import createRouter from './routes.js';

dotenv.config();
const app = express();
const PORT = 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.log(err));

// Middleware
app.use(express.json());
app.use(cors());

// Use the routes
app.use('/api', createRouter());

// Start the server
app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
