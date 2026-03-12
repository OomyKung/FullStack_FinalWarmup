# SEPARATED FRONTEND & BACKEND ARCHITECTURE

This application now runs Frontend and Backend on **separate ports**.

## Architecture

### Backend (API Server)
- **Port**: 3000
- **URL**: http://localhost:3000
- **Purpose**: Handles database operations, API endpoints, business logic
- **Serves**: JSON data only (no HTML views)
- **File**: `app.js`

### Frontend (Web Server)
- **Port**: 3001
- **URL**: http://localhost:3001
- **Purpose**: Displays web pages, handles user interactions
- **Technology**: EJS templates + Express.js
- **File**: `frontend-server.js`

## How It Works

1. User opens browser → goes to `http://localhost:3001` (Frontend)
2. Frontend renders the page using EJS templates
3. When user interacts (click buttons, submit forms), Frontend makes API calls
4. Frontend calls Backend at `http://localhost:3000/api/*`
5. Backend processes request, fetches/updates database
6. Backend returns JSON response to Frontend
7. Frontend updates the page with the data

## Installation

First time setup:
```bash
npm install
```

## Running the Application

### Option 1: Run both servers at once (Recommended)
```bash
npm start
```
or
```bash
npm run dev
```

This will start:
- **Backend** on http://localhost:3000 (API)
- **Frontend** on http://localhost:3001 (Web Interface)

### Option 2: Run servers separately (for debugging)

Terminal 1 - Start Backend:
```bash
npm run backend
```

Terminal 2 - Start Frontend:
```bash
npm run frontend
```

## Accessing the Application

- **Frontend (Web Interface)**: http://localhost:3001
- **Backend (API)**: http://localhost:3000/api/*
- **Health Check**: http://localhost:3000/api/health

## Environment Variables

Configure in `.env`:
```
BACKEND_PORT=3000
FRONTEND_PORT=3001
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
DB_PATH=./database/database.sqlite
```

## API Endpoints

All API endpoints are on the Backend at `http://localhost:3000/api/`:

- `GET /api/health` - Health check
- `GET /api/stats` - Dashboard statistics
- `GET /api/students` - List all students
- `GET /api/students/:id` - Get student details
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create subject
- `PUT /api/subjects/:id` - Update subject
- `DELETE /api/subjects/:id` - Delete subject
- `GET /api/enrollments` - List all enrollments
- `POST /api/enrollments` - Create enrollment
- `PUT /api/enrollments/:id` - Update enrollment
- `DELETE /api/enrollments/:id` - Delete enrollment
- `GET /api/reports/enrollment-summary` - Get enrollment report

## Troubleshooting

**Issue**: Port 3000 or 3001 already in use
- **Solution**: Change BACKEND_PORT or FRONTEND_PORT in `.env`

**Issue**: Backend connection error
- **Solution**: Make sure Backend is running on port 3000 before starting Frontend
- Check BACKEND_URL in `.env`

**Issue**: CORS errors
- **Solution**: Verify FRONTEND_URL in `.env` matches the frontend's actual URL

## Database

- **Technology**: SQLite
- **Location**: `./database/database.sqlite`
- **Seed Data**: `npm run seed`
