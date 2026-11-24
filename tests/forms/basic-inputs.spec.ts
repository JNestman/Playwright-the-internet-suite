import { test, expect } from '@playwright/test';

/**
 * Core form controls: checkboxes, radio buttons, select lists, number inputs,
 * read-only fields, sliders and keyboard input.
 */

test.describe('Checkboxes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkboxes');
  });

  test('page loads with the documented default states @smoke', async ({ page }) => {
    const boxes = page.locator('#checkboxes input[type=checkbox]');
    await expect(boxes).toHaveCount(2);
    await expect(boxes.nth(0)).not.toBeChecked();
    await expect(boxes.nth(1)).toBeChecked();
  });

  test('user can toggle each checkbox independently', async ({ page }) => {
    const [first, second] = [page.locator('#checkboxes input').nth(0), page.locator('#checkboxes input').nth(1)];

    await first.check();
    await second.uncheck();

    await expect(first).toBeChecked();
    await expect(second).not.toBeChecked();
  });
});

test.describe('Radio buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/radio_buttons');
  });

  test('default selection is reflected in the summary', async ({ page }) => {
    await expect(page.getByLabel('Blue')).toBeChecked();
    await expect(page.locator('#result')).toHaveText('Color: blue, Sport: none');
  });

  test('only one option per group can be selected', async ({ page }) => {
    await page.getByLabel('Red').check();

    await expect(page.getByLabel('Red')).toBeChecked();
    await expect(page.getByLabel('Blue')).not.toBeChecked();
    await expect(page.locator('#result')).toHaveText('Color: red, Sport: none');
  });

  test('selections in separate groups do not affect each other', async ({ page }) => {
    await page.getByLabel('Green').check();
    await page.locator('input[name=sport][value=tennis]').check();

    await expect(page.locator('#result')).toHaveText('Color: green, Sport: tennis');
  });

  test('unavailable option is disabled', async ({ page }) => {
    await expect(page.locator('input[name=sport][value=hockey]')).toBeDisabled();
  });
});

test.describe('Dropdown', () => {
  test('placeholder is shown by default and cannot be re-selected', async ({ page }) => {
    await page.goto('/dropdown');
    const dropdown = page.locator('#dropdown');

    await expect(dropdown).toHaveValue('');
    await expect(dropdown.locator('option[value=""]')).toBeDisabled();
  });

  test('user can pick each option by visible label @smoke', async ({ page }) => {
    await page.goto('/dropdown');
    const dropdown = page.locator('#dropdown');

    await dropdown.selectOption({ label: 'Option 1' });
    await expect(dropdown).toHaveValue('1');

    await dropdown.selectOption({ label: 'Option 2' });
    await expect(dropdown).toHaveValue('2');
    await expect(dropdown.locator('option:checked')).toHaveText('Option 2');
  });
});

test.describe('Multiple select dropdown', () => {
  test('user can select several options at once and change the selection', async ({ page }) => {
    await page.goto('/multiple_dropdown');
    const list = page.locator('#multiple-dropdown');

    await list.selectOption(['1', '3']);
    await expect(list).toHaveValues(['1', '3']);

    await list.selectOption(['2', '3', '4']);
    await expect(list).toHaveValues(['2', '3', '4']);
  });
});

test.describe('Number input', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/inputs');
  });

  test('accepts numeric values including negatives and decimals', async ({ page }) => {
    const input = page.locator('input[type=number]');

    for (const value of ['42', '-7', '3.14']) {
      await input.fill(value);
      await expect(input).toHaveValue(value);
    }
  });

  test('arrow keys step the value up and down', async ({ page }) => {
    const input = page.locator('input[type=number]');
    await input.fill('10');

    await input.press('ArrowUp');
    await input.press('ArrowUp');
    await expect(input).toHaveValue('12');

    await input.press('ArrowDown');
    await expect(input).toHaveValue('11');
  });

  test('typed letters are not accepted', async ({ page }) => {
    const input = page.locator('input[type=number]');
    await input.pressSequentially('abc');

    await expect(input).toHaveValue('');
  });
});

test.describe('Read-only inputs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/readonly');
  });

  test('read-only field shows its value but cannot be edited', async ({ page }) => {
    const field = page.getByLabel('Always read-only');

    await expect(field).toHaveValue('You cannot change me');
    await expect(field).not.toBeEditable();
    await expect(field).toBeEnabled();
  });

  test('disabled field is neither editable nor enabled', async ({ page }) => {
    const field = page.getByLabel('Disabled (not the same as read-only)');

    await expect(field).toBeDisabled();
    await expect(field).not.toBeEditable();
  });

  test('toggling the checkbox switches the text field between editable and read-only', async ({ page }) => {
    const textField = page.locator('#textfield');
    const toggle = page.getByLabel('Text field is read-only');

    await textField.fill('Edited by test');
    await expect(textField).toHaveValue('Edited by test');

    await toggle.check();
    await expect(textField).not.toBeEditable();
    await expect(textField).toHaveValue('You cannot change me');

    await toggle.uncheck();
    await expect(textField).toBeEditable();
    await expect(textField).toHaveValue('I am editable');
  });
});

test.describe('Horizontal slider', () => {
  test('keyboard moves the slider in 0.5 steps within 0..5', async ({ page }) => {
    await page.goto('/horizontal_slider');
    const slider = page.locator('input[type=range]');
    const display = page.locator('#range');

    await slider.focus();
    await slider.press('ArrowRight');
    await slider.press('ArrowRight');
    await slider.press('ArrowRight');
    await expect(display).toHaveText('1.5');

    await slider.press('End');
    await expect(display).toHaveText('5');

    await slider.press('Home');
    await expect(display).toHaveText('0');
  });
});

test.describe('Key presses', () => {
  const keys = [
    { key: 'Backspace', shown: 'BACK_SPACE' },
    { key: 'Escape', shown: 'ESCAPE' },
    { key: 'Tab', shown: 'TAB' },
    { key: 'Shift', shown: 'SHIFT' },
    { key: 'a', shown: 'A' },
    { key: '5', shown: '5' },
  ];

  for (const { key, shown } of keys) {
    test(`pressing ${key} is reported as "${shown}"`, async ({ page }) => {
      await page.goto('/key_presses');
      await page.locator('#target').press(key);

      await expect(page.locator('#result')).toHaveText(`You entered: ${shown}`);
    });
  }
});
