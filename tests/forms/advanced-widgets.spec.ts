import { test, expect } from '@playwright/test';

/**
 * JavaScript-driven form widgets that native helpers (selectOption etc.) can't drive:
 * ARIA comboboxes, server-backed autocomplete and a calendar widget.
 */

test.describe('Custom (ARIA) dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/custom_dropdown');
  });

  test('user can choose a fruit with the mouse @smoke', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Fruit' });

    await combo.click();
    await expect(combo).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('option', { name: 'Mango' }).click();

    await expect(combo).toHaveText('Mango');
    await expect(combo).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#result')).toHaveText('Selected: mango');
  });

  test('user can choose a fruit using only the keyboard', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Fruit' });

    await combo.focus();
    await combo.press('ArrowDown'); // opens on Apple
    await combo.press('ArrowDown'); // Banana
    await combo.press('Enter');

    await expect(page.locator('#result')).toHaveText('Selected: banana');
  });

  test('keyboard navigation skips the out-of-stock option', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Fruit' });

    await combo.focus();
    await combo.press('ArrowDown'); // Apple
    await combo.press('ArrowDown'); // Banana
    await combo.press('ArrowDown'); // Cherry is disabled -> Mango
    await combo.press('Enter');

    await expect(page.locator('#result')).toHaveText('Selected: mango');
  });

  test('out-of-stock option cannot be selected with the mouse', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Fruit' }).click();
    const cherry = page.getByRole('option', { name: 'Cherry (out of stock)' });

    // Playwright honours aria-disabled, so a normal click would wait forever.
    // Force the click to prove the widget itself also ignores it.
    await expect(cherry).toBeDisabled();
    await cherry.click({ force: true });

    await expect(page.locator('#result')).toHaveText('Selected: nothing');
  });

  test('Escape closes the list without changing the selection', async ({ page }) => {
    const combo = page.getByRole('combobox', { name: 'Fruit' });

    await combo.click();
    await combo.press('Escape');

    await expect(page.getByRole('listbox')).toBeHidden();
    await expect(page.locator('#result')).toHaveText('Selected: nothing');
  });
});

test.describe('Autocomplete', () => {
  test.beforeEach(async ({ page }) => {
    // ?delay=0 keeps the server fast; the 300 ms debounce still applies.
    await page.goto('/autocomplete?delay=0');
  });

  test('typing shows matching suggestions from the server', async ({ page }) => {
    const responsePromise = page.waitForResponse((r) => r.url().includes('/autocomplete/suggestions'));
    await page.getByRole('combobox', { name: 'Fruit' }).pressSequentially('ap');
    const suggestions: string[] = await (await responsePromise).json();

    const options = page.getByRole('option');
    await expect(options).toHaveCount(suggestions.length);
    for (const text of await options.allInnerTexts()) {
      expect(text.toLowerCase()).toContain('ap');
    }
  });

  test('user can pick a suggestion with the arrow keys and Enter @smoke', async ({ page }) => {
    const input = page.getByRole('combobox', { name: 'Fruit' });
    await input.pressSequentially('ban');
    await expect(page.getByRole('option').first()).toBeVisible();
    const first = await page.getByRole('option').first().innerText();

    await input.press('ArrowDown');
    await input.press('Enter');

    await expect(input).toHaveValue(first);
    await expect(page.locator('#selected')).toHaveText(`You selected: ${first}`);
  });

  test('user can pick a suggestion with the mouse', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Fruit' }).pressSequentially('ch');
    const option = page.getByRole('option').first();
    const text = await option.innerText();

    await option.click();

    await expect(page.locator('#selected')).toHaveText(`You selected: ${text}`);
    await expect(page.getByRole('listbox')).toBeHidden();
  });

  test('a term with no matches tells the user there are no suggestions', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Fruit' }).pressSequentially('zzzz');

    await expect(page.locator('#status')).toHaveText('No suggestions');
    await expect(page.getByRole('option')).toHaveCount(0);
  });
});

