# Product Requirements Document — Gym Management System

## 1. Overview

A web-based gym management system built for a single local gym (Abuja, Nigeria). The system replaces manual/paper-based tracking of members, payments, and attendance with a centralized dashboard, and lays the foundation for workflow automation (via n8n) on top of the core data.

This is a custom build for one gym client — not a multi-tenant SaaS product.

## 2. Problem Statement

Gym owners currently track membership status, renewals, and payments manually (or via disconnected spreadsheets). This leads to:
- Lost revenue from members whose expired memberships go unnoticed
- No visibility into attendance trends or daily business performance
- No systematic way to remind members before they lapse

## 3. Goals

- Give the gym owner a single dashboard for members, payments, and attendance
- Automate expiry reminders so renewal revenue isn't lost to forgetfulness
- Build a foundation that can absorb future automation (daily reports, payment webhooks) without redesigning the core system

## 4. Non-Goals (for MVP)

- Class/session scheduling — this gym is gym-floor access only, no classes
- Multi-location or multi-tenant support — single gym only
- Trainer accounts/logins — not required at this stage
- QR/card-based check-in — check-in is manual for MVP

## 5. Users & Roles

| Role | Access |
|---|---|
| Gym Owner (Admin) | Full access — members, plans, payments, dashboard |
| Front-desk Staff | Member management, check-in, payment recording |

## 6. Tech Stack

- **Frontend:** React.js
- **Backend:** Django + Django REST Framework
- **Database:** MySQL
- **Automation:** n8n (external, calling backend API endpoints)
- **Payments:** Flutterwave (planned integration, post-MVP)
- **Hosting:** Cloud VPS (e.g. DigitalOcean)

## 7. MVP Scope

1. Auth — Admin + front-desk staff login
2. Member management — create/edit/view/deactivate members
3. Membership plans — configurable plans (monthly/annual/student, etc.)
4. Subscriptions — assign plan to member, track status (active/expired/frozen)
5. Payments — manually recorded, tied to a subscription, renewal extends end date
6. Check-in — manual front-desk check-in log
7. Dashboard — active members, expiring-this-week, monthly revenue, today's check-ins
8. Expiry reminder support — API endpoints exposing expiring-soon subscriptions, consumed by an n8n workflow

## 8. Data Considerations

- No existing member data to migrate — system launches empty
- No gym branding/name finalized yet — build generic, theme-able later

## 9. Phased Roadmap

| Phase | Deliverable |
|---|---|
| 0 | Project foundation — models, auth, project setup |
| 1 | Member & plan management |
| 2 | Payments & renewals |
| 3 | Check-in |
| 4 | Dashboard (MVP launch point) |
| 5 | n8n automation — expiry reminders (WhatsApp/SMS) |
| 6 | n8n automation — daily owner report |
| 7 | Flutterwave payment gateway integration |
| 8 | Class/trainer scheduling (only if gym's offering changes) |
| 9 | Multi-location support (only if gym expands) |

## 10. Success Criteria

- Owner can see gym status (members, revenue, attendance) at a glance without manual bookkeeping
- No member lapses without at least one automated reminder being sent
- Front-desk staff can check a member in and record a payment in under 30 seconds each
