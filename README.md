# Todo Bloom

A simple, colorful MERN to-do app with authentication, tags, priorities, due dates, and recurring tasks.

## Setup

1. Copy env files

- backend/.env.example -> backend/.env
- frontend/.env.example -> frontend/.env (optional)

2. Install dependencies

- Backend: `cd backend` then `npm install`
- Frontend: `cd frontend` then `npm install`

3. Run in two terminals

- Backend: `npm run dev`
- Frontend: `npm run dev`

Backend runs on `http://localhost:4000`
Frontend runs on `http://localhost:5173`

## Features

- Email/password auth
- Create, edit, delete, and complete tasks
- Priorities, due dates, tags
- Recurrence (daily/weekly/monthly)
- Search and filters
- AI time estimates via Gemini API (optional)
- Speaking coach with IELTS band + mistake feedback (optional)
- Audio upload for speaking evaluation (optional)

## Gemini AI setup (optional)

This app uses the Gemini API for time estimates and speaking feedback. Add your API key, then:

- In `backend/.env`, set:
  - `GEMINI_API_KEY=your_key_here`
  - `GEMINI_MODEL=gemini-2.5-flash`

If Gemini is not available, the app uses a simple fallback estimate.
