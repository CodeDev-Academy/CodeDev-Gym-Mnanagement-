# Tasks.md — Implementation Plan

Checklist-style breakdown by phase. Work top to bottom — each phase should be functional before moving to the next.

## Phase 0 — Foundation

- [x] Create Django project (`config`) and core apps: `members`, `memberships`, `payments`, `attendance`, `dashboard`, `accounts`
- [x] Configure DB connection settings (SQLite for local dev, MySQL-ready)
- [x] Install DRF, configure Token Authentication
- [x] Define models: `MembershipPlan`, `Member`, `Subscription`, `Payment`, `CheckIn`
- [x] Run initial migrations
- [x] Create superuser (Owner account)
- [x] Set up React project, connect to Django API base URL
- [x] Build login screen (React) + token storage
- [x] Verify: log in from React, receive token, store it, hit one protected test endpoint

## Phase 1 — Member & Plan Management

- [x] `MembershipPlan` CRUD API (list/create/update/deactivate)
- [x] `Member` CRUD API (list/create/update/deactivate)
- [x] Endpoint to assign a plan to a member (creates a `Subscription`, sets `end_date = start_date + plan.duration_days`)
- [x] React: Plans management screen
- [x] React: Member list + add/edit form
- [x] React: "Assign plan" action on a member
- [x] Verify: create a plan, add a member, assign the plan, confirm subscription status shows "active"

## Phase 2 — Payments

- [x] `Payment` create API, tied to a `subscription_id`
- [x] Renewal logic: new payment extends `Subscription.end_date`, resets `reminder_sent = False`
- [x] Payment history endpoint per member
- [x] React: "Record payment" form on member detail page
- [x] React: Payment history list on member detail page
- [x] Verify: record a payment, confirm end_date extends correctly; test renewal resets reminder_sent

## Phase 3 — Check-in

- [x] `CheckIn` create API (member search + mark present)
- [x] Check-in history endpoint per member
- [x] React: Check-in screen (search member, one-click mark present)
- [x] Verify: check in a member, confirm it appears in their history

## Phase 4 — Dashboard (MVP launch point)

- [x] Aggregate endpoint: active member count
- [x] Aggregate endpoint: expiring-this-week list
- [x] Aggregate endpoint: this month's revenue total
- [x] Aggregate endpoint: today's check-in count
- [x] React: Dashboard screen pulling all four
- [x] Full walkthrough test: add member → assign plan → record payment → check in → confirm dashboard reflects all of it
- [x] **MVP considered complete at this point**

## Phase 5 — n8n Automation: Expiry Reminders

- [ ] Add `reminder_sent` / `reminder_sent_at` fields to `Subscription` (if not already in Phase 0 models)
- [ ] `GET /api/subscriptions/expiring-soon/?days=3` endpoint
- [ ] `PATCH /api/subscriptions/<id>/mark-reminded/` endpoint
- [ ] Generate static API token for n8n, configure as n8n credential
- [ ] Build n8n workflow: Schedule Trigger → HTTP Request → Loop → WhatsApp send → mark-reminded
- [ ] Test with a manually-set subscription expiring in 3 days
- [ ] Confirm no duplicate message sent the next day

## Phase 6 — n8n Automation: Daily Owner Report

- [ ] `GET /api/dashboard/daily-summary/` endpoint (revenue today, check-ins today, new members today)
- [ ] n8n workflow: Schedule Trigger (morning) → HTTP Request → format message → send to owner's WhatsApp
- [ ] Verify message arrives correctly formatted

## Phase 7 — Flutterwave Integration

- [ ] Flutterwave account/API keys set up
- [ ] Payment initiation flow (React → Django → Flutterwave)
- [ ] Webhook endpoint (`/api/payments/webhook/`) to receive payment confirmation
- [ ] Webhook creates `Payment` record + extends subscription automatically
- [ ] Test with Flutterwave sandbox

## Phase 8+ — Deferred / Conditional

- [ ] Class/trainer scheduling — only if the gym adds classes
- [ ] Multi-location support — only if the gym expands to a second branch

## Deployment Tasks (parallel, once Phase 4 is stable)

- [ ] Provision VPS (DigitalOcean or similar)
- [ ] Set up Nginx + Gunicorn for Django
- [ ] Set up MySQL on VPS (or managed DB)
- [ ] Build & deploy React static files
- [ ] Set up n8n (Docker) on VPS or separate instance
- [ ] Configure HTTPS (Let's Encrypt)
