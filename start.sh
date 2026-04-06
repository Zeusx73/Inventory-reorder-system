#!/bin/bash

# Navigate to backend
cd backend

# Install dependencies (Railway does this, but this ensures they're ready)
pip install -r requirements.txt

# Start FastAPI with Uvicorn
# We use 0.0.0.0 and the $PORT variable so Railway can see the app
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