test.describe('Date and time pickers', () => {
  test('native inputs accept values in ISO format', async ({ page }) => {
    await page.goto('/date_pickers');

    await page.getByLabel('Date', { exact: true }).fill('2026-04-15');
    await page.getByLabel('Time', { exact: true }).fill('13:45');
    await page.getByLabel('Month', { exact: true }).fill('2026-12');

    await expect(page.locator('#native-result')).toHaveText('date: 2026-04-15, time: 13:45, month: 2026-12');
  });

  test('user books an appointment with the calendar widget', async ({ page }) => {
    await page.goto('/date_pickers?month=2026-02');
    const field = page.getByLabel('Appointment');

    await expect(field).toHaveAttribute('readonly', '');
    await page.getByRole('button', { name: 'Open calendar' }).click();
    await expect(page.locator('#calendar-month')).toHaveText('February 2026');

    await page.locator('#calendar-days button[data-date="2026-02-14"]').click();

    await expect(field).toHaveValue('2026-02-14');
    await expect(page.locator('#calendar')).toBeHidden();
  });

  test('calendar navigation crosses year boundaries', async ({ page }) => {
    await page.goto('/date_pickers?month=2026-12');
    await page.getByRole('button', { name: 'Open calendar' }).click();

    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page.locator('#calendar-month')).toHaveText('January 2027');

    await page.getByRole('button', { name: 'Previous month' }).click();
    await page.getByRole('button', { name: 'Previous month' }).click();
    await expect(page.locator('#calendar-month')).toHaveText('November 2026');
  });

  test('calendar shows the right number of days in a leap-year February', async ({ page }) => {
    await page.goto('/date_pickers?month=2028-02');
    await page.getByRole('button', { name: 'Open calendar' }).click();

    await expect(page.locator('#calendar-days button')).toHaveCount(29);
  });
});

test.describe('Large form', () => {
  test('user completes every type of field and submits the form', async ({ page }) => {
    await page.goto('/large_form');

    await page.getByLabel('First name').fill('Ada');
    await page.getByLabel('Last name').fill('Lovelace');
    await page.locator('input[name=email]').fill('ada@example.com');
    await page.locator('input[name=password]').fill('Analytical1');
    await page.getByPlaceholder('Nickname (optional)').fill('Countess');
    await page.getByLabel('Birthday').fill('1990-12-10');
    await page.locator('input[name=age]').fill('35');
    await page.getByLabel('Country').selectOption({ label: 'Germany' });
    await page.locator('select[name="languages[]"]').selectOption(['English', 'German']);
    await page.getByLabel('About you').fill('Writes the first algorithm.');
    await page.locator('input[name=contact][value=phone]').check();
    await page.locator('input.interest[value=testing]').check();
    await page.locator('input.interest[value=automation]').check();
    await page.locator('#experience').fill('12');
    await expect(page.locator('#experience-value')).toHaveText('12');
    await page.getByLabel('I accept the terms').check();

    const [request] = await Promise.all([
      page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/large_form')),
      page.locator('#submit').click(),
    ]);
    const body = new URLSearchParams(request.postData() ?? '');

    expect(body.get('first_name')).toBe('Ada');
    expect(body.get('country')).toBe('de');
    expect(body.getAll('languages[]')).toEqual(['English', 'German']);
    expect(body.get('contact')).toBe('phone');
    expect(body.getAll('interests[]')).toEqual(['testing', 'automation']);
    expect(body.get('experience')).toBe('12');
    expect(body.get('terms')).toBe('accepted');
    expect(body.get('form_id')).toBe('large-form');
  });

  test('Reset restores every field to its default value', async ({ page }) => {
    await page.goto('/large_form');
    await page.getByLabel('First name').fill('Temp');
    await page.getByLabel('Country').selectOption('us');
    await page.locator('input[name=contact][value=none]').check();

    await page.getByRole('button', { name: 'Reset' }).click();

    await expect(page.getByLabel('First name')).toHaveValue('');
    await expect(page.getByLabel('Country')).toHaveValue('');
    await expect(page.locator('input[name=contact][value=email]')).toBeChecked();
  });
});
