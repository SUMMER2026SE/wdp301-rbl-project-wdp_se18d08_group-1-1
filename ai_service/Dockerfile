FROM python:3.10-slim

# Install system dependencies for OpenCV and EasyOCR
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install python packages
COPY requirements.txt .
RUN pip install --default-timeout=2000 --retries 20 -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Run the API
CMD ["python", "main.py"]
