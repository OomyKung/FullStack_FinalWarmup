# FullStack_FinalWarmup

Unified full-stack school enrollment project.

The project now runs as one Express application from the project root:

- `app.js` serves both the EJS frontend and the API.
- `controllers/`, `models/`, `routes/`, `views/`, and `public/` all live at the root.
- The SQLite database and seed script are in `database/`.

## Run

Install dependencies once from the project root:

```bash
npm install
```

Run both servers together:

```bash
npm start
```

Seed the database:

```bash
npm run seed
```

Open the app:

- UI: `http://localhost:3000`
- API: `http://localhost:3000/api`

## Optional Environment Variables

- `PORT` for the app server
- `DB_PATH` for the SQLite database file
