const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
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
// GET /search?q=text  ->  (challenge) full-text style search
// Returns every lesson where the text appears in the topic, location,
// price or space - the user does not choose which attribute.
// e.g. /search?q=a  matches "Math", "Hendon", ...
//      /search?q=10 matches price 100, 110 ...
// ---------------------------------------------------------------
app.get("/search", async (req, res, next) => {
    try {
        const q = (req.query.q || "").trim();
        if (q === "") {
            const all = await db.collection("lesson").find({}).toArray();
            return res.json(all);
        }

        // Escape characters like . * + ? so they are searched for literally
        const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safe, "i"); // "i" = ignore upper/lower case

        const results = await db.collection("lesson").find({
            $or: [
                { topic: regex },
                { location: regex },
                // price and space are numbers, so convert them to text first
                { $expr: { $regexMatch: { input: { $toString: "$price" }, regex: safe, options: "i" } } },
                { $expr: { $regexMatch: { input: { $toString: "$space" }, regex: safe, options: "i" } } }
            ]
        }).toArray();

        res.json(results);
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// POST /orders  ->  saves a new order in the "order" collection
// Expected body:
// {
//   "name": "Moiz",
//   "phone": "07123456789",
//   "lessonIDs": ["<lesson _id>", "<lesson _id>"],
//   "spaces": [2, 1]          <- spaces[i] = spaces booked for lessonIDs[i]
// }
// ---------------------------------------------------------------
app.post("/orders", async (req, res, next) => {
    try {
        const { name, phone, lessonIDs, spaces } = req.body;

        // Same checks as the front-end: letters only / numbers only
        if (typeof name !== "string" || !/^[A-Za-z ]+$/.test(name.trim())) {
            return res.status(400).json({ error: "Name must contain letters only" });
        }
        if (typeof phone !== "string" || !/^[0-9]+$/.test(phone.trim())) {
            return res.status(400).json({ error: "Phone must contain numbers only" });
        }
        if (!Array.isArray(lessonIDs) || lessonIDs.length === 0 ||
            !lessonIDs.every(id => ObjectId.isValid(id))) {
            return res.status(400).json({ error: "lessonIDs must be a non-empty array of lesson ids" });
        }
        if (!Array.isArray(spaces) || spaces.length !== lessonIDs.length ||
            !spaces.every(n => Number.isInteger(n) && n > 0)) {
            return res.status(400).json({ error: "spaces must be positive whole numbers, one per lesson" });
        }

        const order = {
            name: name.trim(),
            phone: phone.trim(),
            lessonIDs: lessonIDs.map(id => new ObjectId(id)),
            spaces: spaces,
            createdAt: new Date()
        };

        const result = await db.collection("order").insertOne(order);
        res.status(201).json({ message: "Order saved", orderId: result.insertedId });
    } catch (err) {
        next(err);
    }
});

// ---------------------------------------------------------------
// PUT /lessons/:id  ->  updates ANY attribute(s) of one lesson
// The body holds the fields to change, set to their new values, e.g.
//   { "space": 3 }                       (set spaces to exactly 3)
//   { "price": 95, "location": "Hendon" } (change several fields)
// After an order the front-end sends the new number of spaces.
// ---------------------------------------------------------------
app.put("/lessons/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid lesson id" });
        }

        const updates = { ...req.body };
        delete updates._id; // the _id of a document can never be changed
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Request body must contain at least one field to update" });
        }

        // $set replaces the given fields with the new values
        const updatedLesson = await db.collection("lesson").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: "after" }
        );

        if (!updatedLesson) {
            return res.status(404).json({ error: "Lesson not found" });
        }
        res.json({ message: "Lesson updated", lesson: updatedLesson });
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
