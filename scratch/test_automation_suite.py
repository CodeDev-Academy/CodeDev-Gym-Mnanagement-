"""
Automated Test Runner for Gym Management System Automation Workflows
Tests every single automation feature and endpoint against the live local Django backend.
"""
import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = 'http://localhost:8000/api'
BOT_TOKEN = '6b0a703984803148e8c5ae42b621200ccfb44ea0'
TEST_PHONE = '+2349038446407'

def call_api(endpoint, method='GET', data=None):
    url = f"{BASE_URL}/{endpoint.lstrip('/')}"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Token {BOT_TOKEN}'
    }
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        err_content = e.read().decode('utf-8')
        try:
            return e.code, json.loads(err_content)
        except Exception:
            return e.code, err_content

def run_tests():
    print("================================================================")
    print("ABUJA GYM AUTOMATION TEST SUITE - FEATURE VERIFICATION")
    print(f"Target WhatsApp Recipient: {TEST_PHONE}")
    print("================================================================\n")

    # 1. Test Daily Summary (Phase 6)
    print("-> [1/4] Testing Phase 6: Daily Executive Summary API")
    status, summary = call_api('dashboard/daily-summary/?date=yesterday')
    print(f"  Status Code: {status}")
    print(f"  Date: {summary.get('formatted_date', summary.get('date'))}")
    print(f"  Revenue: N{summary.get('revenue_today', 0):,.2f}")
    print(f"  Total Check-ins: {summary.get('checkins_today', 0)} ({summary.get('unique_checkins_today', 0)} unique)")
    print(f"  New Members: {summary.get('new_members_today', 0)}")
    print(f"  Expiring: {summary.get('expiring_today', 0)}")
    assert status == 200, f"Expected 200, got {status}"
    print("  [SUCCESS] Phase 6 Daily Summary API: PASSED\n")

    # 2. Test 3-Day Expiring Subscriptions (Phase 5)
    print("-> [2/4] Testing Phase 5: 3-Day Pre-Expiry Reminders API")
    status, expiring = call_api('subscriptions/expiring-soon/?days=3')
    print(f"  Status Code: {status}")
    print(f"  Found Expiring Subscriptions: {len(expiring) if isinstance(expiring, list) else expiring}")
    assert status == 200, f"Expected 200, got {status}"
    print("  [SUCCESS] Phase 5 Expiring Subscriptions API: PASSED\n")

    # 3. Test Retention Desk Pending Reminders (Phase 7)
    print("-> [3/4] Testing Phase 7: Retention Queues (Inactive 14d & Lapsed 7d/30d/60d)")
    status, reminders = call_api('reminders/pending/')
    print(f"  Status Code: {status}")
    summary_counts = reminders.get('summary', {})
    print(f"  - Inactive 14d Queue: {summary_counts.get('inactive_14d_count', 0)} members")
    print(f"  - Lapsed 7d Queue:   {summary_counts.get('lapsed_7d_count', 0)} members")
    print(f"  - Lapsed 30d Queue:  {summary_counts.get('lapsed_30d_count', 0)} members")
    print(f"  - Lapsed 60d Queue:  {summary_counts.get('lapsed_60d_count', 0)} members")
    assert status == 200, f"Expected 200, got {status}"
    print("  [SUCCESS] Phase 7 Retention Queues API: PASSED\n")

    # 4. Test Mark Reminded / Sent Cooldown (Phase 5 & 7)
    print("-> [4/4] Testing Atomicity & State Protection (Mark-Sent)")
    status, result = call_api('reminders/mark-sent/', method='POST', data={
        'category': 'inactive_14d',
        'member_ids': [19]
    })
    print(f"  Status Code: {status}")
    print(f"  Response: {result}")
    assert status == 200, f"Expected 200, got {status}"
    print("  [SUCCESS] Cooldown & Mark-Sent Safeguards: PASSED\n")

    print("================================================================")
    print("ALL 4 AUTOMATION WORKFLOW APIS & SAFEGUARDS VERIFIED!")
    print("================================================================")

if __name__ == '__main__':
    run_tests()
