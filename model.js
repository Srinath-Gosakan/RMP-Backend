import mongoose from 'mongoose';

// Define the professor schema
const professorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    profID: { type: String, required: true, unique: true },
    image: { type: String },  // Store Cloudinary public_id as a string
    rating: { type: Number, default: 2.5 },
    feedback: { type: [String], default: [] },
});

// Create and export the model
const Professor = mongoose.model('Professor', professorSchema);

export default Professor;
