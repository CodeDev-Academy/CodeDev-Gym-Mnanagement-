# Lean production Dockerfile for Gym Management Backend on Coolify
FROM python:3.12-slim-bookworm

# Python environment settings
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install PostgreSQL client libraries and essential build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for efficient layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY . .

# Ensure entrypoint script is executable
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]

