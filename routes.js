import express from 'express';
import { scrapeAndSave, getImageByProfID } from './scraper.js';
import Professor from './model.js';

const createRouter = () => {
    const router = express.Router();

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
