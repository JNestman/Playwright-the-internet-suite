import { test, expect } from '../../fixtures/test';

/**
 * Menus, pop-ups and dialogs: native JS dialogs, <dialog> elements,
 * entry/exit-intent modals, a nested jQuery UI menu and a sticky menu.
 */

test.describe('JavaScript alerts', () => {
  test.beforeEach(async ({ alertsPage }) => {
    await alertsPage.goto();
  });

  test('user acknowledges an alert @smoke', async ({ alertsPage }) => {
    const message = await alertsPage.triggerAndRespond(alertsPage.alertButton, true);

    expect(message).toBe('I am a JS Alert');
    await expect(alertsPage.result).toHaveText('You successfully clicked an alert');
  });

  test('user confirms a confirmation dialog', async ({ alertsPage }) => {
    const message = await alertsPage.triggerAndRespond(alertsPage.confirmButton, true);

    expect(message).toBe('I am a JS Confirm');
    await expect(alertsPage.result).toHaveText('You clicked: Ok');
  });

  test('user cancels a confirmation dialog', async ({ alertsPage }) => {
    await alertsPage.triggerAndRespond(alertsPage.confirmButton, false);
    await expect(alertsPage.result).toHaveText('You clicked: Cancel');
  });

  test('user answers a prompt', async ({ alertsPage }) => {
    const message = await alertsPage.triggerAndRespond(alertsPage.promptButton, 'Playwright rocks');

    expect(message).toBe('I am a JS prompt');
    await expect(alertsPage.result).toHaveText('You entered: Playwright rocks');
  });

  test('user dismisses a prompt without answering', async ({ alertsPage }) => {
    await alertsPage.triggerAndRespond(alertsPage.promptButton, false);
    await expect(alertsPage.result).toHaveText('You entered: null');
  });
});

test.describe('Native <dialog> element', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dialog');
  });

  test('modal dialog returns the confirmed answer and entered name', async ({ page }) => {
    await page.getByRole('button', { name: 'Open modal dialog' }).click();
    const dialog = page.getByRole('dialog', { name: 'Modal dialog' });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel('Your name').fill('Grace');
    await dialog.getByRole('button', { name: 'Confirm' }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator('#result')).toHaveText('Modal dialog closed with: confirm (name: Grace)');
  });

  test('modal dialog closes with Escape without an answer', async ({ page }) => {
    await page.getByRole('button', { name: 'Open modal dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'Modal dialog' })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('#result')).toHaveText('Modal dialog closed with Escape');
  });

  test('modal dialog blocks the page behind it', async ({ page }) => {
    await page.getByRole('button', { name: 'Open modal dialog' }).click();

    // The browser makes everything outside a modal dialog inert.
    const isInert = await page.locator('#page-input').evaluate((el) => {
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return top !== el;
    });
    expect(isInert).toBe(true);
  });

  test('non-modal dialog leaves the page usable', async ({ page }) => {
    await page.getByRole('button', { name: 'Open non-modal dialog' }).click();
    await expect(page.getByRole('dialog', { name: 'Non-modal dialog' })).toBeVisible();

    await page.getByLabel('A field on the page').fill('still usable');
    await expect(page.getByLabel('A field on the page')).toHaveValue('still usable');

    await page.locator('#non-modal-close').click();
    await expect(page.locator('#result')).toHaveText('Non-modal dialog closed');
  });
});

test.describe('Entry ad', () => {
  test('ad modal appears on first visit and stays closed after dismissal', async ({ page }) => {
    await page.goto('/entry_ad');
    const modal = page.locator('#modal');

    await expect(modal).toBeVisible();
    await expect(modal.locator('.modal-title')).toHaveText(/This is a modal window/i);

    const dismissed = page.waitForResponse((r) => r.url().endsWith('/entry_ad') && r.request().method() === 'POST');
    await modal.locator('.modal-footer p', { hasText: 'Close' }).click();
    await dismissed;
    await expect(modal).toBeHidden();

    await page.reload();
    await page.waitForTimeout(1_500); // the ad is scheduled 500 ms after load; give it a chance to (not) appear
    await expect(modal).toBeHidden();
  });
});

test.describe('Exit intent', () => {
  test('modal appears when the mouse leaves the top of the page', async ({ page }) => {
    await page.goto('/exit_intent');
    const modal = page.locator('#ouibounce-modal');
    await expect(modal).toBeHidden();

    await page.mouse.move(400, 300);
    await page.mouse.move(400, 5, { steps: 5 });
    // Leaving the viewport upwards fires "mouseleave" on the document.
    await page.locator('html').dispatchEvent('mouseleave', { clientY: -10 });

    await expect(modal).toBeVisible();
    await modal.locator('.modal-footer p').click();
    await expect(modal).toBeHidden();
  });
});

test.describe('jQuery UI menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jqueryui/menu');
  });

  test('hovering through Enabled > Downloads reveals the download formats', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Enabled' }).hover();
    await page.getByRole('menuitem', { name: 'Downloads' }).hover();

    for (const format of ['PDF', 'CSV', 'Excel']) {
      await expect(page.getByRole('menuitem', { name: format })).toBeVisible();
    }
  });

  test('disabled menu item does not open its sub-menu', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Disabled' }).hover();

    await expect(page.getByText('Should not see this')).toBeHidden();
  });

  test('user downloads the CSV export from the menu', async ({ page }) => {
    await page.getByRole('menuitem', { name: 'Enabled' }).hover();
    await page.getByRole('menuitem', { name: 'Downloads' }).hover();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'CSV' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('menu.csv');
  });
});

test.describe('Floating menu', () => {
  test('menu stays in view while the user scrolls the page', async ({ page }) => {
    await page.goto('/floating_menu');
    const menu = page.locator('#menu');

    await page.mouse.wheel(0, 3_000);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1_000);

    await expect(menu).toBeInViewport();
    await menu.getByRole('link', { name: 'News' }).click();
    await expect(page).toHaveURL(/#news$/);
  });
});
