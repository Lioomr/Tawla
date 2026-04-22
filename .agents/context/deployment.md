# DEPLOYMENT - TAWLAX

## Purpose

Document the current deployment shape for local development and the current production-oriented container path.

This document describes the implementation that exists today. It does not authorize new infrastructure.

---

## Current Runtime Shapes

### Local Development

`docker-compose.yml` starts:

* `db` - PostgreSQL 17
* `backend` - Django + Daphne container
* `frontend` - Next.js development server

Ports:

* Backend: `8000`
* Frontend: `3000`
* PostgreSQL: `5432`

### Production-Oriented Compose

`docker-compose.prod.yml` currently starts:

* `db`
* `backend`

Current limitation:

* Production compose does not include a frontend container yet

---

## Backend Environment Variables

Documented in:

* `backend/.env.example`
* `backend/.env.production.example`

Current variables:

* `APP_ENV`
* `DJANGO_SECRET_KEY`
* `DJANGO_DEBUG`
* `DJANGO_ALLOWED_HOSTS`
* `TABLE_SESSION_DURATION_MINUTES`
* `POSTGRES_DB`
* `POSTGRES_USER`
* `POSTGRES_PASSWORD`
* `POSTGRES_HOST`
* `POSTGRES_PORT`
* `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`
* `JWT_REFRESH_TOKEN_LIFETIME_DAYS`
* `JWT_ROTATE_REFRESH_TOKENS`
* `JWT_BLACKLIST_AFTER_ROTATION`
* `JWT_UPDATE_LAST_LOGIN`
* `RATE_LIMIT_STAFF_LOGIN`
* `RATE_LIMIT_ORDER_CREATE`
* `RATE_LIMIT_PAYMENT_CREATE`

---

## Realtime and Cache Runtime

Current runtime uses:

* In-memory Channels layer
* Local memory cache

Production requirement before multi-instance deployment:

* Redis-backed Channels layer
* Shared cache

Without Redis, realtime delivery and throttling state are only safe for a single backend instance.

---

## CORS and Frontend Origin Notes

Current backend settings allow:

* `http://localhost:3000`
* `http://127.0.0.1:3000`

Implications:

* Local frontend works out of the box
* Production frontend origin is not configurable through env today
* Non-local frontend deployment requires an explicit settings update before release

---

## Host and TLS Notes

Current backend host control:

* `DJANGO_ALLOWED_HOSTS`

Current gap:

* No source-of-truth document yet defines reverse proxy, TLS termination, or domain routing

Until that exists, production rollout must explicitly validate:

* Public API domain
* TLS certificate handling
* Proxy forwarding to Daphne
* Allowed hosts configuration

---

## Container Entry Notes

Backend container:

* Uses `backend/Dockerfile`
* Starts through `backend/entrypoint.sh`
* Uses Daphne in production-oriented flow

Frontend container:

* Uses `frontend/Dockerfile`
* Runs `npm run dev`
* Is intended for development, not a hardened production serve path

---

## Deployment Summary

Today the repository supports:

* Full local development with backend, frontend, and PostgreSQL
* A production-oriented backend container flow

Before real production rollout, the following must be finalized:

* Redis-backed realtime/cache infrastructure
* Production frontend hosting path
* Production CORS configuration
* Domain and TLS setup
