.PHONY: bootstrap dev api up down test lint build seed

bootstrap:
	npm ci

dev:
	npm run dev

api:
	go run ./services/api

up:
	docker compose up --build

down:
	docker compose down

test:
	go test ./services/... ./datasets/...
	npm run build
	npm test

lint:
	gofmt -w services
	go vet ./services/... ./datasets/...
	npm run lint

build:
	npm run build
	go build ./services/api

seed:
	@echo "Seed 90426 is compiled into the deterministic demo adapter."
