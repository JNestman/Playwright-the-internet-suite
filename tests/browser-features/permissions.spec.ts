import { test, expect } from '@playwright/test';

/**
 * Browser permission prompts are drawn by the browser, not the page, so they
 * can't be clicked. Tests grant or withhold permissions up front instead.
 * Permission names and fake media devices are Chromium-specific.
 */
test.skip(({ browserName }) => browserName !== 'chromium', 'Permission APIs used here are Chromium-specific');

// Full Chromium (not the lightweight headless shell, which has no media stack) plus a fake
// camera/microphone, so media tests run on machines and CI runners without hardware.
test.use({ channel: 'chromium', launchOptions: { args: ['--use-fake-device-for-media-stream'] } });

test.describe('with permissions granted', () => {
  test.use({
    permissions: ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write'],
  });

  test('page reports every permission as granted', async ({ page }) => {
    await page.goto('/permissions');

    for (const name of ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read']) {
      await expect(page.locator(`#state-${name}`), name).toHaveText('granted');
    }
  });

  test('user copies text to the clipboard and pastes it back', async ({ page }) => {
    await page.goto('/permissions');
    await page.getByLabel('Text to copy').fill('Order #A-1001');

    await page.getByRole('button', { name: 'Copy' }).click();
    await expect(page.locator('#clipboard-result')).toHaveText('Copied: Order #A-1001');

    await page.getByRole('button', { name: 'Paste' }).click();
    await expect(page.locator('#clipboard-result')).toHaveText('Pasted: Order #A-1001');
  });

  test('user turns the camera on and off', async ({ page }) => {
    await page.goto('/permissions');

    await page.getByRole('button', { name: 'Turn on the camera' }).click();
    await expect(page.locator('#camera-result')).toHaveText(/^Camera on: /);
    await expect
      .poll(() => page.locator('#camera-video').evaluate((v: HTMLVideoElement) => v.videoWidth))
      .toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Turn it off' }).click();
    await expect(page.locator('#camera-result')).toHaveText('Camera off');
  });

  test('notifications are allowed when the user has granted them', async ({ page }) => {
    await page.goto('/permissions');
    await page.getByRole('button', { name: 'Ask to show notifications' }).click();

    await expect(page.locator('#notifications-result')).toHaveText('Notifications: granted');
  });
});

test.describe('with no permissions granted', () => {
  test('page shows permissions as not yet granted', async ({ page }) => {
    await page.goto('/permissions');

    for (const name of ['geolocation', 'camera', 'clipboard-read']) {
      await expect(page.locator(`#state-${name}`), name).not.toHaveText(/granted|checking/);
    }
  });
});
