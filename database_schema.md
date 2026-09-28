# Database Schema — Gym Management System

Database engine: **MySQL**

## Table: `membership_plan`

| Column | Type | Constraints |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| name | VARCHAR(100) | NOT NULL |
| duration_days | INT | NOT NULL |
| price | DECIMAL(10,2) | NOT NULL |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

## Table: `member`

| Column | Type | Constraints |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| full_name | VARCHAR(150) | NOT NULL |
| phone_number | VARCHAR(20) | NOT NULL, UNIQUE — stored in international format e.g. +234... |
| email | VARCHAR(150) | NULL |
| photo | VARCHAR(255) | NULL — file path/URL |
| date_joined | DATE | NOT NULL, DEFAULT CURRENT_DATE |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE |

## Table: `subscription`

| Column | Type | Constraints |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| member_id | INT | FK → member.id, NOT NULL |
| plan_id | INT | FK → membership_plan.id, NOT NULL |
| start_date | DATE | NOT NULL |
| end_date | DATE | NOT NULL |
| status | ENUM('active','expired','frozen','cancelled') | NOT NULL, DEFAULT 'active' |
| reminder_sent | BOOLEAN | NOT NULL, DEFAULT FALSE |
| reminder_sent_at | DATETIME | NULL |

**Indexes:** `(status, end_date)` — supports the daily expiry-check job and the `expiring-soon` API query.

## Table: `payment`

| Column | Type | Constraints |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| subscription_id | INT | FK → subscription.id, NOT NULL |
| amount | DECIMAL(10,2) | NOT NULL |
| payment_date | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| method | ENUM('cash','bank_transfer','card','flutterwave') | NOT NULL |
| recorded_by_id | INT | FK → auth_user.id, NULL — staff who logged it |

## Table: `check_in`

| Column | Type | Constraints |
|---|---|---|
| id | INT | PK, AUTO_INCREMENT |
| member_id | INT | FK → member.id, NOT NULL |
| timestamp | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**Index:** `(member_id, timestamp)` — supports attendance history lookups.

## Relationships Summary

```
membership_plan  1 ──< subscription >── 1  member
subscription     1 ──< payment
member           1 ──< check_in
```

## Notes

- `Subscription.status` is a stored field (not computed live) — a daily scheduled job flips `active` → `expired` based on `end_date`. `frozen` is a manual state only, never auto-set.
- `reminder_sent` resets to `FALSE` whenever a subscription is renewed (new payment extending `end_date`), so the reminder cycle repeats each period.
- Auth/user accounts (Owner, Front-desk staff) use Django's built-in `auth_user` table with a role distinction handled via Django Groups or a simple `role` field on a profile table — to be finalized in Phase 0.
