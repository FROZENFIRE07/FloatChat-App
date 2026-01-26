# FloatChat Frontend

React frontend for FloatChat ARGO Ocean Data Explorer

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
# Opens at http://localhost:3000

# Build for production
npm run build
```

## Features

- System health monitoring
- Database statistics display
- API endpoint documentation
- Responsive design
- Real-time backend connectivity

## API Integration

The frontend connects to the backend API at `http://localhost:5000/api/v1` by default.

To change the API URL, create `.env`:
```env
REACT_APP_API_URL=http://your-backend-url/api/v1
```

## Project Structure

```
src/
├── services/       # API client
├── App.js          # Main component
├── index.js        # Entry point
└── index.css       # Global styles
```

## Next Steps

This is the Module 3 status dashboard. Future modules will add:
- Interactive maps
- Depth profile charts
- Chat interface
- AI-powered queries
