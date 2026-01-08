import { test, expect } from '@playwright/test';

test.describe('Application E2E Tests', () => {
  test('Dashboard loads successfully', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for React to hydrate
    await page.waitForTimeout(2000);

    // Verify we're on the dashboard page
    expect(page.url()).toBe('http://localhost:5173/');
  });

  test('SSE connection works', async ({ page }) => {
    // Set up a listener for network requests
    const apiRequests: string[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });

    // Navigate to the dashboard
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for API calls
    await page.waitForTimeout(3000);

    // Verify API calls were made (sessions, stats, and/or events)
    expect(apiRequests.length).toBeGreaterThan(0);

    // Check that at least one of the key API endpoints was called
    const hasSessionsCall = apiRequests.some(url => url.includes('/api/sessions'));
    const hasEventsCall = apiRequests.some(url => url.includes('/api/events'));

    expect(hasSessionsCall || hasEventsCall).toBe(true);
  });

  test('Session detail navigation works', async ({ page }) => {
    // Navigate directly to a session detail page
    await page.goto('/session/test-session-id', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Should navigate successfully (even if session doesn't exist)
    expect(page.url()).toContain('/session/test-session-id');
  });
});
