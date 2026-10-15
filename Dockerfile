FROM python:3.13-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 WOLFMAN_DB=/app/data/games.sqlite3
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd --create-home moonfall
COPY backend ./backend
COPY frontend ./frontend
RUN mkdir /app/data && chown moonfall:moonfall /app/data
USER moonfall
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
