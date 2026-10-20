const { MongoClient } = require("mongodb");

// Connects to MongoDB Atlas using the native MongoDB Node.js driver.
// The connection string is kept in an environment variable (MONGODB_URI)
// so the password is never written in the code or pushed to GitHub.
async function connectToDatabase() {
    // trim() removes accidental spaces/new lines, the replace removes accidental quotes
    const uri = (process.env.MONGODB_URI || "").trim().replace(/^["']|["']$/g, "");
    if (!uri) {
        throw new Error("MONGODB_URI environment variable is not set");
    }
    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
        // only show the first few characters so the password is never logged
        throw new Error(`MONGODB_URI must start with "mongodb+srv://" but it starts with "${uri.slice(0, 12)}"`);
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(process.env.DB_NAME || "afterschool");
    console.log(`Connected to MongoDB database: ${db.databaseName}`);
    return { client, db };
}

module.exports = { connectToDatabase };
