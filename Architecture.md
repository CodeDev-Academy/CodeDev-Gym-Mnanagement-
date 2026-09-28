# Architecture.md — Gym Management System

## 1. System Overview

Three independent pieces, each replaceable without touching the others:

```
┌─────────────┐      REST API       ┌──────────────┐      SQL       ┌─────────┐
│   React     │  <─────────────────>  │    Django    │  <──────────>  │  MySQL  │
│  (frontend) │                     │  + DRF (API) │                │  (data) │
└─────────────┘                     └──────┤───────┘                └─────────┘
                                            │
                                            │ REST API (token auth)
                                            ▼
                                     ┌──────────────┐
                                     │     n8n      │
                                     │ (automation) │
                                     └──────┤───────┘
                                            │
                                            ▼
                                   WhatsApp / SMS (Flutterwave later)
```

- **React** talks only to the Django API — never directly to the database.
- **Django/DRF** owns all business logic and data validation. It is the single source of truth.
- **n8n** is a client of the Django API, exactly like React is — it has no direct database access. It authenticates with a separate static API token (not a user login).
- **MySQL** is only ever touched by Django (via the ORM).

## 2. Why this separation matters

Automation logic (schedules, message templates, retries) lives entirely in n8n, not in Django. This means:
- Changing how/when reminders are sent = editing an n8n workflow, no backend deploy needed
- Django stays a plain CRUD + business-rules API, easy to reason about and test
- If n8n is ever swapped for a different automation tool, only the "client" changes — Django's API contract doesn't

## 3. Backend Structure (Django)

```
gym_backend/
├── config/                # Django project settings, urls, wsgi/asgi
├── members/               # Member model, serializers, views
├── memberships/           # MembershipPlan, Subscription models/logic
├── payments/              # Payment model, renewal logic
├── attendance/            # CheckIn model
├── dashboard/             # Aggregate/summary endpoints (dashboard, expiring-soon, daily-summary)
├── accounts/              # Auth, roles (Owner / Front-desk)
└── manage.py
```

Each Django app maps to one bounded concern from the schema — keeps models and their business logic (e.g. "reset reminder_sent on renewal") colocated with the data they affect.

## 4. Frontend Structure (React)

```
gym_frontend/
├── src/
│   ├── api/            # Axios/fetch client, one function per endpoint
│   ├── auth/           # Login, token storage, protected routes
│   ├── members/        # Member list, add/edit forms
│   ├── memberships/    # Plans, subscription assignment
│   ├── payments/       # Payment recording, history views
│   ├── checkin/        # Check-in screen
│   ├── dashboard/      # Owner dashboard
│   └── App.jsx
```

## 5. Authentication Architecture

- **Human users (Owner, Front-desk):** DRF Token or JWT, issued on login, stored client-side, sent as `Authorization` header from React.
- **n8n:** A separate, long-lived static API token stored in n8n's credential store — never expires on a schedule tied to human sessions, since n8n runs unattended.

## 6. Automation Flow (Phase 5 example — expiry reminders)

1. n8n Schedule Trigger fires daily (e.g. 8am)
2. n8n calls `GET /api/subscriptions/expiring-soon/?days=3`
3. n8n loops over results
4. For each member, n8n sends a WhatsApp message
5. On success, n8n calls `PATCH /api/subscriptions/<id>/mark-reminded/`

Django never initiates this flow — it only responds to n8n's calls. This keeps Django stateless with respect to automation timing.

## 7. Deployment Architecture (planned)

- Single cloud VPS (e.g. DigitalOcean droplet)
- Django served via Gunicorn + Nginx reverse proxy
- MySQL running on the same VPS initially (managed DB service can replace this later if load grows)
- React built as static files, served by Nginx alongside the API
- n8n can run on the same VPS (Docker container) or a separate small instance — either works since it only communicates over HTTPS with the Django API

## 8. Future Integration Points (not built yet, but architecture allows for)

- **Flutterwave webhook:** a new Django endpoint (`/api/payments/webhook/`) that Flutterwave calls directly on successful payment — bypasses n8n entirely for this flow since it's event-driven, not scheduled
- **Daily owner report:** reuses the exact same n8n pattern as expiry reminders, pointed at a new `/api/dashboard/daily-summary/` endpoint
