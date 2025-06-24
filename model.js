import mongoose from 'mongoose';
const professorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  profID: { type: String, required: true, unique: true },
  image: { type: String },
  rating: { type: Number, default: 1.0 },
  feedback: { type: [String], default: [] },
});

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  registerNumber: { type: Number }, 
  professorReviewed: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Professor' }],
  professorRatings: [{ type: Number }],
  professorFeedbacks: [{ type: String }],
});

const Professor = mongoose.model('Professor', professorSchema);
const Student = mongoose.model('Student', studentSchema);

export { Professor, Student };
