# TPL App

Full-stack web application with a **FastAPI** backend, **React + TypeScript** frontend, and **SQLite** database.

## Documentation

- Start here: `doc/setup-manual.qmd`
- CLI cookbook / Quarto usage: `doc/diy-manual.qmd`
- Database lifecycle and commands: `doc/database-manual.qmd`
- Server operations: `doc/server-manual.qmd`
- Security architecture and RBAC: `doc/security-manual.qmd`
- External interfaces architecture: `doc/interface-manual.qmd`
- Client operations: `doc/client-manual.qmd`
- Report builder usage and internals: `doc/report-builder-manual.qmd`
- Seeding and environments: `doc/seeding-manual.qmd`
- Specification authoring: `doc/specification-manual.qmd`
- Test execution and reports: `doc/test-manual.qmd`

## Project Structure

```
TPL-App/
├── backend/          # Python / FastAPI
│   ├── app/
│   │   ├── main.py         # App entrypoint
│   │   ├── database.py     # SQLAlchemy engine & session
│   │   ├── models.py       # ORM models
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── routers/        # API route modules
│   └── requirements.txt
├── frontend/         # React + TypeScript (Vite)
│   ├── src/
│   │   ├── App.tsx
│   │   └── api.ts          # Typed API client
│   └── package.json
└── README.md
```

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at **http://localhost:8000**. Interactive docs at `/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server runs at **http://localhost:5173** and proxies `/api` requests to the backend.

## Tech Stack

| Layer    | Technology                  |
|----------|-----------------------------|
| Backend  | FastAPI, SQLAlchemy, Pydantic |
| Frontend | React, TypeScript, Vite     |
| Database | SQLite                      |
