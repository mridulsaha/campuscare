# Campus Care

Campus Care is a grievance redressal and compliance tracking platform built on the MERN stack for Madhav Institute of Technology and Science (MITS), Gwalior. It replaces paper- and email-based complaint handling with a role-based system that includes automated SLA escalation, whistleblower protection, and audit-ready reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [System Architecture](#system-architecture)
5. [Project Structure](#project-structure)
6. [Environment Variables](#environment-variables)
7. [Installation](#installation)
8. [API Reference](#api-reference)
9. [Core Workflows](#core-workflows)
10. [Project Link](#project-link)
11. [Author](#author)

---

## Overview

Colleges manage grievances from thousands of students, faculty, and staff across multiple departments. Handling this through physical letters or unstructured email creates a few recurring problems:

- **Unverifiable submissions** — without domain-restricted authentication, complaints can be spammed or filed anonymously with no way to trace them.
- **Fear of retaliation** — without a way to protect identity, students often avoid reporting issues involving academic or administrative staff.
- **Conflicts of interest** — the person a complaint is filed against may also be the person responsible for reviewing it.
- **No enforced timelines** — complaints sit unreviewed with no mechanism to flag delays or escalate them.
- **Difficult audits** — compiling records for accrediting bodies like NAAC, NBA, UGC, or AICTE becomes a manual, error-prone process.

Campus Care addresses these with domain-restricted OAuth login, anonymous complaint masking, automatic isolation of conflicted reviewers, nightly SLA-breach escalation, and built-in compliance reporting.

---

## Key Features

**Domain-restricted Google OAuth**
Login is scoped to institutional email domains:
- `@mitsgwl.ac.in` → assigned the **Student** role (roll number and branch parsed automatically)
- `@mitsgwalior.in` → assigned **Faculty** or **Administration**

**Role-based workflows** across five tiers:
- **Student** — file grievances or inquiries, track progress, upload evidence, chat with the assigned officer
- **Faculty** — manage assigned tickets, resolve with mandatory remarks, or transfer within department
- **HOD** — manage the department's inbound/outbound queue, assign tickets to faculty, track resolution turnaround
- **Leadership (Director / Deans)** — institution-wide analytics, cross-department comparisons, and compliance tracking
- **Admin** — manage departments, programmes, branches, and categories; run bulk CSV imports

**Whistleblower protection** — an anonymous toggle on complaints hides the complainant's identity from reviewers while keeping it available for internal audit.

**Conflict-of-interest handling** — anyone named in a complaint is automatically blocked from viewing, editing, or reassigning it. Complaints naming a Head of Department are rerouted straight to Central Administration.

**Automated SLA escalation** — a nightly cron job checks pending tickets and flags any unresolved past a configurable threshold (7 days by default) as `is_sla_breached`, escalating them to department leadership.

**Direct-to-cloud uploads** — signed Cloudinary uploads let users attach up to 5 files (PDFs, images, documents) straight from the browser, without routing them through the backend.

**Ticket-level chat** — a dedicated discussion thread between the complainant and the assigned officer for each ticket.

**Email notifications** — sent asynchronously via Nodemailer, with HTML and AMP4Email templates for ticket creation, assignment, transfer, and closure.

**Compliance export** — generates CSV reports formatted for statutory audits.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, Lucide React, Recharts, Axios |
| Backend | Node.js (ES Modules), Express.js |
| Database | MongoDB Atlas, Mongoose (with session transactions) |
| Authentication | Google OAuth 2.0 (`google-auth-library`), JWT in `httpOnly` cookies |
| Media Storage | Cloudinary (signed direct uploads) |
| Scheduling | `node-cron` |
| Email | Nodemailer (SMTP over SSL/TLS) |
| Logging & Security | Pino, Pino-HTTP, in-memory sliding-window rate limiting |

---

## System Architecture

```text
[Client: React 19 + Vite SPA (apps/web)]
  - Context & Providers: AuthContext, ThemeContext, ToastContext
  - Student View: Lodge grievances, general inquiries, anonymous toggle, ticket tracker
  - Faculty View: Assigned task queue (UNDER_REVIEW), resolution/rejection, transfer
  - HOD View: Inbound/outbound department queues, faculty workload, task assignment
  - Leadership View: Institutional metrics, department benchmarks, priority matrices
  - Admin View: Governance (Departments, Programmes, Branches, Categories), bulk CSV ops
  - Shared UI: Direct signed Cloudinary uploader, real-time ticket discussion chat
                 |
                 | HTTPS / WSS (CORS, SameSite/Secure cookies, credentials: true)
                 v
[Express API Ingress & Middleware (apps/api)]
  - Context middleware & correlation tracing (x-request-id via AsyncLocalStorage)
  - Pino HTTP structured logger with header redaction & status logging
  - In-memory sliding-window rate limiter (100 req/min per IP with automated bucket sweep)
  - Cookie parser & JSON body parser (50MB payload ceiling)
  - JWT authentication middleware (verifies HS256 signature, decodes claims)
  - Role-based authorization gates: authorizeRoles('student', 'faculty', 'admin')
  - Leadership authorization gates: authorizeLeadership('hod', 'dean', 'director', 'vc', 'pvc')
  - Request validation & sanitization (regex string checks, NoSQL injection stripping)
                 |
                 | Authenticated & Sanitized Request Pipeline
                 v
[Application Routing Layer (/api/v1)]
  - /api/v1/auth: Google OAuth2 token verification, session check (/me), logout
  - /api/v1/user: Profile lock/completion, user directory, role/designation management
  - /api/v1/department: Institutional department CRUD, HOD assignments & transitions
  - /api/v1/programme: Degree programme CRUD (B.Tech, M.Tech, duration, semester setup)
  - /api/v1/branch: Branch specializations tied to department and programme
  - /api/v1/complain/category: Top-level grievance categories & default priorities
  - /api/v1/complain/subcategory: Tier-2 categories scoped by audience (student/faculty/all)
  - /api/v1/complain: Filing, dashboards, task assignment, department transfer, resolve/reject
  - /api/v1/complain/:id/chat: Discussion thread messaging with anonymous identity masking
  - /api/v1/audit: Immutable timeline history and complaint audit inspection
  - /api/v1/bulk: CSV batch import (entities/users) & compliance export for audits
                 |
                 | Internal Service Invocations & ACID Sessions
                 v
[Business Service Layer]
  - AuthService: Google token verification, domain whitelisting, profile provisioning
  - JWTService: Secure HS256 token generation, signing, and verification
  - UserService: Profile completion, designation controls, cascading user deactivations
  - DepartmentService: HOD tenure transitions, department updates, cascaded reassignment
  - ProgrammeService & BranchService: Academic hierarchy management and validation
  - ComplainCategoryService & ComplainSubcategoryService: Category lifecycle management
  - ComplainService:
      * Grievance registration & auto-derived priority resolution
      * Whistleblower identity masking (redacts complainant PII for non-admin viewers)
      * Conflict-of-interest isolation (removes tickets targeting active user via $nor filters)
      * HOD conflict rerouting (auto-transfers grievances against HOD to Central Admin)
      * Task assignment, intra-department transfer, department rerouting, resolve/reject
      * Performance metrics calculation via single-pass MongoDB $facet pipelines
  - ComplainChatService: Ticket messaging, participation verification, participant notifications
  - AuditService: Append-only event tracking and timeline reconstruction
  - BulkService: RFC-4180 compliant CSV stream parsing, batch validation, compliance export
  - Cron & Automation Engine:
      * escalation.cron: Nightly SLA breach monitor (auto-flags >7-day tickets & escalates to HOD)
      * daily.digest.cron: Morning summary briefs to Deans, Directors, and Department Heads
      * student.lifecycle.cron: Automated student cohort lifecycle and semester updates
                 |
                 | Mongoose ODM / Direct Cloud APIs
                 v
[Data Access & Repository Layer]
  - Repositories: User, Department, Programme, Branch, Complain, Attachment, Counter,
                  ComplainCategory, ComplainSubcategory, ComplainAssignment, ComplainHistory, ComplainChat
  - Multi-document transactions (mongoose.startSession) for atomic state transitions & cascades
  - Custom sequential ID generator (USR-, DEP-, PRG-, BRN-, CAT-, SUB-, CMP-, TKT-, ASN-, HIS-, CHT-)
                 |
                 | Persistent Storage & External Integrations
                 v
[Persistence & Third-Party APIs]
  - MongoDB Atlas (Replica Set):
      * Atomic counter sequences, sparse indexes, compound uniqueness constraints
      * Deep virtual population and real-time analytical aggregation pipelines ($facet)
  - Cloudinary Media Storage CDN:
      * Direct signed client-to-cloud uploads (bypasses Node.js memory overhead)
      * HMAC-SHA1 authenticated signatures, multi-file deletion for purged grievances
  - SMTP Gateway (Nodemailer via Port 465 SSL):
      * Asynchronous non-blocking dispatch (setImmediate)
      * Responsive HTML & AMP4Email dynamic interactive email notifications
```

---

## Project Structure

```text
campuscare/
├── apps/
│   ├── api/                                        # Express backend
│   │   ├── src/
│   │   │   ├── configs/                            # auth, cloudinary, db, google OAuth setup
│   │   │   ├── controllers/                        # Request handlers per resource
│   │   │   ├── cron/                                # Escalation, digest, and lifecycle jobs
│   │   │   ├── middlewares/
│   │   │   │   ├── validators/                     # Per-resource input validators
│   │   │   │   ├── auth.middleware.js              # JWT verification & RBAC gates
│   │   │   │   ├── error.middleware.js             # Centralized error handler
│   │   │   │   ├── logging.middleware.js           # Pino logger & correlation context
│   │   │   │   ├── rate.limiter.middleware.js      # Sliding-window rate limiter
│   │   │   │   └── validate.middleware.js          # Request sanitizer
│   │   │   ├── models/                             # Mongoose schemas
│   │   │   ├── repositories/                       # Data access layer
│   │   │   ├── routes/                             # Express sub-routers
│   │   │   ├── scripts/
│   │   │   │   └── startup.js                      # Admin bootstrap & seeding
│   │   │   ├── services/                           # Business logic & transactions
│   │   │   ├── utils/                              # Shared helpers (JWT, mail, CSV, logging, etc.)
│   │   │   ├── app.js                              # Express app assembly
│   │   │   └── server.js                           # DB startup & graceful shutdown
│   │   ├── .env
│   │   └── package.json
│   │
│   └── web/                                        # React 19 frontend
│       ├── public/
│       ├── src/
│       │   ├── components/
│       │   │   ├── analytics/                      # Performance indicator widgets
│       │   │   ├── common/                         # Shared UI components
│       │   │   ├── complaint/                      # Complaint lifecycle components
│       │   │   └── layout/                         # App shell, navbar, footer
│       │   ├── context/                            # Auth, theme, and toast providers
│       │   ├── pages/                              # Route-level views and dashboards
│       │   ├── services/
│       │   │   └── api.js                          # Axios client
│       │   ├── utils/
│       │   ├── App.jsx
│       │   ├── index.css
│       │   └── main.jsx
│       ├── .env
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
│
├── .gitignore
├── eslint.config.js
├── package.json
└── package-lock.json
```

---

## Environment Variables

### Backend (`apps/api/.env`)

```env
# Application
NODE_ENV=production
PORT=3000
DOMAIN_NAME=https://your-api-domain.com
FRONTEND_DOMAIN_NAME=https://your-frontend-domain.com

# Database (MongoDB Atlas)
MONGO_URI=mongodb+srv://<db_user>:<db_password>@<cluster>.mongodb.net/campuscare?retryWrites=true&w=majority

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-api-domain.com/api/v1/auth/google

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# JWT & Cookies
JWT_SECRET=your-256-bit-random-secret-key
JWT_EXPIRY=7d
JWT_NAME=jwtToken
COOKIE_MAX_AGE=604800000
COOKIE_DOMAIN=

# Institutional Access Control
VALID_DESIGNATIONS=director,vice_chancellor,pro_vice_chancellor,dean,hod,professor,associate_professor,assistant_professor,adhoc_faculty
LEADERSHIP_DESIGNATIONS=director,vice_chancellor,pro_vice_chancellor,dean,hod
NON_STUDENT_EMAIL_DOMAINS=mitsgwalior.in
STUDENT_EMAIL_DOMAINS=mitsgwl.ac.in
ADMIN_EMAILS=admin@mitsgwl.ac.in

# SLA Monitoring
RUN_CRON=true
SLA_BREACH_DAYS=7

# SMTP
ENABLE_EMAIL=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-institutional-email@mitsgwl.ac.in
SMTP_PASS=your-google-app-password
EMAIL_FROM="Campus Care <your-institutional-email@mitsgwl.ac.in>"
```

### Frontend (`apps/web/.env`)

```env
VITE_API_URL=https://your-api-domain.com/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Installation

**Prerequisites**
- Node.js v20+ (LTS)
- MongoDB (Atlas cluster or local instance, v6.0+)
- Google Cloud Console project with OAuth 2.0 Web Client credentials
- Cloudinary account

**1. Clone the repository**
```bash
git clone https://github.com/mridulsaha/campuscare.git
cd campuscare
```

**2. Set up the backend**
```bash
cd apps/api
npm install
# Add your database, OAuth, and Cloudinary keys to .env
npm run dev
```
The API starts on `http://localhost:3000`.

**3. Set up the frontend**
```bash
cd ../web
npm install
# Set VITE_API_URL and VITE_GOOGLE_CLIENT_ID in .env
npm run dev
```

---

## API Reference

All routes are mounted under `/api/v1` and rate-limited to 100 requests/minute.

| # | Method | Route | Auth | Roles | Designations | Description |
|---|---|---|---|---|---|---|
| 1 | POST | `/auth/google` | Public | — | — | Verifies a Google OAuth ID token against institutional domains, provisions the user, and issues a JWT cookie |
| 2 | GET | `/auth/me` | Yes | All | — | Returns the current user's profile and role |
| 3 | POST | `/auth/logout` | Yes | All | — | Clears the JWT cookie and ends the session |
| 5 | GET | `/audit/complaint/:complainId` | Yes | All | — | Returns the full timeline for a complaint |
| 6 | PATCH | `/user/profile/complete` | Yes | All | — | Completes and locks initial profile setup |
| 7 | GET | `/user/` | Yes | faculty, admin | — | Lists users (department-scoped for HODs) |
| 8 | GET | `/user/:id` | Yes | faculty, admin | — | Returns a single user's profile |
| 9 | PATCH | `/user/:id` | Yes | All | hod, dean, director, vc, pvc | Updates a user's designation, status, or affiliation |
| 10 | DELETE | `/user/:id` | Yes | All | hod, dean, director, vc, pvc | Deletes a user, requeues their tasks, cleans up Cloudinary assets |
| 11 | GET | `/department/` | Yes | All | — | Lists active departments |
| 12 | POST | `/department/` | Yes | admin | — | Creates a department |
| 13 | PATCH | `/department/:id` | Yes | admin | — | Updates a department or assigns its HOD |
| 14 | DELETE | `/department/:id` | Yes | admin | — | Deletes a department and unlinks its branches, students, and grievances |
| 15 | GET | `/department/:id` | Yes | All | — | Returns a single department |
| 16 | GET | `/programme/` | Yes | All | — | Lists degree programmes |
| 17 | POST | `/programme/` | Yes | admin | — | Creates a programme |
| 18 | PATCH | `/programme/:id` | Yes | admin | — | Updates a programme |
| 19 | DELETE | `/programme/:id` | Yes | admin | — | Deletes a programme and unlinks its branches and students |
| 20 | GET | `/programme/:id` | Yes | All | — | Returns a single programme |
| 21 | GET | `/branch/` | Yes | All | — | Lists branches with their department and programme |
| 22 | POST | `/branch/` | Yes | admin | — | Creates a branch |
| 23 | PATCH | `/branch/:id` | Yes | admin | — | Updates a branch |
| 24 | DELETE | `/branch/:id` | Yes | admin | — | Deletes a branch and unlinks its students |
| 25 | GET | `/branch/:id` | Yes | All | — | Returns a single branch |
| 26 | GET | `/complain/category/` | Yes | All | — | Lists grievance categories |
| 27 | POST | `/complain/category/` | Yes | admin | — | Creates a category |
| 28 | PATCH | `/complain/category/:id` | Yes | admin | — | Updates a category |
| 29 | DELETE | `/complain/category/:id` | Yes | admin | — | Deletes a category and its subcategories/complaints |
| 30 | GET | `/complain/category/:id` | Yes | All | — | Returns a single category |
| 31 | GET | `/complain/subcategory` | Yes | All | — | Lists subcategories |
| 32 | POST | `/complain/subcategory` | Yes | admin | — | Creates a subcategory |
| 33 | PATCH | `/complain/subcategory/:id` | Yes | admin | — | Updates a subcategory |
| 34 | DELETE | `/complain/subcategory/:id` | Yes | admin | — | Deletes a subcategory and its complaints |
| 35 | GET | `/complain/subcategory/:id` | Yes | All | — | Returns a single subcategory |
| 36 | GET | `/complain/form-options` | Yes | All | — | Returns category, subcategory, department, and faculty options for the current user |
| 37 | GET | `/complain/upload-signature` | Yes | All | — | Generates a signed payload for direct Cloudinary uploads |
| 38 | POST | `/complain/` | Yes | All | — | Files a new complaint with conflict-of-interest checks and attachments |
| 39 | GET | `/complain/my` | Yes | All | — | Lists the current user's complaints |
| 40 | GET | `/complain/student/dashboard` | Yes | student | — | Student dashboard summary |
| 41 | GET | `/complain/faculty/dashboard` | Yes | faculty, admin | — | Faculty dashboard summary |
| 42 | GET | `/complain/hod/dashboard` | Yes | All | hod, dean, director, vc, pvc | HOD dashboard summary |
| 43 | GET | `/complain/leadership/dashboard` | Yes | All | dean, director, vc, pvc | Executive dashboard summary |
| 44 | GET | `/complain/faculty/tasks` | Yes | faculty, admin | — | Lists tickets currently assigned to the caller |
| 45 | GET | `/complain/faculty/history` | Yes | faculty, admin | — | Lists tickets previously closed by the caller |
| 46 | GET | `/complain/department/inbound` | Yes | All | hod, dean, director, vc, pvc | Lists complaints inbound to the caller's department |
| 47 | GET | `/complain/department/outbound` | Yes | All | hod, dean, director, vc, pvc | Lists complaints filed by the department against others |
| 48 | GET | `/complain/college/all` | Yes | All | dean, director, vc, pvc | Institution-wide complaint lookup with filters |
| 49 | GET | `/complain/analytics/reports` | Yes | All | hod, dean, director, vc, pvc | Aggregated turnaround and status metrics |
| 51 | GET | `/complain/user` | Yes | All | hod, dean, director, vc, pvc | Lists a specific user's complaints |
| 52 | POST | `/complain/assign` | Yes | All | hod, dean, director, vc, pvc | Assigns a complaint to faculty |
| 53 | POST | `/complain/transfer-department` | Yes | All | hod, dean, director, vc, pvc | Transfers a complaint to another department |
| 54 | POST | `/complain/transfer` | Yes | faculty, admin | — | Transfers a complaint to another faculty member |
| 55 | PATCH | `/complain/:id/resolve` | Yes | faculty, admin | — | Resolves a complaint with mandatory remarks |
| 56 | PATCH | `/complain/:id/reject` | Yes | faculty, admin | — | Rejects a complaint with mandatory remarks |
| 57 | GET | `/complain/:id/chat` | Yes | All | — | Returns a ticket's chat thread |
| 58 | POST | `/complain/:id/chat` | Yes | All | — | Posts a message to a ticket's chat thread |
| 59 | GET | `/complain/view/:id` | Yes | All | — | Returns full complaint details and timeline |
| 62 | POST | `/bulk/departments/import` | Yes | admin | — | Bulk imports departments from CSV |
| 63 | POST | `/bulk/programmes/import` | Yes | admin | — | Bulk imports programmes from CSV |
| 64 | POST | `/bulk/branches/import` | Yes | admin | — | Bulk imports branches from CSV |
| 65 | POST | `/bulk/categories/import` | Yes | admin | — | Bulk imports categories and subcategories from CSV |
| 66 | POST | `/bulk/students/import` | Yes | admin | — | Bulk registers students from CSV |
| 67 | POST | `/bulk/faculty/import` | Yes | admin | — | Bulk registers faculty from CSV |
| 68 | GET | `/bulk/compliance/export` | Yes | All | hod, dean, director, vc, pvc | Exports a compliance report as CSV |

---

## Core Workflows

### Direct signed upload

To keep large file uploads off the API server:

1. Client requests a signed payload from `GET /api/v1/complain/upload-signature`.
2. Server generates an HMAC-SHA1 signature using the Cloudinary API secret and a timestamp.
3. Client uploads the file directly to Cloudinary.
4. Cloudinary returns a secure URL and asset ID, which the client submits with the complaint via `POST /api/v1/complain`.

### SLA breach detection

A nightly cron job:

1. Queries all tickets in `PENDING` or `UNDER_REVIEW` status.
2. Flags any where `createdAt` exceeds `SLA_BREACH_DAYS` (7 by default).
3. Sets `is_sla_breached = true`, logs the event to `ComplainHistory`, and updates the department's dashboard.
4. Emails the relevant HOD and Dean.

---

## Project Link

- **[Campus Care](https://campus-care-mridul-saha.onrender.com/)**

---

## Author

**Mridul Saha**
- GitHub: [@mridulsaha](https://github.com/mridulsaha)
- LinkedIn: [@mridulsaha](https://linkedin.com/in/mridulsaha)
- Email: mridulsaha2008@gmail.com
