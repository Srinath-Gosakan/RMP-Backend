import puppeteer from 'puppeteer';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import Professor from './mongo.js';

let gfsBucket;

// Initialize GridFSBucket
const initializeGfsBucket = async () => {
    const conn = mongoose.createConnection(process.env.MONGO_URI);

    await new Promise((resolve, reject) => {
        conn.once('open', () => {
            const db = conn.db;
            gfsBucket = new GridFSBucket(db, { bucketName: 'uploads' });
            resolve();
        });
        conn.on('error', reject);
    });
};

// Function to scrape and save data
const scrapeAndSave = async () => {
    let browser;
    try {
        await initializeGfsBucket();
        
        await Professor.deleteMany({});

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
        });

        const page = await browser.newPage();
        await page.goto("https://www.sastra.edu/staffprofiles/schools/soc.php", {
            waitUntil: "domcontentloaded",
        });

        const profDetails = await page.evaluate(() => {
            const cardList = document.querySelectorAll(".card");
            return Array.from(cardList).map((card) => {
                const imageSrc = card.querySelector("img").src;
                const profID = imageSrc.split('/').pop().split('.').shift();
                const profName = card.querySelector("h1").innerText;
                return { profID, imageSrc, profName };
            });
        });

        for (const prof of profDetails) {
            const { profID, imageSrc, profName } = prof;

            const existingProfessor = await Professor.findOne({ profID });
            if (existingProfessor) {
                continue;
            }

            const imagePage = await page.goto(imageSrc);
            const imageBuffer = await imagePage.buffer();

            const uploadStream = gfsBucket.openUploadStream(`${Date.now()}-${profID}-image`, {
                contentType: 'image/jpeg', 
            });
            uploadStream.write(imageBuffer);
            uploadStream.end();

            const imageFileId = await new Promise((resolve, reject) => {
                uploadStream.on('finish', () => resolve(uploadStream.id));
                uploadStream.on('error', reject);
            });

            const professor = new Professor({
                profID,
                name: profName,
                image: imageFileId,
                rating: 2.5,
                feedback: [],
            });

            await professor.save();
        }
    } catch (err) {
        console.error("An error occurred while scraping and saving professor data:", err);
        throw err;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// Function to retrieve an image by profID
const getImageByProfID = async (profID) => {
    try {
        if (!gfsBucket) {
            await initializeGfsBucket(); // Ensure gfsBucket is initialized
        }

        const professor = await Professor.findOne({ profID });

        if (!professor || !professor.image) {
            throw new Error('Professor or image not found.');
        }

        // Find the file associated with the professor's image in GridFS
        const file = await gfsBucket.find({ _id: professor.image }).toArray();

        if (!file || !file[0]) {
            throw new Error('File not found in GridFS.');
        }

        if (!file[0].contentType || !file[0].contentType.startsWith('image')) {
            throw new Error('File is not an image or contentType is missing.');
        }

        return gfsBucket.openDownloadStream(file[0]._id); // Return the read stream
    } catch (err) {
        console.error("Error retrieving image by profID:", err);
        throw err;
    }
};

export { scrapeAndSave, getImageByProfID };
