# GitHub Copilot Instructions

## Repository snapshot
- Pride is a Japan-first SNS × EC bundle: backend (FastAPI + SQLAlchemy + Alembic) serves `/api/*`, frontend (Next.js App Router + TypeScript + Tailwind, running with Turbopack) provides the UI, and Compose wires them together with Postgres, MailHog, and an nginx proxy.
- `Makefile` wraps common flows (`make setup`, `make up/down`, `make test`, etc.), `compose.yml` names the services, and `.env.example` documents the secrets (don’t commit a populated `.env`).

## Backend guidance

- FastAPI entrypoint lives at `backend/app/main.py`; routers live under `backend/app/api/routers` and should stay thin (validation → service call → response).
- Business logic and transactions belong in `backend/app/services` (e.g., `asset_service` for uploads); models live under `backend/app/models`, schemas in `backend/app/schemas`, dependencies in `backend/app/deps.py`, and exceptions under `backend/app/exceptions` (optional until a dedicated exception layer is needed).
- Configuration is centralized in `backend/app/core/config.py` (pydantic-settings) and `core/security.py` (Argon2 + JWT utilities). `settings` expose `ASSET_STORAGE_ROOT`, `ASSET_PUBLIC_BASE_URL`, JWT keys, and other env-driven knobs.
- Assets use ULID-based IDs, `storage/` on disk, and the local storage client under `backend/storage/` (exposed via `storage_client`); new upload paths should call `build_asset_path` so the folder layout stays consistent.
- SQLAdmin is wired via `backend/app/admin/sqladmin.py` and exposed at `/admin`; keep that module sync with models when you add new tables.

## Frontend guidance
- Frontend code lives in `frontend/` (Next 15.5.6 + React 19), uses the App Router (`frontend/app/`) with grouped routes (`(auth)`, `(posts)`, `(products)`), and relies on `frontend/app/layout.tsx` + `globals.css` for shared UI.
- `npm run dev` (Turbopack) boots the dev server on 3000; `npm run build`/`npm run start` are standard Next scripts. Keep new UI features under `frontend/app` or a new `features/` subfolder and prefer `@/*` imports backed by `tsconfig` aliases.

## Infrastructure & workflow
- Docker Compose services: `postgres` (15-alpine), `backend`, `frontend`, `nginx` (reverse proxy, config in `nginx.conf`), and `mailhog` for SMTP testing; `backend` depends on Postgres, `frontend` depends on backend, and nginx fronts both.
- Backend configuration keys (JWT private/public/secret) are wired through `.env` and automatically generated with `make keys` when RS256 is selected. `Makefile` also runs migrations (`make migrate`) and creates `pride_db_test` for tests.
- Always double-check `docs/DIRECTORY_STRUCTURE.md`, `.github/WORKFLOW.md`, and `README.md` before reorganizing core files; those explain responsible layering, directories, and branching rules.

## Testing & quality
- Backend tests live under `backend/tests/`. `tests/conftest.py` overrides `settings` for HS256, spins up a dedicated test database (`pride_db_test`), and exposes `client` + `db_session` fixtures (factory-boy factories are in `tests/factories`).
- Run tests via `make test` (calls `docker compose exec backend python -m pytest tests/ -v`) or via the instructions in `docs/TESTING.md`. Keep new tests fast by reusing fixtures and cleaning up storage when necessary.
- When touching uploads/assets, clean or isolate `settings.ASSET_STORAGE_ROOT` so tests can safely create files; refer to `tests/routers/test_api_uploads.py` for a working example.

## Documentation & next steps
- Update docs (`docs/` for architecture, `README.md` for onboarding) whenever you introduce new APIs, routes, or infra changes; follow the existing Japanese/English mix style.
- Use `docs/SWAGGER_UI.md` for API testing notes, `docs/MIGRATE.md` for Alembic practices, and `.github/SAMPLE_ISSUES.md` to craft new issues.
- After large changes, suggest rerunning `make test`, `docker compose up --build`, or any relevant frontend `npm run lint` as verification steps.

## Communication conventions
- When the user requests Japanese output, think through responses in English to ensure clarity and accuracy, then reply entirely in Japanese unless explicitly instructed otherwise.
