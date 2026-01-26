# FloatChat Backend

Backend API for FloatChat - Module 3: Backend Query Layer

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env to set database paths

# Development mode
npm run dev

# Production mode
npm start
```

## Environment Setup

Required in `.env`:
- `ARGO_DB_PATH` - Path to argo_database.db from Module 2
- `MONGODB_URI` - MongoDB connection string
- `PORT` - Server port (default: 5000)

## API Documentation

See main [README.md](../README.md) for complete API documentation.

## Project Structure

```
src/
├── config/         # Database configuration
├── controllers/    # Request handlers
├── services/       # Business logic
├── routes/         # API routes
├── middleware/     # Validation & error handling
└── server.js       # Application entry point
```

## Module 3 Principles

- READ-ONLY access to ARGO data
- No AI inference at this layer
- Deterministic responses only
- Input validation on all routes
- Consistent JSON structure
