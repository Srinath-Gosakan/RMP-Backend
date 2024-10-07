import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer from 'puppeteer';

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

    try {
        await client.connect();
        const db = client.db("profDetails");
        const collection = db.collection("professors");

        // Check if professors already exist in the database
        const existingProfessors = await collection.find({}).toArray();
        if (existingProfessors.length > 0) {
            console.log('Professor details already exist in the database. No need to scrape.');
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
            console.log('Inserted:', profData);
        }

    } finally {
        await client.close(); // Ensure the client is closed after operations
    }

    await browser.close();
};

// Run the scraping task once
getProfs().catch(console.error);

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/images', express.static(path.join(__dirname, 'images')));

// Endpoint to get all professor details
app.get('/professors', async (req, res) => {
    try {
        await client.connect();
        const db = client.db("profDetails");
        const collection = db.collection("professors");
        
        // Retrieve all professor details from the collection
        const professors = await collection.find({}).toArray();

        // Convert image data to base64
        const professorsWithImages = professors.map(prof => ({
            profID: prof.profID,
            profName: prof.profName,
            image: `data:${prof.image.contentType};base64,${prof.image.data.toString('base64')}`
        }));

        res.json(professorsWithImages);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving professor details');
    } finally {
        await client.close(); // Ensure the client is closed after operations
    }
});

app.get('/', (req, res) => {
    res.send('Server is up and running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
