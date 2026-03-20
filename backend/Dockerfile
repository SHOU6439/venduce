FROM python:3.13-slim

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV PYTHONIOENCODING=utf-8

WORKDIR /app

COPY requirements.txt .
RUN apt update && \
  apt install -y --no-install-recommends libmagic1 && \
  rm -rf /var/lib/apt/lists/*
RUN pip install --upgrade pip && \
  pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*", "--reload"]
