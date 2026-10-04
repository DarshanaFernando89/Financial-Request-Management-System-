# Financial Request Management and Tracking System

Faculty of Engineering, University of Ruhuna  
Department of Electrical and Information Engineering

## Background

This full-stack application digitalizes the university's paper-based financial request and claim process. Staff can submit claims, upload documents, track workflow status, respond to clarifications, and view payment progress. Approvers, Finance Officer, and Admin users operate through role-based dashboards with audit logging and notifications.

The written specification is treated as the source of truth. Approval thresholds in this project are demo seed values only; official confidential limits are intentionally not hardcoded and must be managed through configurable approval rules.

## Features

- JWT authentication with bcrypt password hashing.
- Multi-role login with role selection after credential validation.
- Role-based dashboards for Lecturers, Approvers, Finance Officer, and Admin.
- Dynamic request types with custom fields and required documents.
- Configurable approval rules stored in MongoDB.
- Approval rule creation and editing offer active custom roles from Role Management using their display names and preserve the selected workflow order.
- Requester claim choices use the exact active approval rule names from the admin dashboard; rules with multiple request types offer a second selection for the claim form.
- Sequential workflow engine with verification, approval, finance review, final approval, and payment steps.
- Request More Info flow that returns to the same actor/role after requester response.
- Rejection and resubmission with revision tracking.
- Finance payment processing with payment records.
- Local document uploads with file type and 10 MB validation.
- In-app notifications plus email/SMS-ready service stubs.
- Audit logging for important system actions.
- Admin user, role, account request, approval rule, and request type management.
- Admin can assign active system and custom roles when creating or editing users. Custom roles retain their display names in profiles and sessions and use the approver dashboard for claims assigned to them. Multi-role accounts require separate approval-role passwords for custom approver roles, as they do for HoD and Dean.
- PDF and Excel report export.
- Basic backend tests and TypeScript build verification.

## Tech Stack

Frontend: React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Context API, lucide-react.  
Backend: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT, bcryptjs, multer, zod-ready validation middleware, pdfkit, exceljs.  
Architecture: REST API, RBAC, modular controllers/services/models/routes, dynamic workflow service.

## Folder Structure

```text
financial-request-management-system/
  client/
  server/
  docs/
  README.md
```

The client and server follow the requested module structure under `client/src` and `server/src`.

## Environment Variables

Copy examples before running:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

On Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Server defaults:

```text
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/financial_request_system
JWT_SECRET=replace_with_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
UPLOAD_URL_BASE=/uploads
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_SMS_NOTIFICATIONS=false
```

For shared multi-machine use, set UPLOAD_DIR to the same network-accessible folder on each server instance so uploaded documents are visible to all clients.

Client default:

```text
VITE_API_BASE_URL=http://localhost:5000/api
```

## Installation

PowerShell script execution may block `npm.ps1`, so use `npm.cmd`:

```powershell
npm.cmd --prefix server install
npm.cmd --prefix client install
```

If Docker is available, start the local MongoDB service:

```powershell
docker compose up -d
```

## Run Locally

Start MongoDB locally or update `MONGO_URI` to MongoDB Atlas.

Seed the database:

```powershell
npm.cmd --prefix server run seed
```

Start the backend:

```powershell
npm.cmd --prefix server run dev
```

Start the frontend:

```powershell
npm.cmd --prefix client run dev
```

Open:

```text
http://localhost:5173
```

The manual end-to-end demo checklist is in `docs/manual-test-scenario.md`.

## Verification Commands

```powershell
npm.cmd --prefix server run build
npm.cmd --prefix server test
npm.cmd --prefix client run build
```

## Existing Account Role Migration

Available roles are Lecturer, Head of Department, Dean, Finance Officer, and Admin. Profiles, sessions, and user management use the same supported role list.

For an existing database containing the retired `REQUESTER` role, preview the cleanup, then apply it:

```powershell
npm.cmd --prefix server run migrate:remove-requester-role
npm.cmd --prefix server run migrate:remove-requester-role -- --apply
```

The migration preserves supported assignments and assigns Lecturer when removing `REQUESTER` would leave an account without a supported role. Before updating accounts, it saves their previous assignments under `server/.local/role-migrations/`, which is excluded from Git. Repeating the migration leaves already migrated accounts unchanged.

## Default Login Credentials

All seed users use:

```text
Password123!
```

