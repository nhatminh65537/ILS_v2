FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# No EXPOSE/port published here — docker-compose maps the listen port to 127.0.0.1.
CMD ["python", "server.py"]
