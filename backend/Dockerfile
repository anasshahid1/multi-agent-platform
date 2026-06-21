FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (gcc needed for psutil compilation)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gcc python3-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --timeout=300 --retries=10 -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /app/data

# Handle SSL interception from corporate proxies (Zscaler, etc.)
# The PYTHONHTTPSVERIFY env var is set in docker-compose.yml when needed
RUN python3 -c "import ssl; print(ssl.get_default_verify_paths())"

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
