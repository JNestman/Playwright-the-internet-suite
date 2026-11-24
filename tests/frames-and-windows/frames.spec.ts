import { test, expect } from '@playwright/test';

/**
 * Framesets, iframes (sandboxed, srcdoc, inside shadow DOM), the TinyMCE
 * editor iframe, and new browser windows.
 */

test.describe('Nested frames', () => {
  test('each frame in the nested frameset shows its label @smoke', async ({ page }) => {
    await page.goto('/nested_frames');
    const top = page.frameLocator('frame[name="frame-top"]');

    await expect(top.frameLocator('frame[name="frame-left"]').locator('body')).toHaveText('LEFT');
    await expect(top.frameLocator('frame[name="frame-middle"]').locator('#content')).toHaveText('MIDDLE');
    await expect(top.frameLocator('frame[name="frame-right"]').locator('body')).toHaveText('RIGHT');
    await expect(page.frameLocator('frame[name="frame-bottom"]').locator('body')).toHaveText('BOTTOM');
  });

  test('frames index links to both frame examples', async ({ page }) => {
    await page.goto('/frames');
    await expect(page.getByRole('link', { name: 'Nested Frames' })).toHaveAttribute('href', '/nested_frames');
    await expect(page.getByRole('link', { name: 'iFrame' })).toHaveAttribute('href', '/iframe');
  });
});

test.describe('WYSIWYG editor in an iframe', () => {
  for (const path of ['/iframe', '/tinymce']) {
    test(`user replaces and formats the editor content on ${path}`, async ({ page }) => {
      await page.goto(path);
      const editor = page.frameLocator('#mce_0_ifr').locator('body#tinymce');
      await expect(editor).toHaveText('Your content goes here.');

      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('Quarterly report');
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.press('ControlOrMeta+B');

      await expect(editor).toHaveText('Quarterly report');
      await expect(editor.locator('strong')).toHaveText('Quarterly report');
    });
  }
});

test.describe('Advanced iframes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/iframes_advanced');
  });

  test('sandboxed frame is isolated from the page but can post messages to it', async ({ page }) => {
    await expect(page.locator('#parent-access')).toHaveText("The page can't read the sandboxed frame");

    // Playwright drives the frame even though the page itself can't read it.
    const sandboxed = page.frameLocator('#sandboxed-frame');
    await sandboxed.getByRole('button', { name: 'Send a message to the page' }).click();

    await expect(sandboxed.getByRole('button')).toHaveText('Message sent');
    await expect(page.locator('#message-log')).toHaveText('Message from the sandboxed frame: hello');
  });

  test('srcdoc frame content can be read and typed into', async ({ page }) => {
    const frame = page.frameLocator('#srcdoc-frame');

    await expect(frame.locator('#srcdoc-text')).toHaveText('Hello from srcdoc');
    await frame.getByPlaceholder('Type here').fill('inline frame input');
    await expect(frame.getByPlaceholder('Type here')).toHaveValue('inline frame input');
  });

  test('iframe nested inside a shadow root is reachable', async ({ page }) => {
    // Playwright's CSS engine pierces open shadow roots, so no special handling is needed.
    const frame = page.frameLocator('#shadow-frame');
    await expect(frame.locator('#frame-title')).toHaveText('Frame: shadow');
  });
});

test.describe('Multiple windows', () => {
  test('link opens the content in a new window and the original stays open @smoke', async ({ page, context }) => {
    await page.goto('/windows');

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('link', { name: 'Click Here' }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState();

    await expect(popup).toHaveTitle('New Window');
    await expect(popup.getByRole('heading', { name: 'New Window' })).toBeVisible();
    expect(context.pages()).toHaveLength(2);
    await expect(page.getByRole('heading', { name: 'Opening a new window' })).toBeVisible();

    await popup.close();
    expect(context.pages()).toHaveLength(1);
  });
});
