import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer from 'puppeteer';
import express from 'express';
import path from 'path';

const uri = "mongodb+srv://gosakan003:Srinath2003@cluster0.1x41k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

const getProfs = async () => {
    const browser = await puppeteer.launch({
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

    try {
        await client.connect();
        const db = client.db("profDetails");
        const collection = db.collection("professors");

        // Check if professors already exist in the database
        const existingProfessors = await collection.find({}).toArray();
        if (existingProfessors.length > 0) {            
            return; // Exit the function if data already exists
        }

        // Insert the scraped data into the collection
        for (const prof of profDetails) {
            const { profID, imageSrc, profName } = prof;

            // Fetch image as binary data
            const imagePage = await page.goto(imageSrc);
            const imageBuffer = await imagePage.buffer();

            // Create an object to insert into the database
            const profData = {
                profID,
                profName,
                image: {
                    data: imageBuffer,
                    contentType: 'image/jpeg' // Adjust based on the image type if necessary
                }
            };

            await collection.insertOne(profData);
        }

    } finally {
        await client.close(); // Ensure the client is closed after operations
    }

    await browser.close();
};

export default getProfs;