| Role | Email |
| --- | --- |
| Admin | admin@uor.lk |
| Lecturer | lecturer@uor.lk |
| HoD | hod@uor.lk |
| Dean | dean@uor.lk |
| Finance Officer | finance@uor.lk |

## Current Database Accounts

Verified on 4 October 2026 against the configured development database after the requester-role migration. This snapshot includes manually created accounts; reseeding does not recreate every account below.

All 15 accounts are marked active, and each login password was verified as `Password123!`.

| Account email | Available roles | Login access |
| --- | --- | --- |
| admin@uor.lk | Admin | Available |
| lecturer@uor.lk | Lecturer | Available |
| hod@uor.lk | Head of Department, Lecturer | Available |
| dean@uor.lk | Dean, Lecturer | Available |
| finance@uor.lk | Finance Officer | Available |
| multirole@uor.lk | Lecturer, Head of Department | Available |
| requester@uor.lk | Lecturer | Available |
| coordinator@uor.lk | Lecturer | Available |
| jayathu@uor.lk | Lecturer | Available |
| bandara@uor.lk | Lecturer | Available |
| yamuna@uor.lk | Lecturer | Available |
| tharuu@uor.lk | Lecturer | Available |
| tygfaf@uor.lk | Lecturer | Available |
| approving.authority@uor.lk | No supported role | Blocked until a supported role is assigned |
| finance.division@uor.lk | No supported role | Blocked until a supported role is assigned |

Selecting Head of Department or Dean on a multi-role account requires a separate approval-role password. The configured approval-role passwords for `hod@uor.lk` and `dean@uor.lk` differ from `Password123!` and cannot be recovered from their stored hashes. The Head of Department approval-role password for `multirole@uor.lk` is not configured; an Admin must set it before that role can be selected.

## API Overview

Base URL: `http://localhost:5000/api`

- Auth: `/auth/login`, `/auth/select-role`, `/auth/me`, `/auth/logout`, `/auth/forgot-password`, `/auth/request-account`
- Account requests: `/account-requests`
- Users: `/users`
- Requests: `/requests`
- Approvals: `/approvals`
- Finance: `/finance`
- Notifications: `/notifications`
- Admin: `/admin`
- Reports: `/reports`
- Audit logs: `/audit-logs`

## Workflow Summary

When a request is submitted, the backend finds the highest-priority active approval rule matching request type and amount. It generates only the actual workflow steps for that request and appends Finance Officer as the payment step automatically.

New requests save the requester's selected approval rule, including when saved as drafts. Submission validates that this rule is still active and supports the selected request type and amount. Existing requests without a selected rule continue to use automatic rule matching.

Examples from seed data:

- Small academic claim: HoD -> Finance Officer.
- Medium academic claim: HoD -> Dean -> Finance Officer.
- Large academic claim: HoD -> Dean -> Finance Officer.
- Travel/fuel claim: HoD -> Finance Officer.
- High-value special claim: HoD -> Dean -> Finance Officer.

Only the currently assigned active role can approve, request more info, reject, or mark paid.

## Reports

The Reports page supports filtered summaries and request previews. Exports are generated server-side:

- PDF via `pdfkit`.
- Excel via `exceljs`.

## Security Notes

This MVP uses JWT in localStorage for development convenience. Production should move to secure HTTP-only cookies, add CSRF protection if cookies are used, tighten CORS origins, rotate JWT secrets, enable real email/SMS providers, use centralized object storage for files, and review dependency audit recommendations. The current backend audit has no moderate-or-higher findings; npm still reports low-severity transitive advisories through the Excel export dependency stack.

## Deployment Notes

- Backend: Render, Railway, Fly.io, or similar Node hosting.
- Frontend: Vercel, Netlify, or static hosting.
- Database: MongoDB Atlas.
- Files: use production object storage such as S3-compatible storage instead of local disk.
- Configure all environment variables in the deployment provider.

## Source-Control Notes

The repository includes `.gitignore` rules for dependencies, build output, local env files, and uploaded development files. The seeded demo document is kept at `server/uploads/seed-document.pdf` so sample request document links resolve during demos.

## Known MVP Limitations

- Email and SMS integrations are stubs.
- File storage is local development storage.
- Report templates are functional but intentionally simple.
- Frontend component tests are not added; TypeScript production build is used as the frontend verification baseline.
- Official confidential financial thresholds are not included; demo thresholds live in seed approval rules only.
