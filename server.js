import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { MongoClient, ServerApiVersion } from 'mongodb';
import puppeteer from 'puppeteer';
import getProfs from './scraper.js';
import routes from './routes.js'

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


getProfs().catch(console.error);

const app = express();
const PORT = 5000;

app.use('/',routes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
