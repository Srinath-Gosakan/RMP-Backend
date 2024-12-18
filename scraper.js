// import puppeteer from 'puppeteer';
import cloudinary from 'cloudinary';
import Professor from './model.js';
import dotenv from 'dotenv';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

dotenv.config();

// Log Cloudinary configuration
console.log('Cloudinary Config:', {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to scrape and save data
const scrapeAndSave = async () => {
    let browser;
    try {
        await Professor.deleteMany({});  // Clear existing professors

        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        await page.goto("https://www.sastra.edu/staffprofiles/schools/soc.php", {
            waitUntil: "networkidle0", // Wait for the network to be idle
        });

        const profDetails = await page.evaluate(() => {
            const cardList = document.querySelectorAll(".card");
            return Array.from(cardList).map((card) => {
                const imageSrc = new URL(card.querySelector("img").src, window.location.href).href; // Ensure absolute URL
                const profID = imageSrc.split('/').pop().split('.').shift();
                const profName = card.querySelector("h1") ? card.querySelector("h1").innerText : "Unknown";
                return { profID, imageSrc, profName };
            });
        });

        console.log("Scraped Professor Details:", profDetails);

        // Process each professor's details
        for (const prof of profDetails) {
            const { profID, imageSrc, profName } = prof;

            const existingProfessor = await Professor.findOne({ profID });
            if (existingProfessor) {
                continue;
            }

            // Upload image to Cloudinary
            const cloudinaryRes = await cloudinary.uploader.upload(imageSrc, {
                folder: 'professor_images', // Optional: Add folder name in Cloudinary
            });

            console.log("Cloudinary Response:", cloudinaryRes);

            // Save professor details to the database
            const professor = new Professor({
                profID,
                name: profName,
                image: cloudinaryRes.public_id,  // Store Cloudinary public_id
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

        // Generate the image URL from Cloudinary
        const imageUrl = cloudinary.url(professor.image, {
            width: 500,  // Adjust width if needed
            height: 500,  // Adjust height if needed
            crop: 'fill',  // Optional: Crop the image to fit
        });

        return imageUrl;  // Return the Cloudinary URL
    } catch (err) {
        console.error("Error retrieving image by profID:", err);
        throw err;
    }
};

export { scrapeAndSave, getImageByProfID };
