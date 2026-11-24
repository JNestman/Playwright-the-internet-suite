import { test, expect } from '@playwright/test';

/**
 * Web components: open/closed shadow roots, slots, and a form-associated
 * custom element. Playwright locators pierce open shadow roots automatically.
 */

test.describe('Shadow DOM', () => {
  test('slotted content replaces the template default text', async ({ page }) => {
    await page.goto('/shadowdom');
    const paragraphs = page.locator('my-paragraph');

    await expect(paragraphs).toHaveCount(2);
    await expect(paragraphs.first()).toContainText("Let's have some different text!");
    await expect(paragraphs.nth(1).locator('li')).toHaveText(["Let's have some different text!", 'In a list!']);
    // Each slot has light-DOM content assigned, so its "My default text" fallback is never rendered.
    const assigned = await page
      .locator('my-paragraph slot')
      .evaluateAll((slots) => slots.map((s) => (s as HTMLSlotElement).assignedElements().length));
    expect(assigned).toEqual([1, 1]);
  });
});

test.describe('Advanced shadow DOM', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shadowdom_advanced');
  });

  test('button two shadow roots deep can be clicked', async ({ page }) => {
    await page.locator('#inner-button').click();
    await expect(page.locator('#nested-result')).toHaveText('You clicked the button in the inner shadow root');
  });

  test('closed shadow root is encapsulated from page scripts but still rendered', async ({ page }) => {
    const host = page.locator('#closed-card');

    expect(await host.evaluate((el) => el.shadowRoot)).toBeNull();
    const box = await host.boundingBox();
    expect(box?.height).toBeGreaterThan(0);
  });

  test('named slots show light-DOM content and fall back to defaults', async ({ page }) => {
    const card = page.locator('#slot-card');

    await expect(card.locator('[slot="title"]')).toHaveText('Title from the light DOM');
    await expect(card.locator('[slot="body"]')).toHaveText('Body from the light DOM');
    await expect(card.locator('slot[name="footer"]')).toHaveText('Default footer (nothing is slotted here)');
  });

  test('custom rating field is required before the form submits', async ({ page }) => {
    await page.getByLabel('Name').fill('Reviewer');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#form-result')).toHaveText('Error: Pick a rating');
  });

  test('user rates 4 stars and the value is submitted with the form', async ({ page }) => {
    await page.getByLabel('Name').fill('Reviewer');
    await page.getByRole('button', { name: '4 stars' }).click();

    const stars = await page.locator('star-rating button').allInnerTexts();
    expect(stars).toEqual(['★', '★', '★', '★', '☆']);

    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.locator('#form-result')).toHaveText('Submitted name: Reviewer, rating: 4');
  });
});
