const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies (used by the POST and PUT routes)
app.use(express.json());

// Simple route to check the server is running
app.get("/", (req, res) => {
    res.json({ message: "CST3144 After School Lessons API is running" });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
