---
name: playwright
description: End-to-end browser automation and testing skill powered by Microsoft Playwright. Use for headless browser testing, UI verification, regression testing, bug detection, workflow validation, and taking visual screenshots of frontend and backend integration.
---

# Playwright Testing Skill

Comprehensive browser automation and end-to-end (E2E) testing skill powered by Microsoft Playwright (`https://github.com/microsoft/playwright`).

## Purpose & Scope
- Execute headless and headed browser automated tests against web applications.
- Verify authentication, routing, CRUD flows, state management, form validations, and asynchronous API interactions.
- Detect broken UI elements, console errors, failing network requests, and visual regression bugs.
- Isolate and verify non-breaking fixes with reproducible test assertions.

## Test Execution Contract
1. **Target URLs**: Ensure frontend (`http://localhost:5174`) and backend (`http://localhost:8000`) servers are active before test execution.
2. **Deterministic Selectors**: Rely on accessible role and text selectors (`getByRole`, `getByLabel`, `getByText`) to reflect realistic user interaction.
3. **Trace & Screenshot on Failure**: Retain test failure traces, console errors, and screenshots for rapid diagnosis.
4. **Non-destructive Data Cleanup**: Ensure test data handles teardown or uses unique identifiers to avoid polluting live database states.

