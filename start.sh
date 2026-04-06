#!/bin/bash
set -e
echo "Starting FastAPI app..."
uvicorn main:app --host 0.0.0.0 --port $PORT --reload

