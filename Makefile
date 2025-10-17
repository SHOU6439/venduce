.PHONY: setup up down logs clean

setup:
    cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
    cd frontend && npm install

up:
    docker compose up -d

down:
    docker compose down

logs:
    docker compose logs -f

clean:
    docker compose down
    docker system prune -f

rebuild:
    docker compose down
    docker compose up -d --build