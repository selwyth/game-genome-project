FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY taxonomy.yaml ./
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
WORKDIR /app/backend
CMD python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
