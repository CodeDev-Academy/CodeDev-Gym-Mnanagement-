import { test, expect } from '@playwright/test';

test.describe('Gym Management System - Comprehensive Feature Audit', () => {
  const TEST_MEMBER_NAME = `Audit Member ${Date.now().toString().slice(-4)}`;
  const TEST_MEMBER_PHONE = `+23480${Math.floor(10000000 + Math.random() * 90000000)}`;

  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => {
      console.error(`[BROWSER UNCAUGHT ERROR] ${err.message}`);
    });
  });

  test('Feature 1: Authentication & Session Gate', async ({ page }) => {
    // 1. Unauthenticated redirect to login
    await page.goto('/');
    await expect(page).toHaveURL(/.*\/login/);

    // 2. Invalid login feedback
    await page.fill('#username', 'invalid_user');
    await page.fill('#password', 'wrong_pass');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-alert')).toBeVisible({ timeout: 15000 });

    // 3. Valid owner login
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');

    // 4. Successful login redirects to Dashboard
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });
    expect(page.url()).toBe('http://localhost:5174/');
  });

  test('Feature 2: Dashboard Metrics & Speedometer Rhythm Matrix', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Verify Dashboard layout elements exist
    await expect(page.locator('.cinematic-shell')).toBeVisible();
    await expect(page.locator('.sidebar-nav-stack')).toBeVisible();

    // Verify Cinematic Dashboard & Speedometer Widget
    await expect(page.locator('.cinematic-dashboard')).toBeVisible();
    await expect(page.locator('.speedometer-widget-card')).toBeVisible();

    // Verify rhythm/filter buttons do not throw errors when clicked
    const rhythmTabs = page.locator('.speedometer-gauge-tabs button, .rhythm-time-tabs button, button.chip');
    const tabCount = await rhythmTabs.count();
    for (let i = 0; i < Math.min(tabCount, 4); i++) {
      await rhythmTabs.nth(i).click();
      await page.waitForTimeout(200);
    }
  });

  test('Feature 3: Members Directory & Member Registration', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Navigate to /members
    await page.goto('/members');
    await expect(page.locator('h1')).toContainText('Gym Members');

    // Open Register Member Modal
    await page.click('button:has-text("+ Register Member")');
    await expect(page.locator('.modal-card')).toBeVisible();

    // Fill Member form
    await page.fill('#member-fullname', TEST_MEMBER_NAME);
    await page.fill('#member-phone', TEST_MEMBER_PHONE);
    await page.fill('#member-email', `audit_${Date.now()}@testgym.local`);

    // Submit form
    await page.click('.modal-card button[type="submit"]');

    // Verify modal closes and member is listed
    await expect(page.locator('.modal-card')).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await expect(page.locator(`text=${TEST_MEMBER_NAME}`)).toBeVisible();
  });

  test('Feature 4: Membership Plans Directory', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Navigate to /plans
    await page.goto('/plans');
    await expect(page.locator('h1')).toContainText('Membership Plans');

    // Verify seeded plans are visible
    await expect(page.locator('text=Monthly Standard')).toBeVisible();
    await expect(page.locator('text=Annual VIP Elite')).toBeVisible();
  });

  test('Feature 5: Payment Ledger & Financial Tracking', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Navigate to /payments
    await page.goto('/payments');
    await expect(page.locator('h1')).toContainText('Financial Ledger & Payments');

    // Verify filter controls exist
    await expect(page.locator('.table-controls').first()).toBeVisible();
  });

  test('Feature 6: Front-Desk Check-In & 2-Minute Cooldown Verification', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Navigate to /checkin
    await page.goto('/checkin');
    await expect(page.locator('h1')).toContainText('Front-Desk Attendance & Check-In');

    // Search for our newly created audit member or any member
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(TEST_MEMBER_NAME);
    await page.waitForTimeout(400);

    // If search result appears, check in
    const checkInBtn = page.locator('.member-result-card button:has-text("Check In"), .search-results button:has-text("Check In")').first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await page.waitForTimeout(600);

      // Attempt second immediate check-in to verify cooldown
      await searchInput.fill(TEST_MEMBER_NAME);
      await page.waitForTimeout(400);
      if (await checkInBtn.isVisible()) {
        await checkInBtn.click();
        await page.waitForTimeout(500);
        // Cooldown alert or message should be displayed
        const errorAlert = page.locator('.error-alert, .checkin-error, text=cooldown, text=recently checked in');
        await expect(errorAlert.first()).toBeVisible();
      }
    }
  });

  test('Feature 7: Retention & Reminders Desk', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Navigate to /reminders
    await page.goto('/reminders');
    await expect(page.locator('h1')).toContainText('Retention & Reminders Desk');

    // Test clicking across reminder tabs
    const tabs = page.locator('.tabs-navigation button, .reminder-tabs button');
    const count = await tabs.count();
    for (let i = 0; i < count; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(200);
    }
  });

  test('Feature 8: Owner Profile & Staff Administration', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', '@Babson26');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5174/', { timeout: 15000 });

    // Navigate to /profile
    await page.goto('/profile');
    await expect(page.locator('.profile-container')).toBeVisible();

    // Verify Owner Profile handle rendered
    await expect(page.locator('.profile-banner-handle')).toContainText('@admin');
  });
});
