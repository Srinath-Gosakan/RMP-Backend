import express from 'express';
import passport from 'passport';
import { scrapeAndSave, getImageByProfID } from './scraper.js';
import { Professor, Student } from './model.js';

const createRouter = () => {
    const router = express.Router();

    // POST: Submit or update rating and feedback for a professor
    router.post('/rate/:profID', async (req, res) => {
        if (!req.user) {
            return res.status(403).json({ message: 'Login required to rate professors' });
        }

        const { rating, feedback } = req.body;
        const { profID } = req.params;

        if (!rating || !feedback) {
            return res.status(400).json({ message: 'Rating and feedback are required' });
        }

        try {
            const professor = await Professor.findOne({ profID });
            if (!professor) {
                return res.status(404).json({ message: 'Professor not found' });
            }

            const email = req.user.emails?.[0]?.value;
            const name = req.user.displayName;

            let student = await Student.findOne({ email });
            if (!student) {
                student = new Student({ name, email });
            }

            const index = student.professorReviewed.findIndex(
                (profRef) => profRef.toString() === professor._id.toString()
            );

            let message = '';
            const oldCount = professor.feedback.length;

            if (index !== -1) {
                // Student has already rated this professor — update it
                const oldRating = student.professorRatings[index];

                // Update professor's average rating
                professor.rating = ((professor.rating * oldCount) - oldRating + rating) / oldCount;

                // Update feedback in professor and student
                professor.feedback[index] = feedback;
                student.professorRatings[index] = rating;
                student.professorFeedbacks[index] = feedback;

                message = 'Rating updated successfully';
            } else {
                // New rating
                professor.feedback.push(feedback);
                professor.rating = ((professor.rating * oldCount) + rating) / (oldCount + 1);

                student.professorReviewed.push(professor._id);
                student.professorRatings.push(rating);
                student.professorFeedbacks.push(feedback);

                message = 'Rating submitted successfully';
            }

            await professor.save();
            await student.save();

            res.status(200).json({ message });
        } catch (error) {
            console.error("Error in rating professor:", error);
            res.status(500).json({ message: 'Internal Server Error', error: error.message });
        }
    });

    // GET: Fetch existing rating and feedback by student
    router.get('/rate/:profID', async (req, res) => {
        if (!req.user) {
            return res.status(403).json({ message: 'Login required' });
        }

        const { profID } = req.params;
        const email = req.user.emails?.[0]?.value;

        try {
            const professor = await Professor.findOne({ profID });
            if (!professor) {
                return res.status(404).json({ message: 'Professor not found' });
            }

            const student = await Student.findOne({ email });
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            const index = student.professorReviewed.findIndex(
                (profRef) => profRef.toString() === professor._id.toString()
            );

            if (index === -1) {
                return res.status(200).json({ rated: false });
            }

            const rating = student.professorRatings[index];
            const feedback = student.professorFeedbacks[index];

            return res.status(200).json({
                rated: true,
                rating,
                feedback,
            });
        } catch (error) {
            console.error('Error fetching user rating:', error);
            return res.status(500).json({ message: 'Server error', error: error.message });
        }
    });

    //login success route
    router.get('/login/success', (req, res) => {
        if (req.user) {
            res.status(200).json({
                message: 'Login successful',
                user: req.user,
            });
        } else {
            res.status(403).json({ message: 'Unauthorized' });
        }
    });
    
    //login failed route
    router.get('/login/failed', (req, res) => {
        res.status(401).json({ message: 'Login failed. Please try again.' });
    });

    // Google authentication route
    router.get('/auth/google/callback', passport.authenticate('google', {
        successRedirect: process.env.CLIENT_URL,
        failureRedirect: `${process.env.CLIENT_URL}/login-failed`,
        })
    );

    router.get('/auth/google', passport.authenticate('google', ['profile', 'email']));

    //logout route
    router.get('/auth/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) return next(err);
            res.status(200).json({ message: 'Logged out' }); // no redirect!
        });
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

    //Generic route
    router.get('/', (req, res) => {
        res.status(200).json({ message: 'Welcome to the Professor Rating API' });
    });

    return router;
};

export default createRouter;
