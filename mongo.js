import mongoose from 'mongoose';

// Define the professor schema
const professorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    profID: { type: String, required: true, unique: true },
    image: { type: mongoose.Schema.Types.ObjectId, ref: 'uploads.files' },
    rating: { type: Number, default: 2.5 },
    feedback: { type: [String], default: [] },
});

// Create and export the model
const Professor = mongoose.model('Professor', professorSchema);

export default Professor;
