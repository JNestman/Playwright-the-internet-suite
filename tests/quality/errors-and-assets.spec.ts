import { test, expect } from '@playwright/test';
import { findBrokenImages } from '../../utils/page-health';

/**
 * Catching problems a user may never see directly: broken images, JavaScript
 * errors, console output, failed requests and Content-Security-Policy reports.
 */

test.describe('Broken images', () => {
  test('broken image detector finds the two images that fail to load', async ({ page }) => {
    await page.goto('/broken_images');
    await expect(page.locator('.example img')).toHaveCount(3);

    const broken = await findBrokenImages(page);

    expect(broken.map((b) => b.src.split('/').pop()).sort()).toEqual(['asdf.jpg', 'hjkl.jpg']);
    for (const image of broken) expect(image.status).toBe(404);
  });
});

test.describe('JavaScript errors', () => {
  test('error thrown during page load is captured', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (error) => errors.push(error));

    await page.goto('/javascript_error');

    await expect.poll(() => errors.length).toBe(1);
    expect(errors[0].message).toMatch(/xyz/);
  });

  test('pages used in the main user journey load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));

    for (const path of ['/', '/login', '/checkboxes', '/dropdown', '/tables']) {
      await page.goto(path);
    }

    expect(errors).toEqual([]);
  });
});

test.describe('Network & console monitoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/network_console');
  });

  test('JSON request succeeds and its payload is shown to the user', async ({ page }) => {
    const responsePromise = page.waitForResponse('**/network_console/data');
    await page.getByRole('button', { name: 'Fetch JSON' }).click();
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const data = await response.json();
    await expect(page.locator('#event-log li.fetch-json')).toHaveText(`Fetched JSON: ${JSON.stringify(data)}`);
  });

  test('failed request (HTTP 500) is detected', async ({ page }) => {
    const responsePromise = page.waitForResponse('**/status_codes/500');
    await page.getByRole('button', { name: 'Request that fails (500)' }).click();

    expect((await responsePromise).status()).toBe(500);
    await expect(page.locator('#event-log li.fetch-error')).toHaveText('Request failed with status 500');
  });

  test('console log, warning and error messages are captured by type', async ({ page }) => {
    const messages: { type: string; text: string }[] = [];
    page.on('console', (msg) => messages.push({ type: msg.type(), text: msg.text() }));

    await page.getByRole('button', { name: 'Log to the console' }).click();
    await expect(page.locator('#event-log li.log-console')).toBeVisible();

    expect(messages).toEqual(
      expect.arrayContaining([
        { type: 'log', text: 'the-internet: a log message' },
        { type: 'warning', text: 'the-internet: a warning' },
        { type: 'error', text: 'the-internet: an error message' },
      ]),
    );
  });

  test('uncaught JavaScript error is captured', async ({ page }) => {
    const errorPromise = page.waitForEvent('pageerror');
    await page.getByRole('button', { name: 'Throw a JavaScript error' }).click();

    expect((await errorPromise).message).toBe('the-internet: thrown on purpose');
    await expect(page.locator('#event-log li.throw-error')).toContainText('the-internet: thrown on purpose');
  });

  test('Content-Security-Policy violation is reported', async ({ page }) => {
    await page.getByRole('button', { name: 'Cause a CSP violation' }).click();

    await expect(page.locator('#event-log li.csp-violation')).toHaveText(/^CSP violation: img-src/);
  });
});
