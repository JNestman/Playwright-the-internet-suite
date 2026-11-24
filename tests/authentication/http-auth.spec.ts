import { test, expect } from '@playwright/test';
import { httpAuth } from '../../test-data/users';

/**
 * Feature: HTTP authentication (Basic and Digest)
 * The browser's native auth prompt can't be clicked, so credentials are
 * supplied up front through the browser context's `httpCredentials`.
 */
const protectedPages = [
  { name: 'Basic Auth', path: '/basic_auth' },
  { name: 'Digest Auth', path: '/digest_auth' },
];

for (const { name, path } of protectedPages) {
  test.describe(name, () => {
    test.describe('with valid credentials', () => {
      test.use({ httpCredentials: httpAuth.valid });

      test(`user is granted access to ${path}`, async ({ page }) => {
        const response = await page.goto(path);

        expect(response?.status()).toBe(200);
        await expect(page.getByRole('heading', { name })).toBeVisible();
        await expect(page.getByText('Congratulations! You must have the proper credentials.')).toBeVisible();
      });
    });

    test.describe('with invalid credentials', () => {
      test.use({ httpCredentials: httpAuth.invalid });

      test(`user is refused access to ${path}`, async ({ page }) => {
        const response = await page.goto(path);

        expect(response?.status()).toBe(401);
        await expect(page.getByText('Congratulations!')).toBeHidden();
      });
    });
  });
}

test('Basic Auth endpoint challenges anonymous API clients with 401', async ({ request }) => {
  const response = await request.get('/basic_auth');

  expect(response.status()).toBe(401);
  expect(response.headers()['www-authenticate']).toMatch(/^Basic/i);
});
