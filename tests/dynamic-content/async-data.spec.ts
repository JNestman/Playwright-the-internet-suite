import { test, expect } from '@playwright/test';

/**
 * Data that arrives over time: toasts, infinite scroll, virtualised lists,
 * server-sent events, and slow or failing APIs (including mocked failures).
 */

test.describe('Toasts', () => {
  test('success toast appears and hides itself after the configured time', async ({ page }) => {
    await page.goto('/toasts?duration=1000');
    await page.getByRole('button', { name: 'Show success toast' }).click();

    const toast = page.locator('.toast-success');
    await expect(toast).toHaveText(/Saved successfully/);
    await expect(toast).toHaveAttribute('role', 'status');
    await expect(toast).toBeHidden({ timeout: 5_000 });
  });

  test('error toast is announced as an alert for screen readers', async ({ page }) => {
    await page.goto('/toasts?duration=0');
    await page.getByRole('button', { name: 'Show error toast' }).click();

    await expect(page.getByRole('alert')).toContainText('Something went wrong');
  });

  test('persistent toasts stack up and can be closed individually', async ({ page }) => {
    await page.goto('/toasts?duration=0');
    await page.getByRole('button', { name: 'Show info toast' }).click();
    await page.getByRole('button', { name: 'Show success toast' }).click();
    await page.getByRole('button', { name: 'Show error toast' }).click();

    const toasts = page.locator('#toasts .toast');
    await expect(toasts).toHaveCount(3);
    await expect(page.locator('#toast-count')).toHaveText('Toasts shown: 3');

    await toasts.first().getByRole('button', { name: 'Close' }).click();
    await expect(toasts).toHaveCount(2);
    await expect(toasts.first()).toHaveClass(/toast-success/);
  });
});

test.describe('Infinite scroll', () => {
  test('scrolling to the bottom loads more content', async ({ page }) => {
    await page.goto('/infinite_scroll');
    const paragraphs = page.locator('.jscroll-added');
    await expect(paragraphs.first()).toBeVisible();
    const initial = await paragraphs.count();

    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 5_000);

    await expect.poll(() => paragraphs.count()).toBeGreaterThan(initial);
  });
});

test.describe('Virtualized list', () => {
  test('only visible rows exist in the DOM until the user scrolls to them', async ({ page }) => {
    await page.goto('/virtual_list');
    const viewport = page.locator('#viewport');

    await expect(page.locator('#rendered-range')).toContainText('of 10000');
    await expect(viewport.getByText('Item 1', { exact: true })).toBeVisible();
    await expect(viewport.getByText('Item 5000', { exact: true })).toHaveCount(0);

    await viewport.evaluate((el) => (el.scrollTop = 4999 * 30));

    await expect(viewport.getByText('Item 5000', { exact: true })).toBeVisible();
    await expect(viewport.getByText('Item 1', { exact: true })).toHaveCount(0);
  });

  test('user can reach the last row', async ({ page }) => {
    await page.goto('/virtual_list');
    const viewport = page.locator('#viewport');

    await viewport.evaluate((el) => (el.scrollTop = el.scrollHeight));

    await expect(viewport.getByText('Item 10000', { exact: true })).toBeVisible();
    await expect(page.locator('#rendered-range')).toContainText('to 10000 of 10000');
  });
});

test.describe('Live updates (Server-Sent Events)', () => {
  test('all pushed updates arrive in order and the stream completes', async ({ page }) => {
    await page.goto('/live_updates?count=4&interval=200');
    await page.getByRole('button', { name: 'Start updates' }).click();

    await expect(page.locator('#connection')).toHaveText('Done: the server sent all updates');
    const updates = page.locator('#updates li.update');
    await expect(updates).toHaveCount(4);
    const ids = await updates.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-id'))));
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    await expect(page.getByRole('button', { name: 'Start updates' })).toBeEnabled();
  });
});

test.describe('Slow & failing API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/slow_api');
    await page.locator('#delay').fill('0');
  });

  test('client retries transient failures and eventually succeeds', async ({ page }) => {
    await page.locator('#fail').fill('2');
    await page.locator('#status').selectOption('503');
    await page.getByRole('button', { name: 'Call the API' }).click();

    const attempts = page.locator('#attempts li');
    await expect(attempts).toHaveCount(3, { timeout: 15_000 });
    await expect(attempts.nth(0)).toHaveText(/^503/);
    await expect(attempts.nth(1)).toHaveText(/^503/);
    await expect(attempts.nth(2)).toHaveText(/^200/);
    await expect(page.locator('#status-text')).not.toContainText('Gave up');
  });

  test('without retries the client gives up after the first error', async ({ page }) => {
    await page.locator('#fail').fill('1');
    await page.locator('#retry').uncheck();
    await page.getByRole('button', { name: 'Call the API' }).click();

    await expect(page.locator('#status-text')).toHaveText('Gave up after 1 attempt (last status 500)');
  });

  test('client gives up after 3 retries when the API keeps failing', async ({ page }) => {
    await page.locator('#fail').fill('5');
    await page.locator('#status').selectOption('429');
    await page.getByRole('button', { name: 'Call the API' }).click();

    await expect(page.locator('#status-text')).toHaveText('Gave up after 4 attempts (last status 429)', {
      timeout: 15_000,
    });
  });

  test('UI handles an outage simulated with network mocking', async ({ page }) => {
    // Playwright intercepts the request and answers it itself - the real server is never called.
    await page.route('**/slow_api/data**', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Mocked outage' }) }),
    );
    await page.locator('#retry').uncheck();
    await page.getByRole('button', { name: 'Call the API' }).click();

    await expect(page.locator('#attempts li')).toHaveText(['503: Mocked outage']);
    await expect(page.locator('#status-text')).toHaveText('Gave up after 1 attempt (last status 503)');
  });
});

test.describe('Slow resources', () => {
  test('page is usable before a slow third-party request finishes', async ({ page }) => {
    const start = Date.now();
    await page.goto('/slow', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: 'Slow Resources' })).toBeVisible();
    expect(Date.now() - start).toBeLessThan(15_000);
  });

  test('slow third-party call can be blocked to keep tests fast', async ({ page }) => {
    await page.route('**/slow_external', (route) => route.abort());
    const start = Date.now();

    await page.goto('/slow', { waitUntil: 'load' });

    await expect(page.getByRole('heading', { name: 'Slow Resources' })).toBeVisible();
    expect(Date.now() - start).toBeLessThan(15_000);
  });
});
