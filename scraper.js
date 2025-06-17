import puppeteer from 'puppeteer';
import cloudinary from 'cloudinary';
import { Professor } from './model.js';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Helper: Delete all previous professor images from Cloudinary
const deleteOldCloudinaryImages = async () => {
    try {
        const { resources } = await cloudinary.v2.api.resources({
            type: 'upload',
            prefix: 'professor_images/',
            max_results: 500, // You can adjust this or paginate if needed
        });

        for (const resource of resources) {
            await cloudinary.v2.uploader.destroy(resource.public_id);
            console.log(`Deleted: ${resource.public_id}`);
        }
    } catch (err) {
        console.error("Error deleting old Cloudinary images:", err);
    }
};

// Function to scrape and save data
const scrapeAndSave = async () => {
    let browser;
    try {
        await Professor.deleteMany({}); // Clear MongoDB
        await deleteOldCloudinaryImages(); // 🧹 Clean up old Cloudinary images

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
        });

        const page = await browser.newPage();
        await page.goto("https://www.sastra.edu/staffprofiles/schools/soc.php", {
            waitUntil: "domcontentloaded",
            headless: false,
        });

        const profDetails = await page.evaluate(() => {
            const cardList = document.querySelectorAll(".card");
            return Array.from(cardList).map((card) => {
                const imageSrc = new URL(card.querySelector("img").src, window.location.href).href;
                const profID = imageSrc.split('/').pop().split('.').shift();
                const profName = card.querySelector("h1") ? card.querySelector("h1").innerText : "Unknown";
                const title = card.querySelector("b") ? card.querySelector("b").innerText : "Unknown";
                return { profID, imageSrc, profName, title };
            });
        });

        console.log("Scraped Professor Details:", profDetails);

        for (const prof of profDetails) {
            const { profID, imageSrc, profName, title } = prof;

            // Upload image to Cloudinary
            const cloudinaryRes = await cloudinary.v2.uploader.upload(imageSrc, {
                public_id: `professor_images/${profID}`, // Organized uploads
            });

            console.log("Uploaded to Cloudinary:", cloudinaryRes.public_id);

            const professor = new Professor({
                profID,
                name: profName,
                title,
                image: cloudinaryRes.public_id,
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
        const professor = await Professor.findOne({ profID });

        if (!professor || !professor.image) {
            throw new Error('Professor or image not found.');
        }

        const imageUrl = cloudinary.v2.url(professor.image, {
            width: 500,
            height: 500,
            crop: 'fill',
        });

        return imageUrl;
    } catch (err) {
        console.error("Error retrieving image by profID:", err);
        throw err;
    }
};

export { scrapeAndSave, getImageByProfID };
