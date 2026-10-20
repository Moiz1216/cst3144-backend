const express = require("express");
const path = require("path");

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

// Simple route to check the server is running
app.get("/", (req, res) => {
    res.json({ message: "CST3144 After School Lessons API is running" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
