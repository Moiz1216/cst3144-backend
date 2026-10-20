# CST3144 After School Lessons – Express.js API

Back-end for the CST3144 coursework. Node.js + Express.js REST API, using the
**native MongoDB Node.js driver** (no Mongoose) to talk to MongoDB Atlas.

## Links
- GitHub repository: https://github.com/Moiz1216/cst3144-backend
- Render.com – all lessons: https://m01039431-after-school.onrender.com/lessons

## Files
| File | What it does |
|---|---|
| `server.js` | Express app: middleware + all routes |
| `db.js` | Connects to MongoDB using `MONGODB_URI` |
| `seed.js` | Resets the database with 10 lessons and 4 teachers |
| `images/` | Lesson images served by the static middleware |
| `postman/` | Postman collection with every request |

## Middleware
- **Logger** – prints `[time] METHOD /url -> status (ms)` for every request, plus the body for POST/PUT.
- **CORS** – lets the GitHub Pages front-end call this API with `fetch`.
- **Static images** – `GET /images/<file>` returns the image, or a JSON error if it does not exist.

## Routes
| Method | Route | Description |
|---|---|---|
| GET | `/lessons` | All lessons as JSON |
| POST | `/orders` | Save a new order `{ name, phone, lessonIDs: [...], spaces: [...] }` |
| PUT | `/lessons/:id` | Update any attribute(s) of a lesson, e.g. `{ "space": 3 }` |
| GET | `/search?q=text` | Lessons with the text in topic, location, price or space |
| GET | `/teachers` | All teachers |
| GET | `/teachers/:id/lessons` | Lessons taught by one teacher |
| GET | `/enrolment/:lessonid` | Number of spaces already purchased for a lesson |

## Database (MongoDB Atlas, database `afterschool`)
- `lesson` – `{ topic, location, price, space, image, icon }`
- `order` – `{ name, phone, lessonIDs: [ObjectId], spaces: [Number], createdAt }` (`spaces[i]` belongs to `lessonIDs[i]`)
- `teacher` – `{ firstName, lastName, lessonIDs: [ObjectId] }`

## Running locally
```bash
npm install
cp .env.example .env      # then put your Atlas connection string in .env
npm run seed              # fill the database (deletes existing data!)
npm run dev               # starts on http://localhost:3000
```

## Deploying on render.com
- New → Web Service → connect this GitHub repo
- Name: `m01039431-after-school` (must include student number)
- Build command: `npm install` · Start command: `npm start`
- Environment variables: `MONGODB_URI`, `DB_NAME=afterschool`
