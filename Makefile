.PHONY: install api web test dev docker-up

install:
	cd apps/api && python3.13 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pip install pytest
	cd apps/web && npm install

api:
	cd apps/api && . .venv/bin/activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000

web:
	cd apps/web && npm install && npm run dev -- --host 0.0.0.0

test:
	cd apps/api && . .venv/bin/activate && PYTHONPATH=. pytest -q

dev:
	$(MAKE) api &
	$(MAKE) web

docker-up:
	docker compose up --build
