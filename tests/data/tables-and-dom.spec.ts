import { test, expect } from '../../fixtures/test';

/**
 * Reading and sorting tabular data, coping with markup that lacks good
 * locators, and working with very large / deeply nested DOMs.
 */

const parseDollars = (values: string[]) => values.map((v) => Number(v.replace(/[$,]/g, '')));

test.describe('Sortable data tables', () => {
  test.beforeEach(async ({ tablesPage }) => {
    await tablesPage.goto();
  });

  for (const table of ['table1', 'table2'] as const) {
    test(`${table}: sorting by Last Name orders rows alphabetically`, async ({ tablesPage }) => {
      await tablesPage.sortBy(table, 'Last Name');
      const names = await tablesPage.columnValues(table, 'Last Name');

      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    test(`${table}: sorting by Due orders amounts numerically, and a second click reverses it`, async ({ tablesPage }) => {
      await tablesPage.sortBy(table, 'Due');
      const ascending = parseDollars(await tablesPage.columnValues(table, 'Due'));
      expect(ascending).toEqual([...ascending].sort((a, b) => a - b));

      await tablesPage.sortBy(table, 'Due');
      const descending = parseDollars(await tablesPage.columnValues(table, 'Due'));
      expect(descending).toEqual([...ascending].reverse());
    });
  }

  test('customer record can be looked up by e-mail @smoke', async ({ tablesPage }) => {
    const row = await tablesPage.rowByEmail('table1', 'jdoe@hotmail.com');

    expect(row).toMatchObject({
      'Last Name': 'Doe',
      'First Name': 'Jason',
      Due: '$100.00',
      'Web Site': 'http://www.jdoe.com',
    });
  });

  test('sorting keeps each row intact (no data is mixed between rows)', async ({ tablesPage }) => {
    const before = await tablesPage.rowByEmail('table2', 'fbach@yahoo.com');
    await tablesPage.sortBy('table2', 'Email');
    const after = await tablesPage.rowByEmail('table2', 'fbach@yahoo.com');

    expect(after).toEqual(before);
  });

  test('total amount due matches across both tables', async ({ tablesPage }) => {
    const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
    const total1 = sum(parseDollars(await tablesPage.columnValues('table1', 'Due')));
    const total2 = sum(parseDollars(await tablesPage.columnValues('table2', 'Due')));

    expect(total1).toBeGreaterThan(0);
    expect(total1).toBe(total2);
  });
});

test.describe('Challenging DOM', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/challenging_dom');
  });

  test('table cells can be located by row content and column header', async ({ page }) => {
    const headers = await page.locator('table thead th').allInnerTexts();
    const row = page.locator('table tbody tr', { has: page.getByRole('cell', { name: 'Iuvaret4', exact: true }) });
    const cells = await row.locator('td').allInnerTexts();

    expect(cells[headers.indexOf('Diceret')]).toBe('Phaedrum4');
    await expect(row.getByRole('link', { name: 'edit' })).toHaveAttribute('href', '#edit');
  });

  test('buttons are found by their text even though their ids change on every load', async ({ page }) => {
    const button = page.locator('.large-2 a.button').first();
    const idBefore = await button.getAttribute('id');

    await button.click();
    await page.waitForLoadState();

    const idAfter = await page.locator('.large-2 a.button').first().getAttribute('id');
    expect(idAfter).not.toBe(idBefore);
    await expect(page.locator('.large-2 a.button')).toHaveCount(3);
  });

  test('canvas answer (not in the DOM) changes after clicking a button', async ({ page }) => {
    // The answer is drawn on a <canvas>; read it from the inline script that draws it.
    const readAnswer = async () => (await page.content()).match(/Answer: (\d+)/)?.[1];
    const before = await readAnswer();
    expect(before).toMatch(/^\d+$/);

    await page.locator('a.button.alert').click();
    await page.waitForLoadState();

    expect(await readAnswer()).not.toBe(before);
  });
});

test.describe('Large & deep DOM', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/large');
  });

  test('element nested 50 levels deep is found without a brittle path', async ({ page }) => {
    await expect(page.locator('#no-siblings')).toHaveText('No siblings');
    await expect(page.locator('#sibling-50\\.3')).toHaveText('50.3');
  });

  test('large table has 50 rows by 50 columns with predictable values', async ({ page }) => {
    const table = page.locator('#large-table');

    await expect(table.locator('thead th')).toHaveCount(50);
    await expect(table.locator('tbody tr')).toHaveCount(50);
    await expect(table.locator('tbody tr').nth(49).locator('td.column-50')).toHaveText('50.50');
    await expect(table.locator('tbody tr').nth(9).locator('td.column-3')).toHaveText('10.3');
  });
});
