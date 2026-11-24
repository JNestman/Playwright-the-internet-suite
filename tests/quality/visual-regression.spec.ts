import { test, expect, type Page } from '@playwright/test';

/**
 * Visual regression checks on /visual_diff.
 *
 * Instead of committing baseline images (which differ by OS and font rendering,
 * and would fail on a Linux CI runner if captured on Windows), each test captures
 * the baseline card and the variant in the same run and compares them pixel for pixel.
 */

const captureCard = async (page: Page, query = '') => {
  await page.goto(`/visual_diff${query}`);
  await page.locator('#card-logo').evaluate((img: HTMLImageElement) => img.decode().catch(() => undefined));
  return page.locator('#card').screenshot({ animations: 'disabled', caret: 'hide' });
};

test.describe('Visual regression', () => {
  test('baseline card renders identically on repeated loads', async ({ page }) => {
    const first = await captureCard(page);
    const second = await captureCard(page);

    expect(first.equals(second)).toBe(true);
    await expect(page.locator('#active-changes')).toHaveText('Changes: none');
  });

  const variants = [
    { query: '?shift=10', change: 'button moved 10px' },
    { query: '?color=red', change: 'button colour changed' },
    { query: '?font=large', change: 'larger text' },
    { query: '?hide_logo=true', change: 'logo missing' },
    { query: '?typo=true', change: 'typo in the heading' },
  ];

  for (const { query, change } of variants) {
    test(`visual check catches: ${change}`, async ({ page }) => {
      const baseline = await captureCard(page);
      const variant = await captureCard(page, query);

      expect(variant.equals(baseline), `${query} should look different from the baseline`).toBe(false);
      await expect(page.locator('#active-changes')).not.toHaveText('Changes: none');
    });
  }
});
