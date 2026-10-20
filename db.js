const { MongoClient } = require("mongodb");

// Connects to MongoDB Atlas using the native MongoDB Node.js driver.
// The connection string is kept in an environment variable (MONGODB_URI)
// so the password is never written in the code or pushed to GitHub.
async function connectToDatabase() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error("MONGODB_URI environment variable is not set");
    }

    const client = new MongoClient(uri);
    await client.connect();

    const db = client.db(process.env.DB_NAME || "afterschool");
    console.log(`Connected to MongoDB database: ${db.databaseName}`);
    return { client, db };
}

module.exports = { connectToDatabase };
