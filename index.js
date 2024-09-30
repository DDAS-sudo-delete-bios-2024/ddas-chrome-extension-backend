const express = require("express");
const cors = require("cors");
const axios = require('axios');
const socketIo = require('socket.io');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');
const mime = require('mime-types');
const mongodb = require("mongodb")
const {MongoClient} = require("mongodb");
const crypto = require("crypto");
const {response} = require("express");
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let database;

//---------------------------------------
//            Middleware
//---------------------------------------
app.use(
    cors({})
);
app.use(express.json());

//---------------------------------------
//            Main Logic
//---------------------------------------


wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});


app.get("/",(req,res)=>{
    res.send("aman");
})

/**
 * check if exists in db
 */
app.post("/checkExistance",async (req,res)=>{
    const {url} = req.body;
    let hashUrl = url.replaceAll("/download?file", '/downloadHash?fileName');
    hashUrl = hashUrl + "&hashFile=hash.txt";

    try {
        const hash = await fetchHash(hashUrl);
        console.log("hash in api:", hash);

        const collection = database.collection(process.env.COLLECTION_NAME);
        const result = await collection.findOne({ hash: hash.trim() });  // Use the hash to find in DB

        console.log("result found in db for hash:", result);

        if (result != null) {
            // const updatedCount = result.count + 1;
            // collection.findOneAndUpdate({_id: result._id}, {$set:{count: updatedCount}});
            return res.status(200).json({ available: "true" });
        } else {
            return res.status(200).json({ available: "false" });
        }
    } catch (error) {
        console.error("Error in checkExistance:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/downloadFile",async (req,res)=>{
    console.log(req.body);
    const { url, fileName, mime : mimeType } = req.body;

    const extension = mime.extension(mimeType);
    const localFilePath = `./downloads/${cleanDownloadFilename(fileName)}`;

    try {
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });

        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;


        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            const progress = (downloadedLength / totalLength * 100).toFixed(2);

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ fileName, progress }));
                }
            });
        });

        const writer = fs.createWriteStream(localFilePath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            const fileName = cleanDownloadFilename(localFilePath.split('/').pop());
            console.log(fileName)
            res.status(200).send({ message: 'File downloaded successfully', fileNameOnServer: fileName });

            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.close(1000, 'File downloaded successfully');
                }
            });
        });

        writer.on('error', () => {
            res.status(500).send({ error: 'Failed to write file' });
        });

    } catch (error) {
        res.status(500).send({ error: 'Failed to download file' });
    }

    try {
        // get hash again and store in db
        let hashUrl = url.replaceAll("/download?file", '/downloadHash?fileName');
        hashUrl = hashUrl + "&hashFile=hash.txt";
        const hash = await fetchHash(hashUrl);
        console.log("hash fetched before putting item in db : ", hash);

        const collection = database.collection(process.env.COLLECTION_NAME);

        const documentToInsert = {
            filename: cleanDownloadFilename(fileName),
            serverUrl: url,
            hash: hash,
            timestamp: new Date(),
        };

        // Insert the document into the collection
        try {
            const result = await collection.insertOne(documentToInsert);
            console.log("Inserted document : ", result);
        } catch (error) {
            console.error("Error inserting document:", error);
        }

    } catch (error) {
        console.log(error);
        res.status(500).send({ error: 'Failed to download file' });
    }
})

/**
 * Download file from extension
 */
app.get('/download/from/backend/:fileName', (req, res) => {
    const filePath = `./downloads/${cleanDownloadFilename(req.params.fileName)}`;
    console.log('filepath : ', filePath);
    console.log('reached here');
    res.download(filePath, err => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Failed to send file');
        }
    });
});

/**
 * function removes (1) from filename as : filename (1)
 */
function cleanDownloadFilename(filename) {
    // regular expression to match duplicate suffix like " (1)", " (2)", etc., before the last extension
    const duplicatePattern = /(\s\(\d+\))(?=\.\w+$)/;

    // remove the duplicate suffix if it exists
    const ret = filename.replace(duplicatePattern, '');
    console.log("filename after cleaning: " + ret);
    return ret;
}

// starting the server =================================================================================================
startServer();

// ? FUNCTIONS =========================================================================================================
async function connectToDatabase() {
    try {
        const client = new MongoClient(process.env.MONGODB_URI);
        console.log("Connected to database");
        database = client.db(process.env.DATABASE_NAME);
    } catch (error) {
        console.log("error connecting to db " + error);
    }
}

// Start your application
async function startServer() {
    await connectToDatabase(); // Wait for the DB connection to establish

    server.listen(4000, () => {
        console.log('HTTP server listening on port 4000');
        console.log('WebSocket server running on ws://localhost:4000');
    });
}

async function fetchHash(hashUrl) {
    try {
        const response = await fetch(hashUrl, { method: "GET" });  // wait for the fetch call to complete
        const hash = await response.text();  // wait for the response to be parsed as text
        return hash;
    } catch (error) {
        console.log("Error fetching hash:", error);
        throw new Error("Website doesn't adhere to extension's API standards for proper working of extension: " + error);
    }
}
