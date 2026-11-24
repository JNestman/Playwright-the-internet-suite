import { test, expect } from '@playwright/test';

/**
 * Feature: Forgot Password (/forgot_password)
 * A user enters their e-mail address to request a password reset.
 */
test.describe('Forgot password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot_password');
  });

  test('form offers an e-mail field and a retrieve button', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Forgot Password' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeEditable();
    await expect(page.getByRole('button', { name: 'Retrieve password' })).toBeEnabled();
  });

  test('submitting an e-mail address sends the request to the server', async ({ page }) => {
    await page.getByLabel('E-mail').fill('qa.tester@example.com');

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().endsWith('/forgot_password') && req.method() === 'POST'),
      page.getByRole('button', { name: 'Retrieve password' }).click(),
    ]);

    expect(request.postData()).toContain('email=qa.tester%40example.com');
  });
});
