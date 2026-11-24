import { test, expect } from '@playwright/test';

/**
 * Pages whose content deliberately varies between loads. Good tests here
 * assert on what must always be true, and tolerate what is allowed to change.
 */

test.describe('A/B testing', () => {
  test('visitor sees one of the known page variants', async ({ page }) => {
    await page.goto('/abtest');
    await expect(page.locator('.example h3')).toHaveText(/^(A\/B Test (Control|Variation 1)|No A\/B Test)$/);
  });

  test('visitor who opts out (Optimizely cookie) always gets the default page', async ({ page, context }) => {
    await context.addCookies([{ name: 'optimizelyOptOut', value: 'true', url: 'https://the-internet.herokuapp.com' }]);
    await page.goto('/abtest');

    await expect(page.locator('.example h3')).toHaveText('No A/B Test');
  });
});

test.describe('Disappearing elements', () => {
  test('core navigation items are present on every load', async ({ page }) => {
    const required = ['Home', 'About', 'Contact Us', 'Portfolio'];

    for (let load = 0; load < 3; load++) {
      await page.goto('/disappearing_elements');
      const items = await page.locator('.example ul li a').allInnerTexts();
      expect(items).toEqual(expect.arrayContaining(required));
      // "Gallery" is the element that comes and goes - it is allowed to be missing.
      expect(items.length).toBeGreaterThanOrEqual(required.length);
      expect(items.length).toBeLessThanOrEqual(required.length + 1);
    }
  });
});

test.describe('Dynamic content', () => {
  // Note: the page reuses id="content" for two elements, so scope through .example instead.
  const entries = (page: import('@playwright/test').Page) => page.locator('.example .large-centered > .row');
  const rows = (page: import('@playwright/test').Page) => entries(page).locator('.large-10');

  test('page always shows three avatar + text entries', async ({ page }) => {
    await page.goto('/dynamic_content');

    await expect(entries(page)).toHaveCount(3);
    await expect(entries(page).locator('img')).toHaveCount(3);
    for (const text of await rows(page).allInnerTexts()) expect(text.trim().length).toBeGreaterThan(20);
  });

  test('with static content enabled, the first two entries stay the same across reloads', async ({ page }) => {
    await page.goto('/dynamic_content?with_content=static');
    const before = (await rows(page).allInnerTexts()).slice(0, 2);

    await page.reload();
    const after = (await rows(page).allInnerTexts()).slice(0, 2);

    expect(after).toEqual(before);
  });
});

test.describe('Shifting content', () => {
  test('menu keeps all items when an element is shifted', async ({ page }) => {
    await page.goto('/shifting_content/menu');
    await expect(page.locator('.example ul li a')).toHaveText(['Home', 'About', 'Contact Us', 'Portfolio', 'Gallery']);
  });

  test('pixel_shift moves the Gallery link by the requested amount', async ({ page }) => {
    const galleryX = async (query: string) => {
      await page.goto(`/shifting_content/menu${query}`);
      const box = await page.getByRole('link', { name: 'Gallery' }).boundingBox();
      return box!.x;
    };

    const baseline = await galleryX('?pixel_shift=0');
    const shifted = await galleryX('?pixel_shift=100');

    expect(Math.abs(Math.round(shifted - baseline))).toBe(100);
  });

  test('index lists all three shifting examples', async ({ page }) => {
    await page.goto('/shifting_content');
    await expect(page.locator('.example a')).toHaveText([
      'Example 1: Menu Element',
      'Example 2: An image',
      'Example 3: List',
    ]);
  });
});

test.describe('Typos', () => {
  test('copy is one of the two known versions (and the typo is reported if present)', async ({ page }) => {
    await page.goto('/typos');
    const copy = (await page.locator('.example p').nth(1).innerText()).trim();

    const correct = "Sometimes you'll see a typo, other times you won't.";
    const typo = "Sometimes you'll see a typo, other times you won,t.";
    expect([correct, typo]).toContain(copy);

    if (copy === typo) {
      test.info().annotations.push({ type: 'content-defect', description: `Typo detected: "${copy}"` });
    }
  });
});

test.describe('Notification messages', () => {
  test('each click shows one of the known notification messages', async ({ page }) => {
    await page.goto('/notification_message');
    const flash = page.locator('#flash');
    const known = /Action successful|Action unsuccesful, please try again|Action unsuccessful/i;

    for (let i = 0; i < 3; i++) {
      await page.getByRole('link', { name: 'Click here' }).click();
      await expect(flash).toBeVisible();
      await expect(flash).toHaveText(known);
    }
  });
});
