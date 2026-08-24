# Asset Management System (MVP)

A full-stack asset management system designed to replace legacy Excel/VBA workflows.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Axios, Lucide React, React Toastify.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite.
- **Tools**: ExcelJS (Import/Export), JWT & Bcrypt (Auth).

## Project Structure
- `backend/`: Express server with Prisma models and business logic.
- `frontend/`: React single-page application with modern UI.

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
# Initialize database and seed admin user
npm run prisma:migrate
npm run prisma:seed
# Start the server
npm run dev
```
**Initial administrator:**
- Username: `admin`
- Set `INITIAL_ADMIN_PASSWORD` before the first production seed. The seed never
  overwrites an existing administrator password.
- Local development defaults to `admin123` and forces a password change.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## Key Features
- **Transaction-Safe Asset Codes**: Automatic generation of `COMPANY.G1.G2.G3.G4.NNN` codes.
- **Bulk Operations**: Assign, transfer, and create assets in bulk.
- **Inventory Verification**: Physical check-in via scanning/entry with missing asset reports.
- **BBBG Handover**: Generation of official handover document numbers.
- **Lifecycle Tracking**: Full event log and edit history for every asset.
- **Excel Import**: Bulk import from legacy Sosach Excel spreadsheets.
