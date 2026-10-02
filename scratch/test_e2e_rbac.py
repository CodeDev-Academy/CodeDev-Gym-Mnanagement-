import os
import sys
import json
import urllib.request
import urllib.error

BASE_URL = 'http://localhost:8000/api'

def api_call(endpoint, method='GET', data=None, token=None):
    url = f"{BASE_URL}/{endpoint.lstrip('/')}"
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Token {token}"
    
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode('utf-8')
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_body)
        except Exception:
            parsed = err_body
        return e.code, parsed

def run_e2e_tests():
    print("--- Starting End-to-End RBAC & Staff Management Verification ---")
    
    # 1. Login as Owner
    print("[1/9] Logging in as Admin / Gym Owner...")
    status_code, login_data = api_call('auth/login/', method='POST', data={
        "username": "admin",
        "password": "adminpassword123"
    })
    
    if status_code != 200:
        print(f"FAILED to login as admin: {status_code} {login_data}")
        return False
    
    owner_token = login_data['token']
    print("Owner login successful.")

    # 2. Owner creates a new Receptionist staff account
    print("[2/9] Owner registering new receptionist 'joy_reception'...")
    staff_data = {
        "username": "joy_reception",
        "password": "Password123!",
        "first_name": "Joy",
        "last_name": "Obi",
        "email": "joy@example.com",
        "phone_number": "+2348001112233"
    }
    status_code, create_data = api_call('auth/staff/', method='POST', data=staff_data, token=owner_token)
    if status_code == 400 and 'already exists' in str(create_data):
        status_code, list_data = api_call('auth/staff/', method='GET', token=owner_token)
        staff_id = [s['id'] for s in list_data if s['username'] == 'joy_reception'][0]
        print(f"Existing receptionist found with ID: {staff_id}")
    elif status_code == 201:
        staff_id = create_data['id']
        print(f"Receptionist created successfully with ID: {staff_id}")
    else:
        print(f"FAILED to create receptionist: {status_code} {create_data}")
        return False

    # 3. Owner resets receptionist password
    print("[3/9] Owner resetting receptionist password...")
    status_code, reset_data = api_call(
        f"auth/staff/{staff_id}/reset-password/",
        method='POST',
        data={"new_password": "NewSecretPassword123!"},
        token=owner_token
    )
    assert status_code == 200, f"Reset password failed: {reset_data}"
    print("Password reset successfully.")

    # 4. Receptionist logs in with new password
    print("[4/9] Receptionist logging in with new password...")
    status_code, desk_login = api_call('auth/login/', method='POST', data={
        "username": "joy_reception",
        "password": "NewSecretPassword123!"
    })
    assert status_code == 200, f"Receptionist login failed: {desk_login}"
    desk_token = desk_login['token']
    print("Receptionist login successful.")

    # 5. Verify Receptionist identity & role
    print("[5/9] Verifying receptionist role...")
    status_code, me_data = api_call('auth/me/', method='GET', token=desk_token)
    assert status_code == 200
    assert me_data['role'] == 'FRONT_DESK', f"Unexpected role: {me_data['role']}"
    assert me_data['is_front_desk'] is True
    assert me_data['is_owner'] is False
    print("Receptionist identity verified: role=FRONT_DESK, is_owner=False.")

    # 6. Verify RBAC Guard: Receptionist cannot access staff management
    print("[6/9] Testing guard: Receptionist blocked from staff management...")
    status_code, staff_access = api_call('auth/staff/', method='GET', token=desk_token)
    assert status_code == 403, f"Expected 403 Forbidden, got {status_code}"
    print("Pass: 403 Forbidden on staff management for receptionist.")

    # 7. Verify RBAC Guard: Receptionist cannot alter membership plans
    print("[7/9] Testing guard: Receptionist blocked from creating plans...")
    status_code, plan_create = api_call('memberships/plans/', method='POST', data={
        "name": "Hacked Plan",
        "price": 100,
        "duration_days": 30
    }, token=desk_token)
    assert status_code == 403, f"Expected 403 Forbidden, got {status_code}"
    print("Pass: 403 Forbidden on plan creation for receptionist.")

    # 8. Verify RBAC Guard: Receptionist cannot access revenue summary
    print("[8/9] Testing guard: Receptionist blocked from revenue summary...")
    status_code, summary_resp = api_call('payments/summary/', method='GET', token=desk_token)
    assert status_code == 403, f"Expected 403 Forbidden, got {status_code}"
    print("Pass: 403 Forbidden on payments summary for receptionist.")

    # 9. Verify Dashboard redaction: Receptionist sees None for revenue
    print("[9/9] Testing dashboard metric redaction for receptionist...")
    status_code, dash_data = api_call('dashboard/stats/', method='GET', token=desk_token)
    assert status_code == 200
    assert dash_data['month_revenue'] is None, f"Expected None, got {dash_data['month_revenue']}"
    assert dash_data['today_revenue'] is None, f"Expected None, got {dash_data['today_revenue']}"
    print("Pass: month_revenue and today_revenue successfully redacted for receptionist.")

    # 10. Clean up test receptionist account
    print("Cleaning up: Deleting test receptionist account from database...")
    from django.contrib.auth import get_user_model
    # Initialize Django to delete the test user cleanly
    sys.path.insert(0, os.path.abspath('gym_backend'))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gym_backend.settings')
    django.setup()
    User = get_user_model()
    User.objects.filter(username='joy_reception').delete()
    print("Test receptionist cleaned up.")

    print("\n--- ALL END-TO-END VERIFICATION CHECKS PASSED PERFECTLY ---")
    return True

if __name__ == '__main__':
    success = run_e2e_tests()
    if not success:
        sys.exit(1)
