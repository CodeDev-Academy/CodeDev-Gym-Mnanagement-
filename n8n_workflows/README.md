# n8n Automation Workflows & Railway Integration Guide

This directory contains the production-grade automation workflows for the **Gym Management System**, specifically built with enterprise-level safeguards against carrier rejections, rate limits, API timeouts, and stale credentials.

---

## Workflows Included

1. **`expiry_reminders_workflow.json` (Phase 5)**:
   - **Trigger:** Daily at 08:00 AM West Africa Time (`Africa/Lagos`).
   - **Endpoint:** `GET /api/subscriptions/expiring-soon/?days=3`
   - **Action:** Sends 3-day pre-expiry warning to athlete via Telegram (`Dr ai_bot`); marks subscription reminded.
   - **Live Railway Canvas:** [https://n8n-production-d5bb.up.railway.app/workflow/dcR81UrElWSeIJjL](https://n8n-production-d5bb.up.railway.app/workflow/dcR81UrElWSeIJjL) (ID: `dcR81UrElWSeIJjL`)

2. **`daily_owner_summary_workflow.json` (Phase 6)**:
   - **Trigger:** Daily at 07:00 AM West Africa Time (`Africa/Lagos`).
   - **Endpoint:** `GET /api/dashboard/daily-summary/?date=yesterday`
   - **Action:** Full 24h wrap-up (revenue `₦`, check-ins, unique athletes, new enrollees, expiries) delivered via Telegram to Owner (`chatId: 5433612668`).
   - **Live Railway Canvas:** [https://n8n-production-d5bb.up.railway.app/workflow/8spZAMbk8eOlWJIF](https://n8n-production-d5bb.up.railway.app/workflow/8spZAMbk8eOlWJIF) (ID: `8spZAMbk8eOlWJIF`)

3. **`inactive_members_workflow.json` (Phase 7)**:
   - **Trigger:** Every Monday at 10:00 AM West Africa Time (`Africa/Lagos`).
   - **Endpoint:** `GET /api/reminders/pending/` (extracts `inactive_14d` queue).
   - **Action:** Re-engages active pass holders absent for 14+ days via Telegram; marks cooldown via `POST /api/reminders/mark-sent/`.
   - **Live Railway Canvas:** [https://n8n-production-d5bb.up.railway.app/workflow/ozRzbNXoUt0P1DvI](https://n8n-production-d5bb.up.railway.app/workflow/ozRzbNXoUt0P1DvI) (ID: `ozRzbNXoUt0P1DvI`)

4. **`lapsed_winback_workflow.json` (Phase 7)**:
   - **Trigger:** Every Thursday at 11:00 AM West Africa Time (`Africa/Lagos`).
   - **Endpoint:** `GET /api/reminders/pending/` (processes `lapsed_7d`, `lapsed_30d`, and `lapsed_60d` queues).
   - **Action:** Multi-stage win-back messages based on days since expiration via Telegram; advances lapsed stages atomically via `POST /api/reminders/mark-sent/`.
   - **Live Railway Canvas:** [https://n8n-production-d5bb.up.railway.app/workflow/Ysn802Jb9S2YZiss](https://n8n-production-d5bb.up.railway.app/workflow/Ysn802Jb9S2YZiss) (ID: `Ysn802Jb9S2YZiss`)

5. **`Shared Error Notification Handler` (Universal Failure Trigger)**:
   - **Trigger:** Error Trigger (`n8n-nodes-base.errorTrigger`).
   - **Target:** Sends instant markdown alerts to Telegram (`chatId: 5433612668`).
   - **Payload Content:** Workflow Name, Workflow ID, Specific Failed Node name, Error Message, Execution ID, and Direct URL to execution inspect panel.
   - **Live Railway Canvas:** [https://n8n-production-d5bb.up.railway.app/workflow/Qug3KsM2Rnq9RUel](https://n8n-production-d5bb.up.railway.app/workflow/Qug3KsM2Rnq9RUel) (ID: `Qug3KsM2Rnq9RUel`)

---

## 1. Live Workflows on Railway n8n

All 4 production workflows are live and connected to the Universal Error Notification Handler (`Qug3KsM2Rnq9RUel`):
1. **3-Day Expiry Reminders:** [https://n8n-production-d5bb.up.railway.app/workflow/dcR81UrElWSeIJjL](https://n8n-production-d5bb.up.railway.app/workflow/dcR81UrElWSeIJjL) (Error Handler attached)
2. **Daily Owner Summary Report:** [https://n8n-production-d5bb.up.railway.app/workflow/8spZAMbk8eOlWJIF](https://n8n-production-d5bb.up.railway.app/workflow/8spZAMbk8eOlWJIF) (Error Handler attached)
3. **Inactive Member Rescue (14d):** [https://n8n-production-d5bb.up.railway.app/workflow/ozRzbNXoUt0P1DvI](https://n8n-production-d5bb.up.railway.app/workflow/ozRzbNXoUt0P1DvI) (Error Handler attached)
4. **Lapsed Member Win-Back (7d/30d/60d):** [https://n8n-production-d5bb.up.railway.app/workflow/Ysn802Jb9S2YZiss](https://n8n-production-d5bb.up.railway.app/workflow/Ysn802Jb9S2YZiss) (Error Handler attached)
5. **Universal Telegram Error Handler:** [https://n8n-production-d5bb.up.railway.app/workflow/Qug3KsM2Rnq9RUel](https://n8n-production-d5bb.up.railway.app/workflow/Qug3KsM2Rnq9RUel)


---

## 2. Prerequisites & Credentials

### A. Django Service Account Token
Your static background automation token has already been generated via:
```bash
python manage.py setup_automation_bot
```
- **Service Account Username:** `automation_bot`
- **Role Tier:** `OWNER` (full access to reporting and update endpoints)
- **Token Key:** `6b0a703984803148e8c5ae42b621200ccfb44ea0`

### B. Twilio WhatsApp Sandbox
1. Log in to your [Twilio Console](https://console.twilio.com/).
2. Under **Messaging** ➔ **Try it out** ➔ **Send a WhatsApp message**, locate your Twilio Sandbox phone number (`whatsapp:+17372212163`) and your join code (`join-twilio-trial`).
3. On your test phone (or gym owner's phone), send `join <your-code>` via WhatsApp to the Twilio number to activate the 24-hour sandbox testing window.



---

## 3. Configuring n8n Credentials

### Credential 1: Header Auth (`Gym API Token`)
1. In n8n, navigate to **Credentials** ➔ **New Credential**.
2. Search for and select **Header Auth**.
3. Configure the credential:
   - **Credential Name:** `Gym API Token`
   - **Name:** `Authorization`
   - **Value:** `Token 6b0a703984803148e8c5ae42b621200ccfb44ea0`
4. Click **Save**.

### Credential 2: Twilio Account
1. In n8n, navigate to **Credentials** ➔ **New Credential**.
2. Select **Twilio API**.
3. Configure your Twilio credentials:
   - **Account SID:** (from your Twilio Console dashboard)
   - **Auth Token:** (from your Twilio Console dashboard)
4. Click **Save**.

---

## 4. Connecting Railway n8n to Local Django (Development)

Because your n8n instance is hosted on Railway in the cloud, it cannot directly reach `http://127.0.0.1:8000`. Use an ngrok tunnel while developing locally:

1. In your terminal, launch an ngrok tunnel to your Django server:
   ```bash
   ngrok http 8000
   ```
2. Copy the public forwarding HTTPS URL (e.g. `https://a1b2-your-tunnel.ngrok-free.app`).
3. In n8n, open the **`Initialize Environment`** node (or set an n8n variable named `API_BASE_URL`):
   - Set `api_base_url` to your ngrok forwarding URL without trailing slash.
   - Example: `https://a1b2-your-tunnel.ngrok-free.app`
4. When your Django API is later deployed to production (Phase 8), simply update this value to `https://api.yourgym.com`.

---

## 5. Testing the Workflow

1. In n8n, click the **Test Workflow** button (bottom bar).
2. The workflow will:
   - Fetch all members expiring within 3 days who haven't yet received a reminder.
   - Sanitize each phone number into canonical `whatsapp:+234...`.
   - Dispatch the personalized WhatsApp reminder via Twilio.
   - Call Django's `/api/subscriptions/<id>/mark-reminded/` to atomically mark the subscription as reminded.
   - Pause for 1.5 seconds between members.
3. Refresh your Django backend or check the Django admin: `reminder_sent` will now be `True` and `reminder_sent_at` will be stamped.
4. Once verified, flip the top-right toggle from **Inactive** to **Active** to let the daily 8:00 AM WAT scheduler run automatically!
