import { test, expect } from '../../fixtures/test';
import { DynamicLoadingPage } from '../../pages';

/**
 * Content that appears, disappears or changes state asynchronously.
 * These tests rely on Playwright's auto-waiting assertions - no hard-coded sleeps.
 */

test.describe('Dynamic loading', () => {
  const examples = [
    { example: 1 as const, description: 'hidden element is revealed' },
    { example: 2 as const, description: 'new element is rendered into the DOM' },
  ];

  for (const { example, description } of examples) {
    test(`example ${example}: ${description} after loading @smoke`, async ({ page }) => {
      const loadingPage = new DynamicLoadingPage(page, example);
      await loadingPage.goto();

      if (example === 1) await expect(loadingPage.finishText).toBeHidden();
      else await expect(loadingPage.finishText).toHaveCount(0);

      await loadingPage.start();

      await expect(loadingPage.loadingIndicator).toBeVisible();
      await expect(loadingPage.startButton).toBeHidden();
      await expect(loadingPage.finishText).toHaveText('Hello World!', { timeout: 15_000 });
      await expect(loadingPage.loadingIndicator).toBeHidden();
    });
  }

  test('index page links to both examples', async ({ page }) => {
    await page.goto('/dynamic_loading');
    await page.getByRole('link', { name: /Example 2/ }).click();

    await expect(page).toHaveURL(/\/dynamic_loading\/2$/);
    await expect(page.getByRole('heading', { name: 'Example 2: Element rendered after the fact' })).toBeVisible();
  });
});

test.describe('Dynamic controls', () => {
  test.beforeEach(async ({ dynamicControlsPage }) => {
    await dynamicControlsPage.goto();
  });

  test('checkbox can be removed and added back', async ({ dynamicControlsPage: p }) => {
    await expect(p.checkbox).toBeVisible();

    await p.checkboxToggleButton.click();
    await expect(p.checkboxToggleButton).toBeDisabled();
    await expect(p.message).toHaveText("It's gone!");
    await expect(p.checkbox).toHaveCount(0);
    await expect(p.checkboxToggleButton).toHaveText('Add');

    await p.checkboxToggleButton.click();
    await expect(p.message).toHaveText("It's back!");
    await expect(p.checkbox).toBeVisible();
    await expect(p.checkboxToggleButton).toHaveText('Remove');
  });

  test('text field can be enabled, typed into, then disabled again', async ({ dynamicControlsPage: p }) => {
    await expect(p.textInput).toBeDisabled();

    await p.inputToggleButton.click();
    await expect(p.message).toHaveText("It's enabled!");
    await expect(p.textInput).toBeEnabled();
    await p.textInput.fill('Now I can type');
    await expect(p.textInput).toHaveValue('Now I can type');

    await p.inputToggleButton.click();
    await expect(p.message).toHaveText("It's disabled!");
    await expect(p.textInput).toBeDisabled();
  });
});

test.describe('Add/remove elements', () => {
  test('user can add several elements and delete them one by one', async ({ page }) => {
    await page.goto('/add_remove_elements/');
    const addButton = page.getByRole('button', { name: 'Add Element' });
    const deleteButtons = page.locator('#elements').getByRole('button', { name: 'Delete' });

    await expect(deleteButtons).toHaveCount(0);
    for (let i = 0; i < 5; i++) await addButton.click();
    await expect(deleteButtons).toHaveCount(5);

    await deleteButtons.first().click();
    await deleteButtons.first().click();
    await expect(deleteButtons).toHaveCount(3);

    while ((await deleteButtons.count()) > 0) await deleteButtons.first().click();
    await expect(deleteButtons).toHaveCount(0);
  });
});

test.describe('Stale elements', () => {
  test('locators keep working after the list is rebuilt', async ({ page }) => {
    await page.goto('/stale_element');
    // A locator is a query, not an element handle, so it can never go "stale".
    const secondItem = page.locator('#items li[data-index="2"]');
    await expect(secondItem).toHaveText('Item 2');

    for (let i = 1; i <= 3; i++) {
      await page.getByRole('button', { name: 'Rebuild the list' }).click();
      await expect(page.locator('#render-count')).toHaveText(`Rebuilt ${i} time${i === 1 ? '' : 's'}`);
      await expect(secondItem).toHaveText('Item 2');
    }
  });

  test('list rebuilt on a timer can still be read reliably', async ({ page }) => {
    await page.goto('/stale_element?interval=500');
    await expect(page.locator('#timer-status')).toHaveText('Timer: every 500 ms');

    await expect(page.locator('#render-count')).not.toHaveText('Rebuilt 0 times');
    await expect(page.locator('#items li')).toHaveText(['Item 1', 'Item 2', 'Item 3']);
  });
});
