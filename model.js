import mongoose from 'mongoose';

// Professor schema as you already have
const professorSchema = new mongoose.Schema({
    name: { type: String, required: true },
    profID: { type: String, required: true, unique: true },
    image: { type: String },
    rating: { type: Number, default: 2.5 },
    feedback: { type: [String], default: [] },
});

// Student schema for managing ratings and feedback
const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    professorReviewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Professor' }],
    professorRatings: [{ type: Number }],
    professorFeedbacks: [{ type: String }],
});


// Create and export the models
const Professor = mongoose.model('Professor', professorSchema);
const Student = mongoose.model('Student', studentSchema);

export { Professor, Student };
