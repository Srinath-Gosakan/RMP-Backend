import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';
import cron from 'node-cron';
import puppeteer from 'puppeteer';
import fs from 'fs';

const uri = "mongodb+srv://gosakan003:Srinath2003@cluster0.1x41k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        await client.close();
    }
}

run().catch(console.dir);

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

    // Connect to the MongoDB database and insert the data
    try {
        await client.connect();
        const db = client.db("profDetails"); // Use the database name here
        const collection = db.collection("professors"); // Create a collection to store the data
        
        // Insert the scraped data into the collection
        await collection.insertMany(profDetails);
        console.log('Professors details inserted into MongoDB:', profDetails);
        
    } finally {
        await client.close(); // Ensure the client is closed after operations
    }

    // Download images
    for (const objs of profDetails) {
        const { profID, imageSrc, profName } = objs;
        const imagePage = await page.goto(imageSrc);
        fs.writeFile(path.join('./images', `image_${imageSrc.split('/').pop()}`), await imagePage.buffer(), () => console.log('Image Downloaded!'));
    }

    await browser.close();
};

// Schedule the scraping task to run every 6 months
cron.schedule('0 0 1 */6 *', () => {
    console.log('Running the scraping task...');
    getProfs().catch(console.error);
});

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
