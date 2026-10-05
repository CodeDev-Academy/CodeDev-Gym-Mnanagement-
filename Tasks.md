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

## Phase 5 — Retention, Expiry Reminders & Notifications

- [x] Add `reminder_sent` / `reminder_sent_at` / `lapsed_stage` / `last_lapsed_reminder_at` fields to `Subscription`
- [x] Add `last_inactivity_reminder_at` field to `Member`
- [x] Create and seed `ReminderTemplate` model with customizable copy
- [x] `GET /api/subscriptions/expiring-soon/?days=3` endpoint
- [x] `PATCH /api/subscriptions/<id>/mark-reminded/` endpoint
- [x] `GET /api/reminders/pending/` endpoint (5 retention queues: 3-day expiry, 7-day lapsed, 30-day lapsed, 60-day lapsed, 14-day absent pass holders)
- [x] `POST /api/reminders/mark-sent/` endpoint for batch milestone progression
- [x] Instant Subscription Welcome & Digital Receipt on plan assignment (`POST /api/subscriptions/`)
- [x] Frontend Retention & Reminders Desk at `/reminders` with tabs, batch selection, template customizer, and 1-Click WhatsApp Web direct chat
- [x] Build/import n8n automated reminder workflow (Schedule Trigger → HTTP Request → WhatsApp Send → Mark Sent)
- [x] Configure Twilio WhatsApp credentials for automated background dispatch

## Phase 6 — n8n Automation: Daily Owner Report
 
- [x] `GET /api/dashboard/daily-summary/` endpoint (revenue today/yesterday, check-ins, unique athletes, new members, expirations)
- [x] n8n workflow: Schedule Trigger (07:00 AM WAT) → HTTP Request → format executive Naira briefing → send to owner's WhatsApp
- [x] Verify message arrives correctly formatted


## Phase 7 — Retention & Win-Back Automation Workflows (Option B Modular)

- [x] Inactive Pass Holders Rescue (14-Day Absence) workflow (`inactive_members_workflow.json` / ID `ozRzbNXoUt0P1DvI`) — Mondays at 10:00 AM WAT
- [x] Lapsed Member Win-Back Pipeline (7d, 30d, 60d) workflow (`lapsed_winback_workflow.json` / ID `Ysn802Jb9S2YZiss`) — Thursdays at 11:00 AM WAT
- [x] Full atomic progression via `POST /api/reminders/mark-sent/` with cooldown protection
- [x] Zero-blast-radius modular architecture with Twilio error shielding and rate-limit pacers

## Phase 8+ — Deferred / Conditional

- [ ] Flutterwave online gateway — removed/deferred (gym operates on counter Cash, POS, and direct Bank Transfer at reception with zero gateway fees)
- [ ] Class/trainer scheduling — only if the gym adds classes
- [ ] Multi-location support — only if the gym expands to a second branch


## Deployment Tasks (parallel, once Phase 4 is stable)

- [ ] Provision VPS (DigitalOcean or similar)
- [ ] Set up Nginx + Gunicorn for Django
- [ ] Set up MySQL on VPS (or managed DB)
- [ ] Build & deploy React static files
- [ ] Set up n8n (Docker) on VPS or separate instance
- [ ] Configure HTTPS (Let's Encrypt)
