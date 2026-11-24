import { test, expect } from '../../fixtures/test';

/**
 * Site navigation: the example index, a link health check across the whole
 * site, redirects, HTTP status codes, nested paths and client-side routing.
 */

test.describe('Home page', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.goto();
  });

  test('home page loads with the list of examples @smoke', async ({ page, homePage }) => {
    await expect(page).toHaveTitle('The Internet');
    await expect(page.getByRole('heading', { name: 'Welcome to the-internet' })).toBeVisible();
    expect(await homePage.exampleLinks.count()).toBeGreaterThan(50);
  });

  test('filter narrows the examples to those matching the search', async ({ homePage }) => {
    await homePage.filterExamples('auth');

    const visible = await homePage.visibleExamples.allInnerTexts();
    expect(visible.length).toBeGreaterThan(0);
    for (const item of ['Basic Auth', 'Digest Authentication', 'Form Authentication']) {
      expect(visible.join('\n')).toContain(item);
    }
    await expect(homePage.noMatchesMessage).toBeHidden();
  });

  test('filter also matches words from the example descriptions', async ({ homePage }) => {
    await homePage.filterExamples('swipe');
    const visible = await homePage.visibleExamples.allInnerTexts();

    expect(visible.join('\n')).toContain('Pointer Events'); // matched via its description only
  });

  test('a search with no matches tells the user', async ({ homePage }) => {
    await homePage.filterExamples('xyzzy-nothing');

    await expect(homePage.visibleExamples).toHaveCount(0);
    await expect(homePage.noMatchesMessage).toHaveText('No examples match.');
  });

  test('clearing the filter shows every example again', async ({ homePage }) => {
    const total = await homePage.exampleLinks.count();
    await homePage.filterExamples('auth');
    await homePage.filterExamples('');

    await expect(homePage.visibleExamples).toHaveCount(total);
  });

  test('user can open an example from the list', async ({ page, homePage }) => {
    await homePage.openExample('Checkboxes');
    await expect(page).toHaveURL(/\/checkboxes$/);
  });
});

test.describe('Site link health check', () => {
  // Pages that intentionally answer 401 until credentials are supplied.
  const authProtected = ['/basic_auth', '/digest_auth', '/download_secure'];

  test('every example linked from the home page responds successfully', async ({ page, request }) => {
    test.slow(); // ~80 requests against a shared demo server
    await page.goto('/');
    const paths = await page
      .locator('#content ul li a')
      .evaluateAll((links) => links.map((a) => a.getAttribute('href')!).filter((h) => h.startsWith('/')));

    for (const path of paths) {
      const response = await request.get(path, { failOnStatusCode: false });
      const expected = authProtected.includes(path) ? 401 : 200;
      expect.soft(response.status(), `GET ${path}`).toBe(expected);
    }
  });
});

test.describe('Redirects and status codes', () => {
  test('redirect link takes the user to the status codes page', async ({ page }) => {
    await page.goto('/redirector');
    await page.getByRole('link', { name: 'here' }).click();

    await expect(page).toHaveURL(/\/status_codes$/);
    await expect(page.getByRole('heading', { name: 'Status Codes' })).toBeVisible();
  });

  test('redirect endpoint answers with a 302 and a Location header', async ({ request }) => {
    const response = await request.get('/redirect', { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers()['location']).toMatch(/\/status_codes$/);
  });

  for (const code of [200, 301, 404, 500]) {
    test(`status code page ${code} returns HTTP ${code} and explains it`, async ({ page, request }) => {
      const response = await request.get(`/status_codes/${code}`, { maxRedirects: 0 });
      expect(response.status()).toBe(code);

      await page.goto('/status_codes');
      await page.getByRole('link', { name: String(code), exact: true }).click();
      await expect(page.locator('.example p')).toContainText(`This page returned a ${code} status code.`);
    });
  }
});

test.describe('Subdirectories', () => {
  test('user can move between nested paths and back', async ({ page }) => {
    await page.goto('/subdirectories');
    await expect(page.getByText('You are here:')).toBeVisible();

    await page.getByRole('link', { name: '/subdirectories/one' }).click();
    await expect(page).toHaveURL(/\/subdirectories\/one$/);
    await expect(page.getByRole('heading', { name: 'Subdirectory One' })).toBeVisible();

    await page.getByRole('link', { name: '/subdirectories/two' }).click();
    await expect(page).toHaveURL(/\/subdirectories\/two$/);

    await page.getByRole('link', { name: '/subdirectories', exact: true }).click();
    await expect(page).toHaveURL(/\/subdirectories$/);
  });
});

test.describe('SPA routing', () => {
  test('navigation changes the URL and view without reloading the page', async ({ page }) => {
    await page.goto('/spa');
    // A marker on window survives client-side routing but would be wiped by a real reload.
    await page.evaluate(() => ((window as unknown as { __marker: string }).__marker = 'still-here'));
    const nav = page.getByRole('navigation', { name: 'SPA' });

    await nav.getByRole('link', { name: 'About' }).click();
    await expect(page).toHaveURL(/\/spa\/about$/);
    await expect(page.locator('#view-title')).toHaveText('About');
    await expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'page');

    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page.locator('#view-text')).toHaveText('Write to us at contact@example.com.');
    await expect(page.locator('#page-loads')).toHaveText('Page loaded once; views shown without a reload: 2');

    expect(await page.evaluate(() => (window as unknown as { __marker?: string }).__marker)).toBe('still-here');
  });

  test('browser Back and Forward buttons move between views', async ({ page }) => {
    await page.goto('/spa');
    await page.getByRole('link', { name: 'About' }).click();
    await expect(page.locator('#view-title')).toHaveText('About');

    await page.goBack();
    await expect(page).toHaveURL(/\/spa$/);
    await expect(page.locator('#view-title')).toHaveText('Home');

    await page.goForward();
    await expect(page.locator('#view-title')).toHaveText('About');
  });

  test('deep link opens the right view directly', async ({ page }) => {
    await page.goto('/spa/contact');

    await expect(page.locator('#view-title')).toHaveText('Contact');
    await expect(page.locator('#page-loads')).toHaveText('Page loaded once; views shown without a reload: 0');
  });
});
