// Fills the database with the starting lessons and teachers.
// Run with:  npm run seed
// WARNING: this deletes everything already in the lesson, teacher and order collections.

const { connectToDatabase } = require("./db");

const lessons = [
    { topic: "Math",      location: "Hendon",        price: 100, space: 5, image: "math.svg",      icon: "fa-calculator" },
    { topic: "English",   location: "Colindale",     price: 80,  space: 5, image: "english.svg",   icon: "fa-book" },
    { topic: "Science",   location: "Brent Cross",   price: 90,  space: 5, image: "science.svg",   icon: "fa-flask" },
    { topic: "Music",     location: "Golders Green", price: 95,  space: 5, image: "music.svg",     icon: "fa-music" },
    { topic: "Art",       location: "Hendon",        price: 70,  space: 5, image: "art.svg",       icon: "fa-paint-brush" },
    { topic: "Coding",    location: "Colindale",     price: 120, space: 5, image: "coding.svg",    icon: "fa-code" },
    { topic: "History",   location: "Mill Hill",     price: 75,  space: 5, image: "history.svg",   icon: "fa-university" },
    { topic: "Geography", location: "Edgware",       price: 85,  space: 5, image: "geography.svg", icon: "fa-globe" },
    { topic: "Sport",     location: "Finchley",      price: 60,  space: 5, image: "sport.svg",     icon: "fa-futbol-o" },
    { topic: "Spanish",   location: "Brent Cross",   price: 110, space: 5, image: "spanish.svg",   icon: "fa-language" }
];

// Each teacher teaches one or more lessons (listed by topic here,
// converted to the real lesson _id values after the lessons are inserted)
const teachers = [
    { firstName: "Sarah",  lastName: "Ahmed",  teaches: ["Math", "Coding", "Science"] },
    { firstName: "James",  lastName: "Wilson", teaches: ["English", "History"] },
    { firstName: "Maria",  lastName: "Garcia", teaches: ["Spanish", "Music", "Art"] },
    { firstName: "Daniel", lastName: "Okafor", teaches: ["Geography", "Sport"] }
];

async function seed() {
    const { client, db } = await connectToDatabase();
    try {
        await db.collection("lesson").deleteMany({});
        await db.collection("teacher").deleteMany({});
        await db.collection("order").deleteMany({});

        const result = await db.collection("lesson").insertMany(lessons);
        console.log(`Inserted ${result.insertedCount} lessons`);

        // insertMany adds an _id to each lesson object, so we can look them up by topic
        const teacherDocs = teachers.map(t => ({
            firstName: t.firstName,
            lastName: t.lastName,
            lessonIDs: t.teaches.map(topic => lessons.find(l => l.topic === topic)._id)
        }));
        const teacherResult = await db.collection("teacher").insertMany(teacherDocs);
        console.log(`Inserted ${teacherResult.insertedCount} teachers`);
    } finally {
        await client.close();
    }
}

seed().catch(err => {
    console.error("Seeding failed:", err.message);
    process.exit(1);
});
