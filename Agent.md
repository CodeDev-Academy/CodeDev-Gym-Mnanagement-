# agent.md - Gym Management System

Context file for any AI coding assistant (Claude Code, etc.) working on this project.

## Project Summary

A gym management web app built for one specific gym (not a multi-tenant SaaS). Built solo by the developer. React frontend + Django REST backend + MySQL, with n8n handling scheduled automation (starting with expiry reminders) by calling the Django API - automation logic lives in n8n, not in Django.

## Tech Stack

- **Frontend:** React.js (fetches from DRF API)
- **Backend:** Django + Django REST Framework
- **Database:** MySQL
- **Auth:** Token-based (DRF Token or JWT) - two roles: Owner (Admin), Front-desk Staff
- **Automation:** n8n (external service, not part of the codebase) - calls backend endpoints on a schedule
- **Payments (future):** Flutterwave
- **Hosting (planned):** Cloud VPS (DigitalOcean or similar)

## Core Models

- MembershipPlan - name, duration_days, price, is_active
- Member - full_name, phone_number, email, photo, date_joined, is_active
- Subscription - links Member + MembershipPlan, tracks start_date/end_date/status, reminder_sent/reminder_sent_at
- Payment - tied to a Subscription, records amount/method/who recorded it
- CheckIn - simple member + timestamp log

See database_schema.md for full field-level detail.

## Key Design Decisions (do not deviate without discussion)

- Subscription.status is a **stored field**, updated by a scheduled job - not computed live from dates. frozen is always a manual state.
- Check-in is **manual only** for MVP - no QR/RFID scanning logic should be introduced.
- No class/scheduling models - this gym has gym-floor access only.
- Payments are recorded manually in MVP phases; Flutterwave integration is a later phase (Phase 7), not part of initial build.
- reminder_sent must reset to False on renewal - required for the expiry-reminder automation to keep working correctly across renewal cycles.
- Automation logic (WhatsApp sending, scheduling, message templates) lives in **n8n workflows**, not in Django. Django job is only to expose the data via API endpoints (e.g. /api/subscriptions/expiring-soon/, /api/subscriptions/<id>/mark-reminded/).

## API Conventions

- REST endpoints under /api/
- n8n authenticates via a static API token (Header Auth), not session auth
- Endpoints consumed by n8n should return flat, minimal JSON (no deep nesting) since n8n iterates over arrays directly

## Build Order (see PRD.md for full roadmap)

Phase 0 (foundation) -> Phase 1 (members/plans) -> Phase 2 (payments) -> Phase 3 (check-in) -> Phase 4 (dashboard = MVP launch) -> Phase 5 (n8n expiry reminders) -> later phases as needed.

Do not build class scheduling, multi-location support, or payment gateway integration unless explicitly requested - these are deliberately deferred.

## Developer Preferences

- Prefers complete, exact commands over placeholder/template instructions
- Prefers a plain-English explanation of a concept before implementation code is written