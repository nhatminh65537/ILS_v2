FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

# The deploy server reads this EXPOSE to know which container port to publish.
EXPOSE 5000

# The per-user flag is provided at run time via the FLAG env var (deploy server).
CMD ["python", "app.py"]
