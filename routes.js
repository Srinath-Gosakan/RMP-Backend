import express from 'express';
import passport from 'passport';
import { scrapeAndSave, getImageByProfID } from './scraper.js';
import { Professor, Student } from './model.js';

const createRouter = () => {
  const router = express.Router();

  // LOGIN SUCCESS — create Student if not exists
  router.get('/login/success', async (req, res) => {
    console.log('Session:', req.session);
    console.log('User:', req.user);
    if (!req.user) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    try {
      const email = req.user.emails?.[0]?.value;
      const name = req.user.displayName;
      const registerNumber = email.split('@')[0];

      let student = await Student.findOne({ email });
      if (!student) {
        student = new Student({
          name,
          email,
          professorReviewed: [],
          registerNumber,
          professorRatings: [],
          professorFeedbacks: [],
        });
        await student.save();
        console.log('New student created:', email);
      }

      res.status(200).json({
        message: 'Login successful',
        user: req.user,
      });
    } catch (err) {
      console.error('Login success error:', err);
      res.status(500).json({ message: 'Internal server error during login success' });
    }
  });

  // LOGIN FAILED
  router.get('/login/failed', (req, res) => {
    res.status(401).json({ message: 'Login failed. Please try again.' });
  });

  // AUTH ROUTES
  router.get('/auth/google', passport.authenticate('google', ['profile', 'email']));

  router.get(
    '/auth/google/callback',
    passport.authenticate('google', {
      successRedirect: process.env.CLIENT_URL,
      failureRedirect: `${process.env.CLIENT_URL}/login-failed`,
    })
  );

  // LOGOUT
  router.get('/auth/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: 'Logged out' });
    });
  });

  // GET ALL PROFESSORS
  router.get('/professors', async (req, res) => {
    try {
      const professors = await Professor.find();
      res.status(200).json(professors);
    } catch (error) {
      console.error('Error fetching professors:', error);
      res.status(500).json({ message: 'Error fetching professors', error: error.message });
    }
  });

  // SCRAPE & SAVE
  router.post('/scrape', async (req, res) => {
    try {
      await scrapeAndSave();
      res.status(200).json({ message: 'Data scraped and saved successfully.' });
    } catch (error) {
      console.error('Error in scrape route:', error);
      res.status(500).json({ message: 'Error scraping data', error: error.message });
    }
  });

  // GET PROFESSOR BY ID
  router.get('/professor/:id', async (req, res) => {
    try {
      const professor = await Professor.findOne({ profID: req.params.id });
      if (!professor) {
        return res.status(404).json({ message: 'Professor not found.' });
      }
      res.status(200).json(professor);
    } catch (error) {
      console.error('Error retrieving professor details:', error);
      res.status(500).json({ message: 'Error retrieving professor details', error: error.message });
    }
  });

  // GET PROFESSOR IMAGE
  router.get('/professor/:id/image', async (req, res) => {
    try {
      const imageUrl = await getImageByProfID(req.params.id);
      res.status(200).json({ imageUrl });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving image', error: error.message });
    }
  });

  // RATE A PROFESSOR
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
      const student = await Student.findOne({ email });

      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const index = student.professorReviewed.findIndex(
        (profRef) => profRef.toString() === professor._id.toString()
      );

      let message = '';
      const oldCount = professor.feedback.length;

      if (index !== -1) {
        const oldRating = student.professorRatings[index];
        professor.rating = ((professor.rating * oldCount) - oldRating + rating) / oldCount;

        professor.feedback[index] = feedback;
        student.professorRatings[index] = rating;
        student.professorFeedbacks[index] = feedback;

        message = 'Rating updated successfully';
      } else {
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
      console.error('Error in rating professor:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
  });

  // GET RATING + FEEDBACK FOR LOGGED-IN USER
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

  // GET REVIEWED PROFESSORS BY LOGGED-IN STUDENT
  router.get('/reviewed', async (req, res) => {
    if (!req.user) {
        return res.status(403).json({ message: 'Login required to view reviewed professors' });
    }

    const email = req.user.emails?.[0]?.value;
        try {
            const student = await Student.findOne({ email }).populate('professorReviewed');
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
            const reviewedProfessors = student.professorReviewed.map((prof, idx) => ({
                profID: prof.profID,
                name: prof.name,
                rating: student.professorRatings[idx],
                feedback: student.professorFeedbacks[idx],
            }));

            res.status(200).json(reviewedProfessors);
        } catch (error) {
            console.error('Error fetching reviewed professors:', error);
            res.status(500).json({ message: 'Internal server error', error: error.message });
        }
  });

  // DELETE REVIEW
  router.delete('/review/:profID', async (req, res) => {
    if (!req.user) {
        return res.status(403).json({ message: 'Login required' });
    }

    const { profID } = req.params;
    const email = req.user.emails?.[0]?.value;

    try {
        const professor = await Professor.findOne({ profID });
        if (!professor) return res.status(404).json({ message: 'Professor not found' });

        const student = await Student.findOne({ email });
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const index = student.professorReviewed.findIndex(
          (profRef) => profRef.toString() === professor._id.toString()
        );

        if (index === -1) {
            return res.status(400).json({ message: 'Review not found for this professor' });
        }

        // Remove feedback & rating from student
        student.professorReviewed.splice(index, 1);
        const oldRating = student.professorRatings.splice(index, 1)[0];
        student.professorFeedbacks.splice(index, 1);

        // Adjust professor's rating and feedback
        const feedbackIndex = professor.feedback.findIndex(
            (text) => text === professor.feedback[index]
        );
        if (feedbackIndex !== -1) {
            professor.feedback.splice(feedbackIndex, 1);
        }

        const count = professor.feedback.length + 1;
        professor.rating = count > 1?((professor.rating * count) - oldRating) / (count - 1): 1.0;

        await professor.save();
        await student.save();

        res.status(200).json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // ROOT ROUTE
  router.get('/', (req, res) => {
    res.status(200).json({ message: 'Welcome to the Professor Rating API' });
  });

  return router;
};

export default createRouter;
