const express = require("express");
const path = require("path");
const { connectToDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------
// Logger middleware: prints every request to the server console.
// It waits for the response to finish so it can also log the
// status code and how long the request took.
// Example output:
//   [2026-10-20T14:05:12.345Z] GET /lessons -> 200 (12ms)
// ---------------------------------------------------------------
app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
        const time = new Date().toISOString();
        const duration = Date.now() - start;
        console.log(`[${time}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
        if (req.method === "POST" || req.method === "PUT") {
            console.log("  body:", JSON.stringify(req.body));
        }
    });
    next();
});

// ---------------------------------------------------------------
// CORS middleware: the front-end runs on GitHub Pages (a different
// domain), so the browser needs these headers before it will allow
// fetch() to call this server.
// ---------------------------------------------------------------
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    // The browser sends an OPTIONS "preflight" request before POST/PUT with JSON
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

// Parse JSON request bodies (used by the POST and PUT routes)
app.use(express.json());

// ---------------------------------------------------------------
// Static file middleware: serves lesson images from the "images"
// folder, e.g. GET /images/math.svg
// If the file does not exist, express.static calls next() and the
// second middleware sends back an error message instead.
// ---------------------------------------------------------------
const imagesDir = path.join(__dirname, "images");
app.use("/images", express.static(imagesDir));
app.use("/images", (req, res) => {
    res.status(404).json({ error: `Image not found: ${req.path}` });
});

// The database object is set once we have connected (see start() below)
let db;

// Simple route to check the server is running
app.get("/", (req, res) => {
    res.json({ message: "CST3144 After School Lessons API is running" });
});

// ---------------------------------------------------------------
// GET /lessons  ->  returns all lessons as JSON
// ---------------------------------------------------------------
app.get("/lessons", async (req, res, next) => {
    try {
        const lessons = await db.collection("lesson").find({}).toArray();
        res.json(lessons);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------
// Any route not matched above
app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Any error passed to next(err) in a route ends up here
app.use((err, req, res, next) => {
    console.error("Server error:", err.message);
    res.status(500).json({ error: "Internal server error" });
});

// Connect to MongoDB first, then start listening for requests
async function start() {
    try {
        const connection = await connectToDatabase();
        db = connection.db;
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Could not start server:", err.message);
        process.exit(1);
    }
}

start();
