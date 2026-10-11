# LearnSpace — Learning Management System

A beginner-friendly, full-stack LMS mini project built with React, JavaScript, Node.js, Express, and SQLite. Students can create accounts, discover courses, enroll, study lessons, track completion, and submit assignment work. Administrators can create and publish courses, manage lessons and assignments, review students, and grade submissions.

> **Implementation note:** This repository is a working local-development foundation, not a security audit or production-certified platform. The included automated tests cover basic API behavior and input helpers. Database-dependent user flows should be tested against a local SQLite database file before a demo or deployment.

## Features

- Responsive LearnSpace landing page, course catalogue, course details, login, and registration.
- Student dashboard, enrolled course list, lesson viewer, completion tracking, assignment submission, and profile editing.
- Admin dashboard statistics, course CRUD/publish controls, lesson creation/deletion, assignment creation, and student list.
- Express REST API, SQLite database, parameterized SQL, bcrypt password hashes, JWT in HttpOnly cookies, role middleware, input validation, centralized errors, Helmet, CORS, and login rate limiting.
- Public registration always creates a `student`; admin creation uses a dedicated CLI script.

## Stack

- Frontend: React 18, Vite, React Router, Axios, Lucide React, plain CSS.
- Backend: Node.js 20+, Express 4, better-sqlite3, bcryptjs, jsonwebtoken, dotenv.
- Database: SQLite (local database file; no database server required).
- Tests: Node test runner and Supertest.

## Requirements

Install Node.js 20 or newer and npm. SQLite is managed automatically by the application; you do not need to install a separate database server. A terminal and a code editor (such as VS Code) are recommended.

## Setup

### 1. Configure the backend

The backend creates `database/lms.sqlite` and its tables automatically the first time it starts. To use another file location, set `DB_FILE` in `server/.env`.

```bash
cd server
cp .env.example .env
```

Edit `server/.env` and set `JWT_SECRET` with a long, random secret (at least 32 characters; use a different secret for every environment).
- Keep `CLIENT_URL=http://localhost:5173` for local Vite development.
- Keep `COOKIE_SECURE=false` only for local HTTP development. Set it to `true` behind HTTPS in production.
- `COOKIE_SAME_SITE=lax` is suitable for this same-site local setup. If deploying frontend and API on different sites, re-evaluate SameSite, Secure, CORS, and CSRF protections together.

Never commit `.env` files. They are ignored by Git.

### 2. Install dependencies

From the project root:

```bash
npm install
npm run install:all
```

If the install script fails due to a network or package registry issue, run `npm install` separately in the root, `server`, and `client` folders.

### 3. Create the initial admin

From the `server` directory, after `.env` is configured (the database file is created automatically):

```bash
npm run create-admin -- "LMS Administrator" admin@example.com "Choose-A-Long-Unique-Password"
```

Use your own email and a strong private password. The script hashes the password before inserting it. Do not use a sample password on a public deployment. If the email already exists, the script will stop rather than overwrite that account.

### 4. Add sample courses

From the `server` directory, run this after creating the admin:

```bash
npm run seed
```

The seed script is safe to re-run; it skips sample courses, lessons, and assignments that already exist.

### 5. Configure the frontend

```bash
cd client
cp .env.example .env
```

The default `VITE_API_URL=http://localhost:5000/api` works for local development. Change it if the API runs elsewhere. Restart Vite after changing environment values.

### 6. Run the application

Open two terminals from the project root.

Terminal A — backend:

```bash
cd server
npm run dev
```

Terminal B — frontend:

```bash
cd client
npm run dev
```

Open <http://localhost:5173>. The API health endpoint is <http://localhost:5000/api/health>.

You can also use the root script after installing all dependencies:

```bash
npm run dev
```

## Main user journeys

### Student

1. Register at `/register` (public registration only creates student accounts).
2. Browse `/courses` and open a course.
3. Select **Enroll for free**.
4. Use **Dashboard** or **My courses** to continue learning.
5. Mark lessons complete and submit assignment text or a URL.
6. Check assignment feedback/grades on the learning page.

### Admin

1. Use the account created by `npm run create-admin` to log in.
2. Open the Admin dashboard.
3. Use **Manage courses** to create a course and publish/unpublish it.
4. Edit a course to add lessons and assignments.
5. Review students and the recent-submissions dashboard. The grading endpoint is available through the API; a dedicated grading screen is not included in this first UI iteration.

## Project structure

```text
learning-management-system/
├── client/
│   ├── public/
│   └── src/
│       ├── components/       # Layout, course cards, status components
│       ├── context/          # Cookie-session auth context
│       ├── pages/            # Public, student, and admin screens
│       ├── services/         # Central Axios client
│       ├── styles.css
│       ├── App.jsx
│       └── main.jsx
├── server/
│   ├── config/db.js          # SQLite database setup and query helper
│   ├── middleware/auth.js    # Authentication and role checks
│   ├── routes/index.js       # REST endpoints and business rules
│   ├── validators/input.js
│   ├── scripts/create-admin.js
│   ├── app.js
│   └── server.js
├── database/schema.sql
├── database/seed.sql
├── docs/API.md
└── README.md
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` (root) | Runs frontend and backend together |
| `npm run build` (root) | Creates the Vite production build |
| `npm test` (root) | Runs backend unit/API smoke tests |
| `npm run create-admin -- "Name" email password` (in `server`) | Creates an administrator safely |

## Troubleshooting

- **SQLite initialization fails:** Check that the project folder is writable and that `database/schema.sql` exists.
- **Course seed fails:** Create the admin first, then run `npm run seed` from `server`.
- **Database reset:** Stop the backend and remove `database/lms.sqlite` (and its `-wal`/`-shm` files, if present), then restart the backend. This permanently deletes local LMS data.
- **CORS or login cookie issue:** Check that `CLIENT_URL` exactly matches the browser origin, use `withCredentials` (already configured), and keep `COOKIE_SECURE=false` for local HTTP only.
- **Port already in use:** Change `PORT` in `server/.env` or the Vite port in `client/vite.config.js`.
- **API returns 401:** Log in again; session cookies are HttpOnly and cannot be read by browser JavaScript.
- **Course list is empty:** Seed sample courses or create/publish a course as admin.

## Testing

From `server/`:

```bash
npm test
```

The included automated tests cover the health endpoint, unknown API paths, and validation helpers. Full authentication, authorization, enrollment, progress, and grading integration tests require a disposable test database file and should be added before production use.

## Demo/presentation outline

1. Explain the architecture: React UI → Axios REST calls → Express routes/middleware → SQLite database file.
2. Show the normalized tables: users, courses, lessons, enrollments, lesson progress, assignments, submissions.
3. Register a student and show that public registration cannot select an admin role.
4. Log in as admin, create/publish a course, add lessons and an assignment.
5. Log in as student, enroll, mark a lesson complete, and submit assignment work.
6. Show progress persistence in the local SQLite database file and explain bcrypt password hashing, HttpOnly cookies, role checks, and parameterized SQL.
7. State honestly which automated tests are implemented and what would be added for production (CSRF strategy, audit logging, full integration tests, database-file backups, monitoring, and deployment hardening).

## Security notes

The API uses an HttpOnly JWT cookie by default, parameterized queries, password hashing, basic role checks, input limits, and a login rate limit. This does **not** guarantee complete security. Before deployment, review CSRF protections, cookie and domain settings, token revocation/session management, dependency updates, audit logs, database-file permissions and backups, HTTPS, and comprehensive integration testing.
