import express from 'express';
import { MongoClient, ServerApiVersion } from 'mongodb';

const router = express.Router();
const uri = "mongodb+srv://gosakan003:Srinath2003@cluster0.1x41k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// Endpoint to get all professor details
router.get('/professors', async (req, res) => {
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

router.get('/', (req, res) => {
    res.send('Server is up and running!');
});

export default router;


