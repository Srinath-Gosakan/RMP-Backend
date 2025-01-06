import express from 'express';
import passport from 'passport';
import { scrapeAndSave, getImageByProfID } from './scraper.js';
import { Professor, Student } from './model.js';

const createRouter = () => {
    const router = express.Router();

    // Google OAuth login and callback routes
    router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
        // Check if the user's email domain is '@sastra.ac.in'
        const userEmail = req.user.emails[0].value; // Get the user's email from Google

        if (userEmail.endsWith('@sastra.ac.in')) {
            // If the email is valid, allow the login and redirect to the homepage (or wherever you want)
            res.redirect('/');
        } else {
            // If the email doesn't have the correct domain, log the user out and redirect to the login page
            req.logout((err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error logging out' });
                }
                res.redirect('/login'); // Redirect to a login page or custom error page
            });
        }
    });

    // Logout route
    router.get('/logout', (req, res) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ message: 'Error logging out' });
            }
            res.redirect('/');
        });
    });

    // Check login status
    router.get('/auth/status', (req, res) => {
        if (req.isAuthenticated()) {
            res.json({ user: req.user });
        } else {
            res.json({ user: null });
        }
    });

    // Rating submission route
    router.post('/rate', async (req, res) => {
        const { studentId, profID, rating, feedback } = req.body;

        try {
            // Find the student
            const student = await Student.findById(studentId);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            // Check if student already rated this professor
            if (student.professorReviewed.includes(profID)) {
                return res.status(400).json({ message: 'You have already rated this professor' });
            }

            // Find the professor
            const professor = await Professor.findOne({ profID });
            if (!professor) {
                return res.status(404).json({ message: 'Professor not found' });
            }

            // Update professor's rating and feedback
            professor.rating = (professor.rating + rating) % 5;
            professor.feedback.push(feedback);

            // Update student data
            student.professorReviewed.push(profID);
            student.professorRatings.push(rating);
            student.professorFeedbacks.push(feedback);

            await professor.save();
            await student.save();

            res.status(200).json({ message: 'Rating submitted successfully' });
        } catch (err) {
            console.error('Error submitting rating:', err);
            res.status(500).json({ message: 'Server error' });
        }
    });

    // Get all professors
    router.get('/professors', async (req, res) => {
        try {
            const professors = await Professor.find();
            res.status(200).json(professors);
        } catch (error) {
            console.error("Error fetching professors:", error);
            res.status(500).json({ message: 'Error fetching professors', error: error.message });
        }
    });

    // Scrape and save professors
    router.post('/scrape', async (req, res) => {
        try {
            await scrapeAndSave();
            res.status(200).json({ message: 'Data scraped and saved successfully.' });
        } catch (error) {
            console.error("Error in scrape route:", error);
            res.status(500).json({ message: 'Error scraping data', error: error.message });
        }
    });

    // Get professor details by ID
    router.get('/professor/:id', async (req, res) => {
        try {
            const professor = await Professor.findOne({ profID: req.params.id });

            if (!professor) {
                return res.status(404).json({ message: 'Professor not found.' });
            }

            res.status(200).json(professor);
        } catch (error) {
            console.error("Error retrieving professor details:", error);
            res.status(500).json({ message: 'Error retrieving professor details', error: error.message });
        }
    });

    // Get professor image by ID (Cloudinary URL)
    router.get('/professor/:id/image', async (req, res) => {
        try {
            const imageUrl = await getImageByProfID(req.params.id);
            res.status(200).json({ imageUrl });
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving image', error: error.message });
        }
    });

    return router;
};

export default createRouter;
