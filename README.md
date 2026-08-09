# Disaster Relief Resource Management System (DRRMS)

A web application for coordinating disaster relief operations — managing resources, shelters, citizen requests, and volunteer assignments during emergencies.

## Project Overview

DRRMS connects three types of users during a disaster:

- **Citizens** submit requests for food, water, medical supplies, and other aid
- **Volunteers** pick up pending requests, deliver resources, and mark tasks complete
- **Admins** oversee the full system — resources, shelters, volunteers, requests, and audit logs

The app is split into two folders:

| Folder | Description |
|--------|-------------|
| `DRRMS-main` | React frontend (Vite) |
| `DRRMS-M-main` | Node.js / Express REST API backed by MySQL |

## Tech Stack

- **Frontend:** React 19, React Router, Vite, CSS
- **Backend:** Node.js, Express 5
- **Database:** MySQL (via `mysql2`)
- **Other:** Axios, Leaflet (maps), React Icons

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server (with MySQL Workbench recommended)
- npm
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/abhijithm34/disaster-relief-resource-management-system.git
cd disaster-relief-resource-management-system
```

### 2. Install Dependencies

```bash
# Backend
cd DRRMS-M-main
npm install

# Frontend
cd ../DRRMS-main
npm install
```

### 3. Database Setup

1. Install and start MySQL on your machine.
2. Open `DRRMS-M-main/drrms_db_queries.sql` in MySQL Workbench (or the MySQL CLI) and run the script. This creates the `drrms_db` database, tables, triggers, and sample seed data.
3. Create a `.env` file in `DRRMS-M-main`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=drrms_db
DB_PORT=3306
PORT=4000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=use-a-long-random-private-secret
JWT_EXPIRES_IN=8h
```

### 4. Run the Application

**Backend** (default port 4000):

```bash
cd DRRMS-M-main
node server.js
```

**Frontend** (default port 5173):

```bash
cd DRRMS-main
npm run dev
```

Open http://localhost:5173 in your browser.

## Sample Login Credentials

These accounts are created by the SQL seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | adminpass |
| Volunteer | raj@example.com | volpass |
| Citizen | deepa@example.com | deeppass |

Select the matching role on the login page when signing in.

## Features

### Citizen Dashboard (`/citizen`)
- **Create Request** — submit a resource request with location, quantity, and remarks
- **My Requests** — track status of submitted requests
- **Find Resources** — browse available relief supplies by location
- **Find Shelters** — view shelter capacity and occupancy
- **Profile Settings** — update username, email, and contact number

Citizen users can log out from their dashboard.

### Volunteer Dashboard (`/volunteer`)
- View all pending citizen requests
- Assign tasks to yourself
- Mark assigned tasks as completed
- Browse available resources
- Log out from the dashboard

### Admin Dashboard (`/admin`)
- View resources, shelters, and volunteers
- Monitor all citizen requests and assigned volunteers
- Verify completed requests (mark as fulfilled)
- Review audit logs and resource quantity change history

## Request Lifecycle

```
pending → assigned → completed → fulfilled
```

1. A **citizen** submits a request (status: `pending`)
2. A **volunteer** assigns themselves to the request (status: `assigned`)
3. The **volunteer** marks the task done (status: `completed`)
4. An **admin** verifies delivery (status: `fulfilled`)

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts with roles: admin, volunteer, citizen |
| `locations` | Cities/regions with coordinates and weather data |
| `resources` | Relief supplies (food, water, medical, etc.) per location |
| `shelters` | Relief camps with capacity and occupancy |
| `requests` | Citizen resource requests and their status |
| `volunteer_requests` | Volunteer-to-request assignments |
| `audit_log` | System action history |
| `resource_audit_log` | Auto-logged resource quantity changes (DB trigger) |

## API Overview

The backend exposes REST endpoints on `http://localhost:4000`. Key routes include:

| Route | Method | Description |
|-------|--------|-------------|
| `/login` | POST | Authenticate by email, password, and role |
| `/register` | POST | Create a new user account |
| `/logout` | POST | End the authenticated session |
| `/resources` | GET | List all resources |
| `/shelters` | GET | List all shelters |
| `/locations` | GET | List all locations |
| `/user/requests` | POST | Submit a citizen request |
| `/my-requests` | GET | Get requests for the authenticated citizen |
| `/profile/:id` | GET/PUT | Read or update user profile |
| `/admin/requests` | GET | All requests with volunteer info (admin) |
| `/volunteers/all-requests` | GET | Pending requests (volunteer) |
| `/volunteers/assign-task` | POST | Assign volunteer to a request |
| `/volunteers/complete-task` | POST | Mark a task as completed |
| `/audit_log` | GET | Fetch audit trail |
| `/resource_audit_log` | GET | Fetch resource quantity change history |

## Project Structure

```
disaster-relief-resource-management-system/
├── DRRMS-main/                  # Frontend
│   ├── src/
│   │   ├── App.jsx              # Route definitions
│   │   ├── main.jsx             # React entry point
│   │   ├── components/          # Shared UI (Navbar)
│   │   ├── pages/               # Login, Register, role dashboards
│   │   │   └── UserDashboardPages/  # Citizen sub-pages
│   │   └── styles/              # Page-specific CSS
│   └── package.json
├── DRRMS-M-main/                # Backend
│   ├── server.js                # Express API server
│   ├── db.js                    # MySQL connection pool
│   ├── drrms_db_queries.sql     # Schema, triggers, seed data
│   └── package.json
└── README.md
```

## Authentication Notes

Login validates the selected role and password, then returns a signed JWT and a safe user object. New registrations use bcrypt password hashing; legacy plaintext passwords are upgraded to bcrypt after a successful login.

The frontend stores the JWT and user object in `localStorage`. Its shared `apiFetch` helper sends `Authorization: Bearer <token>` on every protected request. `/health`, `/login`, and `/register` are public; every other API route requires a valid JWT. Server-side role and ownership checks protect citizen, volunteer, and admin actions.

Logout calls `POST /logout`, clears the browser session, and revokes the current token in the running API process.

## Deployment Environment Variables

For a Vercel frontend, set `VITE_API_URL` to the Render API URL (for example, `https://your-api.onrender.com`) and redeploy after changing it.

For the Render backend, configure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `FRONTEND_URL`, `JWT_SECRET`, and `JWT_EXPIRES_IN` in the service environment. Keep `JWT_SECRET` private: it must not be committed to GitHub or exposed to the frontend.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Abhijith M

## Support

For support, open an issue in the GitHub repository or contact the author.
