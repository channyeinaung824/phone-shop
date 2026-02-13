# How to Run the Project

## Prerequisites
- Node.js (LTS version)
- PostgreSQL (running locally)

## Quick Start
1.  **Database**: Ensure your local PostgreSQL is running and the database `phone_shop_v2` exists.
    - If not, check `.env` in `backend/` and run `npx prisma migrate dev` in `backend/`.
2.  **Start Servers**:
    - Double-click `start-project.bat` in the root folder.
    - OR run manually:
        - Backend: `cd backend && npm run dev`
        - Frontend: `cd frontend && npm run dev`

## Access
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Login Credentials**:
    - Email: `admin@phoneshop.com`
    - Password: `password123`

## Troubleshooting
- If "Database URL not found", check `backend/.env`.
- If "Module not found" in frontend, try `cd frontend && npm install`.
